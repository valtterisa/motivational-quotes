import { Kafka, type EachBatchPayload } from "kafkajs";
import { db } from "../db/drizzle";
import { quoteLikes, savedQuotes } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { loadEnv } from "../config/env";

const env = loadEnv();

async function ensureTopicsAndConnect(
  kafka: Kafka,
  topics: string[],
  maxRetries = 30,
  delayMs = 2000,
): Promise<void> {
  const admin = kafka.admin();
  for (let i = 0; i < maxRetries; i++) {
    try {
      await admin.connect();
      const existing = await admin.listTopics();
      const toCreate = topics.filter((t) => !existing.includes(t));
      if (toCreate.length > 0) {
        await admin.createTopics({
          topics: toCreate.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
          validateOnly: false,
        });
      }
      await admin.disconnect();
      return;
    } catch (err) {
      try {
        await admin.disconnect();
      } catch {
        // ignore
      }
      if (i === maxRetries - 1) {
        throw new Error(
          `Failed to connect to Kafka after ${maxRetries} retries: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

const DOCKER_KAFKA_BROKER = "kafka:9092";

function getBrokers(): string[] {
  const raw = process.env.KAFKA_BROKERS ?? env.KAFKA_BROKERS ?? "";
  const list = raw
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  if (list.length === 0) return [];
  if (list.every((b) => b.startsWith("localhost:"))) {
    return [DOCKER_KAFKA_BROKER];
  }
  return list;
}

async function run(): Promise<void> {
  const brokers = getBrokers();
  if (brokers.length === 0) {
    console.warn("KAFKA_BROKERS not set; feed-events-consumer exiting");
    process.exit(0);
  }

  console.log(`Connecting to Kafka brokers: ${brokers.join(", ")}`);

  const kafka = new Kafka({
    clientId: "feed-events-consumer",
    brokers,
    retry: {
      retries: 10,
      initialRetryTime: 100,
      multiplier: 2,
      maxRetryTime: 30000,
    },
  });

  const topics = ["quote-likes", "quote-saves"];
  console.log("Ensuring Kafka connection and topics exist...");
  await ensureTopicsAndConnect(kafka, topics);
  console.log("Kafka ready, waiting for group coordinator...");
  await new Promise((r) => setTimeout(r, 8000));

  const consumer = kafka.consumer({
    groupId: "feed-events-consumer",
    sessionTimeout: 30000,
    retry: { retries: 15, initialRetryTime: 1000, maxRetryTime: 10000 },
  });
  await consumer.connect();
  console.log("Consumer connected, subscribing to topics...");
  await consumer.subscribe({
    topics,
    fromBeginning: false,
  });
  console.log(
    "Consumer subscribed successfully, starting to process messages...",
  );

  await consumer.run({
    eachBatch: async ({
      batch,
      commitOffsetsIfNecessary,
    }: EachBatchPayload) => {
      const likesMap = new Map<string, "like" | "unlike">();
      const savesMap = new Map<string, "save" | "unsave">();

      for (const message of batch.messages) {
        const key = message.key?.toString();
        const value = message.value?.toString();
        if (!key || !value) continue;
        try {
          const payload = JSON.parse(value) as {
            user_id?: string;
            quote_id?: string;
            action?: string;
          };
          const action = payload.action;
          if (
            batch.topic === "quote-likes" &&
            (action === "like" || action === "unlike")
          ) {
            likesMap.set(key, action);
          } else if (
            batch.topic === "quote-saves" &&
            (action === "save" || action === "unsave")
          ) {
            savesMap.set(key, action);
          }
        } catch {
          // skip invalid message
        }
      }

      try {
        if (batch.topic === "quote-likes") {
          for (const [key, action] of likesMap) {
            const [userId, quoteId] = key.split(":");
            if (action === "like") {
              await db
                .insert(quoteLikes)
                .values({ userId, quoteId })
                .onConflictDoNothing();
            } else {
              await db
                .delete(quoteLikes)
                .where(
                  and(
                    eq(quoteLikes.userId, userId),
                    eq(quoteLikes.quoteId, quoteId),
                  ),
                );
            }
          }
        } else if (batch.topic === "quote-saves") {
          for (const [key, action] of savesMap) {
            const [userId, quoteId] = key.split(":");
            if (action === "save") {
              await db
                .insert(savedQuotes)
                .values({ userId, quoteId })
                .onConflictDoNothing();
            } else {
              await db
                .delete(savedQuotes)
                .where(
                  and(
                    eq(savedQuotes.userId, userId),
                    eq(savedQuotes.quoteId, quoteId),
                  ),
                );
            }
          }
        }
        await commitOffsetsIfNecessary();
      } catch (err) {
        console.error("Feed consumer batch error", err);
      }
    },
  });
}

async function runWithRetry(): Promise<void> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await run();
      break;
    } catch (err) {
      retryCount++;
      console.error(
        `Feed consumer failed (attempt ${retryCount}/${maxRetries}):`,
        err,
      );

      if (retryCount >= maxRetries) {
        console.error("Feed consumer failed after all retries, exiting");
        process.exit(1);
      }

      const delayMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

runWithRetry().catch((err) => {
  console.error("Feed consumer failed", err);
  process.exit(1);
});
