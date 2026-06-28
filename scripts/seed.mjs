// Seed the single platform_settings row with default commission.
// Run with: npm run db:seed  (uses --env-file=.env)
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await pool.query(
    `INSERT INTO platform_settings (id, commission_bps, commission_fixed_agorot, verification_hold_agorot)
     VALUES (1, 250, 0, 100)
     ON CONFLICT (id) DO NOTHING`,
  );
  const { rows } = await pool.query("SELECT * FROM platform_settings WHERE id = 1");
  console.log("platform_settings:", rows[0]);
  console.log("✓ seed complete (default commission 2.50%)");
} catch (e) {
  console.error("seed failed:", e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
