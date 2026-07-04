import "server-only";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { cookies } from "next/headers";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const SESSION_COOKIE = "tixmatch_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// ---------- password hashing (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const key = Buffer.from(keyHex, "hex");
  const candidate = scryptSync(password, salt, 64);
  return key.length === candidate.length && timingSafeEqual(key, candidate);
}

// ---------- signed session token (HMAC) ----------
type SessionPayload = { uid: number; role: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (set it in env).");
  }
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ---------- public API ----------
export async function createSession(uid: number, role: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encode({ uid, role, exp });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? decode(token) : null;
}

/** The currently logged-in user (full row minus hash), or null. */
export async function currentUser(): Promise<
  { id: number; role: string; displayName: string; email: string } | null
> {
  const session = await getSession();
  if (!session) return null;
  const rows = await db
    .select({
      id: users.id,
      role: users.role,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.uid));
  return rows[0] ?? null;
}

/** Create a new client account; throws on duplicate email. */
export async function registerClient(
  email: string,
  password: string,
  displayName: string,
): Promise<{ id: number; role: string }> {
  const [row] = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      displayName: displayName.trim(),
      role: "client",
    })
    .returning({ id: users.id, role: users.role });
  return row;
}

/** Authenticate by email OR display name (case-insensitive) + password. */
export async function authenticate(
  identifier: string,
  password: string,
): Promise<{ id: number; role: string; displayName: string } | null> {
  const id = identifier.trim();
  const rows = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email, id.toLowerCase()),
        sql`lower(${users.displayName}) = lower(${id})`,
      ),
    );
  const user = rows[0];
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, role: user.role, displayName: user.displayName };
}
