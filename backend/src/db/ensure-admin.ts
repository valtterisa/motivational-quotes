import { pool } from "./drizzle";

export async function ensureAdminByEmail(email: string): Promise<void> {
  const hasAdmin = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text FROM "user" WHERE role = 'admin'`,
  );
  const adminCount = Number(hasAdmin.rows[0]?.count ?? 0);
  if (adminCount > 0) {
    console.log("[ensure-admin] Skipping: an admin already exists.");
    return;
  }

  const res = await pool.query<{ id: string }>(
    `UPDATE "user" SET role = 'admin' WHERE email = $1 RETURNING id`,
    [email],
  );
  if (res.rowCount !== null && res.rowCount > 0) {
    console.log(`[ensure-admin] Promoted ${email} to admin (no admin existed).`);
  } else {
    console.log(
      `[ensure-admin] No user found with email "${email}". Sign up with this email, then restart the backend.`,
    );
  }
}
