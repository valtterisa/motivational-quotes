import { Kafka, type EachBatchPayload } from "kafkajs";
import { db } from "../db/drizzle";
import { quoteLikes, savedQuotes } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { loadEnv } from "../config/env";

const env = loadEnv();

async function waitForTopics(
  kafka: Kafka,
  topics: string[],
  maxRetries = 30,
  delayMs = 2000,
): Promise<void> {
  const admin = kafka.admin();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await admin.connect();
      const topicList = await admin.listTopics();
      const allTopicsAvailable = topics.every((topic) =>
        topicList.includes(topic),
      );

      if (allTopicsAvailable) {
        await admin.disconnect();
        return;
      }
      await admin.disconnect();
    } catch (err) {
      try {
        await admin.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      if (i === maxRetries - 1) {
        throw new Error(
          `Failed to connect to Kafka or topics ${topics.join(", ")} not available after ${maxRetries} retries: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Topics ${topics.join(", ")} not available after ${maxRetries} retries`,
  );
}

async function run(): Promise<void> {
  if (!env.KAFKA_BROKERS) {
    console.warn("KAFKA_BROKERS not set; feed-events-consumer exiting");
    process.exit(0);
  }

  const brokers = env.KAFKA_BROKERS.split(",").map((b) => b.trim());
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
  console.log("Waiting for topics to be available...");
  await waitForTopics(kafka, topics);
  console.log("Topics are now available, connecting consumer...");

  const consumer = kafka.consumer({ groupId: "feed-events-consumer" });
  await consumer.connect();
  console.log("Consumer connected, subscribing to topics...");
  await consumer.subscribe({
    topics,
    fromBeginning: false,
  });
  console.log("Consumer subscribed successfully, starting to process messages...");

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
      console.error(`Feed consumer failed (attempt ${retryCount}/${maxRetries}):`, err);
      
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
