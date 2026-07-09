import "server-only";
import { and, eq, or, gt, asc, inArray, sql } from "drizzle-orm";
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

export type AddFriendResult = {
  status: "requested" | "accepted" | "already" | "requested_already" | "invalid" | "notfound" | "self";
  name?: string;
};

/**
 * Send a friend request by phone (mutual consent). If the other person already
 * requested you, this accepts it. You only become friends once both sides agree.
 */
export async function addFriendByPhone(userId: number, phone: string): Promise<AddFriendResult> {
  const p = normalizePhone(phone);
  if (p.length < 9) return { status: "invalid" };

  const candidates = await db
    .select({ id: users.id, name: users.displayName, phone: users.phone })
    .from(users)
    .where(sql`${users.phone} is not null`);
  const target = candidates.find((c) => normalizePhone(c.phone ?? "") === p);
  if (!target) return { status: "notfound" };
  if (target.id === userId) return { status: "self" };

  // already accepted either direction?
  const [acc] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, target.id)),
          and(eq(friendships.userId, target.id), eq(friendships.friendId, userId)),
        ),
      ),
    );
  if (acc) return { status: "already", name: target.name };

  // reverse pending (they already requested me) -> accept it
  const [rev] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(eq(friendships.userId, target.id), eq(friendships.friendId, userId), eq(friendships.status, "pending")));
  if (rev) {
    await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, rev.id));
    return { status: "accepted", name: target.name };
  }

  // my pending already sent?
  const [mine] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, target.id), eq(friendships.status, "pending")));
  if (mine) return { status: "requested_already", name: target.name };

  await db.insert(friendships).values({ userId, friendId: target.id, status: "pending" });
  return { status: "requested", name: target.name };
}

/** Accept an incoming request (from requesterId to me). */
export async function acceptRequest(userId: number, requesterId: number) {
  await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(and(eq(friendships.userId, requesterId), eq(friendships.friendId, userId), eq(friendships.status, "pending")));
}

/** Decline an incoming request, or cancel one I sent, or remove a friend (both directions). */
export async function removeFriendship(userId: number, otherId: number) {
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, otherId)),
        and(eq(friendships.userId, otherId), eq(friendships.friendId, userId)),
      ),
    );
}

/** Accepted friends (both directions). */
export async function listFriends(userId: number) {
  const rows = await db
    .select({ uid: friendships.userId, fid: friendships.friendId, uName: sql<string>`ru.display_name`, fName: sql<string>`au.display_name` })
    .from(friendships)
    .innerJoin(sql`${users} as ru`, sql`ru.id = ${friendships.userId}`)
    .innerJoin(sql`${users} as au`, sql`au.id = ${friendships.friendId}`)
    .where(and(eq(friendships.status, "accepted"), or(eq(friendships.userId, userId), eq(friendships.friendId, userId))));
  return rows.map((r) => (r.uid === userId ? { id: r.fid, name: r.fName } : { id: r.uid, name: r.uName }));
}

/** Requests waiting for me to accept. */
export function incomingRequests(userId: number) {
  return db
    .select({ id: users.id, name: users.displayName })
    .from(friendships)
    .innerJoin(users, eq(friendships.userId, users.id))
    .where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")))
    .orderBy(asc(users.displayName));
}

/** Requests I sent, still pending. */
export function outgoingRequests(userId: number) {
  return db
    .select({ id: users.id, name: users.displayName })
    .from(friendships)
    .innerJoin(users, eq(friendships.friendId, users.id))
    .where(and(eq(friendships.userId, userId), eq(friendships.status, "pending")))
    .orderBy(asc(users.displayName));
}

/** Accepted friend ids (both directions). */
async function friendIdList(userId: number): Promise<number[]> {
  const rows = await db
    .select({ uid: friendships.userId, fid: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.status, "accepted"), or(eq(friendships.userId, userId), eq(friendships.friendId, userId))));
  return rows.map((r) => (r.uid === userId ? r.fid : r.uid));
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

// ---------- privacy ----------
export async function getOptOut(userId: number): Promise<boolean> {
  const [u] = await db.select({ o: users.friendmatchOptout }).from(users).where(eq(users.id, userId));
  return !!u?.o;
}
export async function setOptOut(userId: number, optOut: boolean) {
  await db.update(users).set({ friendmatchOptout: optOut }).where(eq(users.id, userId));
}

/** My (accepted) friends who are attending a given show — excluding opted-out. */
export async function friendsAttending(userId: number, showId: number) {
  const ids = await friendIdList(userId);
  if (ids.length === 0) return [] as { id: number; name: string }[];
  return db
    .select({ id: users.id, name: users.displayName })
    .from(attendances)
    .innerJoin(users, eq(attendances.userId, users.id))
    .where(
      and(
        eq(attendances.showId, showId),
        inArray(attendances.userId, ids),
        eq(users.friendmatchOptout, false),
      ),
    )
    .orderBy(asc(users.displayName));
}

/** Count of my (accepted, non-opted-out) friends attending each of the given shows. */
export async function friendsAttendingCountByShow(
  userId: number,
  showIds: number[],
): Promise<Map<number, number>> {
  if (showIds.length === 0) return new Map();
  const ids = await friendIdList(userId);
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ showId: attendances.showId, n: sql<number>`count(*)` })
    .from(attendances)
    .innerJoin(users, eq(attendances.userId, users.id))
    .where(
      and(
        inArray(attendances.showId, showIds),
        inArray(attendances.userId, ids),
        eq(users.friendmatchOptout, false),
      ),
    )
    .groupBy(attendances.showId);
  return new Map(rows.map((r) => [r.showId, Number(r.n)]));
}

/** Upcoming shows my (accepted) friends are attending — excluding opted-out. */
export async function friendsUpcoming(userId: number) {
  const ids = await friendIdList(userId);
  if (ids.length === 0)
    return [] as { showId: number; eventName: string; venueName: string; startsAt: Date; friendName: string }[];
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
    .where(and(inArray(attendances.userId, ids), eq(users.friendmatchOptout, false), gt(shows.startsAt, sql`now()`)))
    .orderBy(asc(shows.startsAt));
}
