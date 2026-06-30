import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./index";
import { userGenreAffinity, eventGenres, shows, genres } from "./schema";

/**
 * Record a taste signal: bump the user's affinity for every genre of the
 * given show's event. weight: view=1, request=3, purchase=5.
 */
export async function recordShowSignal(userId: number, showId: number, weight: number) {
  const evRows = await db
    .select({ genreId: eventGenres.genreId })
    .from(shows)
    .innerJoin(eventGenres, eq(eventGenres.eventId, shows.eventId))
    .where(eq(shows.id, showId));
  if (evRows.length === 0) return;

  for (const { genreId } of evRows) {
    await db
      .insert(userGenreAffinity)
      .values({ userId, genreId, score: weight })
      .onConflictDoUpdate({
        target: [userGenreAffinity.userId, userGenreAffinity.genreId],
        set: { score: sql`${userGenreAffinity.score} + ${weight}`, updatedAt: new Date() },
      });
  }
}

/** Map of genreId -> score for a user. */
export async function getAffinityMap(userId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({ genreId: userGenreAffinity.genreId, score: userGenreAffinity.score })
    .from(userGenreAffinity)
    .where(eq(userGenreAffinity.userId, userId));
  return new Map(rows.map((r) => [r.genreId, r.score]));
}

/** The user's favourite genres (for display), highest score first. */
export async function topGenres(userId: number, limit = 3) {
  return db
    .select({
      slug: genres.slug,
      nameHe: genres.nameHe,
      emoji: genres.emoji,
      score: userGenreAffinity.score,
    })
    .from(userGenreAffinity)
    .innerJoin(genres, eq(userGenreAffinity.genreId, genres.id))
    .where(and(eq(userGenreAffinity.userId, userId), sql`${userGenreAffinity.score} > 0`))
    .orderBy(desc(userGenreAffinity.score))
    .limit(limit);
}
