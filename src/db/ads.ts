import "server-only";
import { and, asc, eq, isNull, lte, gte, or, desc } from "drizzle-orm";
import { db } from "./index";
import { ads } from "./schema";

export type AdRow = typeof ads.$inferSelect;

export type NewAd = {
  title: string;
  subtitle?: string | null;
  emoji?: string | null;
  colorFrom: string;
  colorTo: string;
  cta?: string | null;
  href: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  sortOrder?: number;
};

/** Ads currently live: active and inside their schedule window. */
export async function listActiveAds(): Promise<AdRow[]> {
  const now = new Date();
  return db
    .select()
    .from(ads)
    .where(
      and(
        eq(ads.active, true),
        or(isNull(ads.startsAt), lte(ads.startsAt, now)),
        or(isNull(ads.endsAt), gte(ads.endsAt, now)),
      ),
    )
    .orderBy(asc(ads.sortOrder), asc(ads.id));
}

export function listAllAds() {
  return db.select().from(ads).orderBy(asc(ads.sortOrder), desc(ads.id));
}

export async function createAd(input: NewAd) {
  const [row] = await db
    .insert(ads)
    .values({
      title: input.title,
      subtitle: input.subtitle ?? null,
      emoji: input.emoji ?? null,
      colorFrom: input.colorFrom,
      colorTo: input.colorTo,
      cta: input.cta ?? null,
      href: input.href,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function toggleAd(id: number, active: boolean) {
  await db.update(ads).set({ active }).where(eq(ads.id, id));
}

export async function deleteAd(id: number) {
  await db.delete(ads).where(eq(ads.id, id));
}
