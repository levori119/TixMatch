import "server-only";
import { and, eq, gt, asc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  listings,
  listingPriceTiers,
  shows,
  events,
  venues,
  users,
} from "./schema";

/** Shows that currently have at least one active listing with tickets available. */
export function listOpenShows() {
  return db
    .select({
      id: shows.id,
      eventName: events.name,
      venueName: venues.name,
      city: venues.city,
      startsAt: shows.startsAt,
      status: shows.status,
      fromPriceAgorot: sql<number>`min(${listingPriceTiers.unitPriceAgorot})`,
      available: sql<number>`sum(${listings.quantityAvailable})`,
      listingCount: sql<number>`count(distinct ${listings.id})`,
    })
    .from(shows)
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .innerJoin(
      listings,
      and(
        eq(listings.showId, shows.id),
        eq(listings.status, "active"),
        gt(listings.quantityAvailable, 0),
      ),
    )
    .leftJoin(
      listingPriceTiers,
      and(
        eq(listingPriceTiers.listingId, listings.id),
        eq(listingPriceTiers.minQty, 1),
      ),
    )
    .groupBy(shows.id, events.name, venues.name, venues.city, shows.startsAt, shows.status)
    .orderBy(asc(shows.startsAt));
}

/** All upcoming shows (catalog), with optional from-price + availability. */
export function listUpcomingShows() {
  return db
    .select({
      id: shows.id,
      eventId: events.id,
      eventName: events.name,
      artist: events.artist,
      venueName: venues.name,
      city: venues.city,
      startsAt: shows.startsAt,
      status: shows.status,
      fromPriceAgorot: sql<number | null>`min(${listingPriceTiers.unitPriceAgorot})`,
      available: sql<number>`coalesce(sum(${listings.quantityAvailable}), 0)`,
    })
    .from(shows)
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(
      listings,
      and(
        eq(listings.showId, shows.id),
        eq(listings.status, "active"),
        gt(listings.quantityAvailable, 0),
      ),
    )
    .leftJoin(
      listingPriceTiers,
      and(eq(listingPriceTiers.listingId, listings.id), eq(listingPriceTiers.minQty, 1)),
    )
    .where(gt(shows.startsAt, sql`now() - interval '6 hours'`))
    .groupBy(shows.id, events.id, events.name, events.artist, venues.name, venues.city, shows.startsAt, shows.status)
    .orderBy(asc(shows.startsAt));
}

export async function getShow(showId: number) {
  const rows = await db
    .select({
      id: shows.id,
      eventId: events.id,
      eventName: events.name,
      artist: events.artist,
      venueName: venues.name,
      city: venues.city,
      address: venues.address,
      startsAt: shows.startsAt,
      status: shows.status,
    })
    .from(shows)
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId));
  return rows[0] ?? null;
}

export type ActiveListing = {
  id: number;
  sellerName: string;
  note: string | null;
  priceType: string;
  deliveryType: string;
  quantityAvailable: number;
  soldIndividually: boolean;
  minTicketsPerSale: number;
  basePriceAgorot: number | null;
  tiers: { minQty: number; unitPriceAgorot: number }[];
};

export async function getActiveListingsForShow(showId: number): Promise<ActiveListing[]> {
  const rows = await db
    .select({
      id: listings.id,
      sellerName: users.displayName,
      note: listings.note,
      priceType: listings.priceType,
      deliveryType: listings.deliveryType,
      quantityAvailable: listings.quantityAvailable,
      soldIndividually: listings.soldIndividually,
      minTicketsPerSale: listings.minTicketsPerSale,
      basePriceAgorot: listingPriceTiers.unitPriceAgorot,
    })
    .from(listings)
    .innerJoin(users, eq(listings.sellerId, users.id))
    .leftJoin(
      listingPriceTiers,
      and(
        eq(listingPriceTiers.listingId, listings.id),
        eq(listingPriceTiers.minQty, 1),
      ),
    )
    .where(
      and(
        eq(listings.showId, showId),
        eq(listings.status, "active"),
        gt(listings.quantityAvailable, 0),
      ),
    );

  if (rows.length === 0) return [];

  // fetch all tiers for these listings in one query
  const ids = rows.map((r) => r.id);
  const tiers = await db
    .select()
    .from(listingPriceTiers)
    .where(
      sql`${listingPriceTiers.listingId} in (${sql.join(ids, sql`, `)})`,
    );

  const byListing = new Map<number, { minQty: number; unitPriceAgorot: number }[]>();
  for (const t of tiers) {
    const arr = byListing.get(t.listingId) ?? [];
    arr.push({ minQty: t.minQty, unitPriceAgorot: t.unitPriceAgorot });
    byListing.set(t.listingId, arr);
  }

  return rows.map((r) => ({
    ...r,
    tiers: (byListing.get(r.id) ?? []).sort((a, b) => a.minQty - b.minQty),
  }));
}
