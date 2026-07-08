import "server-only";
import { and, eq, gt, asc, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { users, attendances, friendships, shows, events, venues } from "./schema";

/** Canonical Israeli phone: digits only, +972 -> leading 0. */
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

export async function getMyPhone(userId: number): Promise<string | null> {
  const [u] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, userId));
  return u?.phone ?? null;
}

export async function setMyPhone(userId: number, phone: string): Promise<string> {
  const p = normalizePhone(phone);
  await db.update(users).set({ phone: p }).where(eq(users.id, userId));
  return p;
}

export type AddFriendResult =
  | { status: "ok"; name: string }
  | { status: "invalid" | "notfound" | "self" | "already" };

/** Add a friend by phone number (matches a TixMatch user with that phone). */
export async function addFriendByPhone(userId: number, phone: string): Promise<AddFriendResult> {
  const p = normalizePhone(phone);
  if (p.length < 9) return { status: "invalid" };

  // normalize in JS (existing phones may be stored in varied formats)
  const candidates = await db
    .select({ id: users.id, name: users.displayName, phone: users.phone })
    .from(users)
    .where(sql`${users.phone} is not null`);
  const target = candidates.find((c) => normalizePhone(c.phone ?? "") === p);
  if (!target) return { status: "notfound" };
  if (target.id === userId) return { status: "self" };

  const [existing] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, target.id)));
  if (existing) return { status: "already" };

  await db.insert(friendships).values({ userId, friendId: target.id });
  return { status: "ok", name: target.name };
}

export function listFriends(userId: number) {
  return db
    .select({ id: users.id, name: users.displayName })
    .from(friendships)
    .innerJoin(users, eq(friendships.friendId, users.id))
    .where(eq(friendships.userId, userId))
    .orderBy(asc(users.displayName));
}

export async function removeFriend(userId: number, friendId: number) {
  await db.delete(friendships).where(and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)));
}

// ---------- attendance ----------
export async function isAttending(userId: number, showId: number): Promise<boolean> {
  const [a] = await db
    .select({ id: attendances.id })
    .from(attendances)
    .where(and(eq(attendances.userId, userId), eq(attendances.showId, showId)));
  return !!a;
}

export async function setAttendance(userId: number, showId: number, going: boolean) {
  if (going) {
    await db
      .insert(attendances)
      .values({ userId, showId })
      .onConflictDoNothing({ target: [attendances.userId, attendances.showId] });
  } else {
    await db.delete(attendances).where(and(eq(attendances.userId, userId), eq(attendances.showId, showId)));
  }
}

const myFriendIds = (userId: number) =>
  db.select({ id: friendships.friendId }).from(friendships).where(eq(friendships.userId, userId));

/** My friends who are attending a given show. */
export async function friendsAttending(userId: number, showId: number) {
  return db
    .select({ id: users.id, name: users.displayName })
    .from(attendances)
    .innerJoin(users, eq(attendances.userId, users.id))
    .where(and(eq(attendances.showId, showId), inArray(attendances.userId, myFriendIds(userId))))
    .orderBy(asc(users.displayName));
}

/** Upcoming shows my friends are attending (for the FriendMatch page). */
export function friendsUpcoming(userId: number) {
  return db
    .select({
      showId: shows.id,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
      friendName: users.displayName,
    })
    .from(attendances)
    .innerJoin(users, eq(attendances.userId, users.id))
    .innerJoin(shows, eq(attendances.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(and(inArray(attendances.userId, myFriendIds(userId)), gt(shows.startsAt, sql`now()`)))
    .orderBy(asc(shows.startsAt));
}
