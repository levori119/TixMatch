import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// Diagnostic endpoint — reports env/DB readiness WITHOUT exposing secret values.
export async function GET() {
  const secret = process.env.SESSION_SECRET ?? "";
  const sessionSecret = { present: secret.length > 0, longEnough: secret.length >= 16 };

  const databaseUrlPresent = !!process.env.DATABASE_URL;

  let db_ok = false;
  let db_error: string | null = null;
  try {
    await db.execute(sql`select 1`);
    db_ok = true;
  } catch (e) {
    db_ok = false;
    // expose only the error code/name, never the connection string
    db_error = (e as { code?: string; name?: string })?.code ?? (e as Error)?.name ?? "error";
  }

  return Response.json({
    ok: sessionSecret.longEnough && databaseUrlPresent && db_ok,
    nodeEnv: process.env.NODE_ENV ?? null,
    sessionSecret,
    databaseUrlPresent,
    db_ok,
    db_error,
  });
}
