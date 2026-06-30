import "server-only";
import { inArray, eq, asc } from "drizzle-orm";
import { db } from "./index";
import { genres, eventGenres } from "./schema";

export type Genre = { id: number; slug: string; nameHe: string; emoji: string | null };

export function listGenres(): Promise<Genre[]> {
  return db
    .select({ id: genres.id, slug: genres.slug, nameHe: genres.nameHe, emoji: genres.emoji })
    .from(genres)
    .orderBy(asc(genres.id));
}

/** Map of eventId -> its genres. */
export async function genresForEventIds(eventIds: number[]): Promise<Map<number, Genre[]>> {
  const map = new Map<number, Genre[]>();
  if (eventIds.length === 0) return map;
  const rows = await db
    .select({
      eventId: eventGenres.eventId,
      id: genres.id,
      slug: genres.slug,
      nameHe: genres.nameHe,
      emoji: genres.emoji,
    })
    .from(eventGenres)
    .innerJoin(genres, eq(eventGenres.genreId, genres.id))
    .where(inArray(eventGenres.eventId, eventIds));
  for (const r of rows) {
    const arr = map.get(r.eventId) ?? [];
    arr.push({ id: r.id, slug: r.slug, nameHe: r.nameHe, emoji: r.emoji });
    map.set(r.eventId, arr);
  }
  return map;
}

export async function getEventGenreIds(eventId: number): Promise<number[]> {
  const rows = await db
    .select({ genreId: eventGenres.genreId })
    .from(eventGenres)
    .where(eq(eventGenres.eventId, eventId));
  return rows.map((r) => r.genreId);
}

/** Replace an event's genres with the given set. */
export async function setEventGenres(eventId: number, genreIds: number[]) {
  await db.transaction(async (tx) => {
    await tx.delete(eventGenres).where(eq(eventGenres.eventId, eventId));
    if (genreIds.length > 0) {
      await tx.insert(eventGenres).values(genreIds.map((genreId) => ({ eventId, genreId })));
    }
  });
}
