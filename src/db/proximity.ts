import "server-only";
import { and, eq, or, gt, sql } from "drizzle-orm";
import { db } from "./index";
import { locations, users, friendships } from "./schema";

const FRESH_MS = 30 * 60 * 1000; // consider a location "live" for 30 minutes
const RADIUS_M = 1000; // 1 km

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function updateLocation(userId: number, showId: number, lat: number, lng: number) {
  await db
    .insert(locations)
    .values({ userId, showId, lat, lng, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [locations.userId, locations.showId],
      set: { lat, lng, updatedAt: new Date() },
    });
}

export async function clearLocation(userId: number, showId: number) {
  await db.delete(locations).where(and(eq(locations.userId, userId), eq(locations.showId, showId)));
}

export type Nearby = {
  sharing: boolean;
  friends: { name: string; meters: number }[];
  othersCount: number;
};

/**
 * Who is within 1km of me for this show — only among users who ALSO shared their
 * location for this event (mutual opt-in). Friends are named; other app users are
 * an anonymous count. Opted-out users never appear. Only live (<30min) locations.
 */
export async function nearby(userId: number, showId: number): Promise<Nearby> {
  const [mine] = await db
    .select({ lat: locations.lat, lng: locations.lng, updatedAt: locations.updatedAt })
    .from(locations)
    .where(and(eq(locations.userId, userId), eq(locations.showId, showId)));
  if (!mine || Date.now() - new Date(mine.updatedAt).getTime() >= FRESH_MS) {
    return { sharing: false, friends: [], othersCount: 0 };
  }

  const since = new Date(Date.now() - FRESH_MS);
  const rows = await db
    .select({
      uid: locations.userId,
      lat: locations.lat,
      lng: locations.lng,
      name: users.displayName,
      optout: users.friendmatchOptout,
    })
    .from(locations)
    .innerJoin(users, eq(locations.userId, users.id))
    .where(and(eq(locations.showId, showId), gt(locations.updatedAt, since)));

  const fr = await db
    .select({ uid: friendships.userId, fid: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.status, "accepted"), or(eq(friendships.userId, userId), eq(friendships.friendId, userId))));
  const friendSet = new Set(fr.map((r) => (r.uid === userId ? r.fid : r.uid)));

  const friends: { name: string; meters: number }[] = [];
  let others = 0;
  for (const r of rows) {
    if (r.uid === userId || r.optout) continue;
    const d = haversineMeters(mine.lat, mine.lng, r.lat, r.lng);
    if (d > RADIUS_M) continue;
    if (friendSet.has(r.uid)) friends.push({ name: r.name, meters: Math.round(d) });
    else others++;
  }
  friends.sort((a, b) => a.meters - b.meters);
  return { sharing: true, friends, othersCount: others };
}
