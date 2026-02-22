import { config } from "dotenv";
import { join } from "path";
import { Pool } from "pg";

const cwd = process.cwd();
config({ path: join(cwd, ".env") });
config({ path: join(cwd, "..", ".env") });

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL!!;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Set it in .env.");
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const res = await pool.query(
      `UPDATE "user" SET role = 'admin' WHERE email = $1 RETURNING id, email, role`,
      [email],
    );
    if (res.rowCount === 0) {
      console.warn(
        `No user found with email "${email}". Sign up first, then run this script again.`,
      );
      process.exit(1);
    }
    console.log(`Admin role assigned to ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
