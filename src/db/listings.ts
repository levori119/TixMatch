import "server-only";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./index";
import {
  listings,
  listingPriceTiers,
  shows,
  events,
  venues,
} from "./schema";

export type PriceType = "at_cost" | "above_cost" | "discount";
export type DeliveryType = "physical" | "digital";

export type SeatKind = "seated" | "standing" | null;

export type NewListing = {
  sellerId: number;
  showId: number;
  note?: string | null;
  priceType: PriceType;
  deliveryType: DeliveryType;
  quantityTotal: number;
  soldIndividually: boolean;
  minTicketsPerSale: number;
  seatKind?: SeatKind;
  seatSection?: string | null;
  seatRow?: string | null;
  seatNumber?: string | null;
};

export type Tier = { minQty: number; unitPriceAgorot: number };

/** Create a listing + its price tiers atomically. */
export async function createListing(input: NewListing, tiers: Tier[]) {
  return db.transaction(async (tx) => {
    const [listing] = await tx
      .insert(listings)
      .values({
        sellerId: input.sellerId,
        showId: input.showId,
        note: input.note ?? null,
        priceType: input.priceType,
        deliveryType: input.deliveryType,
        quantityTotal: input.quantityTotal,
        quantityAvailable: input.quantityTotal,
        soldIndividually: input.soldIndividually,
        minTicketsPerSale: input.minTicketsPerSale,
        seatKind: input.seatKind ?? null,
        seatSection: input.seatSection ?? null,
        seatRow: input.seatRow ?? null,
        seatNumber: input.seatNumber ?? null,
      })
      .returning();

    if (tiers.length > 0) {
      await tx.insert(listingPriceTiers).values(
        tiers.map((t) => ({
          listingId: listing.id,
          minQty: t.minQty,
          unitPriceAgorot: t.unitPriceAgorot,
        })),
      );
    }
    return listing;
  });
}

/** List listings with show/event/venue names and the qty-1 base price. */
export function listListings() {
  return db
    .select({
      id: listings.id,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
      priceType: listings.priceType,
      deliveryType: listings.deliveryType,
      quantityTotal: listings.quantityTotal,
      quantityAvailable: listings.quantityAvailable,
      soldIndividually: listings.soldIndividually,
      minTicketsPerSale: listings.minTicketsPerSale,
      status: listings.status,
      basePriceAgorot: listingPriceTiers.unitPriceAgorot,
    })
    .from(listings)
    .innerJoin(shows, eq(listings.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(
      listingPriceTiers,
      and(
        eq(listingPriceTiers.listingId, listings.id),
        eq(listingPriceTiers.minQty, 1),
      ),
    )
    .orderBy(desc(listings.createdAt));
}

/** Return all tiers for a listing, sorted by min quantity. */
export function listTiers(listingId: number) {
  return db
    .select()
    .from(listingPriceTiers)
    .where(eq(listingPriceTiers.listingId, listingId));
}

/** Listings owned by a given seller (with show info + base price). */
export function listListingsForSeller(sellerId: number) {
  return db
    .select({
      id: listings.id,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
      priceType: listings.priceType,
      deliveryType: listings.deliveryType,
      quantityTotal: listings.quantityTotal,
      quantityAvailable: listings.quantityAvailable,
      status: listings.status,
      basePriceAgorot: listingPriceTiers.unitPriceAgorot,
      seatKind: listings.seatKind,
      seatSection: listings.seatSection,
      seatRow: listings.seatRow,
      seatNumber: listings.seatNumber,
    })
    .from(listings)
    .innerJoin(shows, eq(listings.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(
      listingPriceTiers,
      and(eq(listingPriceTiers.listingId, listings.id), eq(listingPriceTiers.minQty, 1)),
    )
    .where(eq(listings.sellerId, sellerId))
    .orderBy(desc(listings.createdAt));
}

/** Seller cancels their own active listing (keeps history; removed from sale/matching). */
export async function cancelListing(id: number, sellerId: number) {
  await db
    .update(listings)
    .set({ status: "cancelled" })
    .where(
      and(eq(listings.id, id), eq(listings.sellerId, sellerId), eq(listings.status, "active")),
    );
}

export async function deleteListing(id: number) {
  await db.transaction(async (tx) => {
    await tx.delete(listingPriceTiers).where(eq(listingPriceTiers.listingId, id));
    await tx.delete(listings).where(eq(listings.id, id));
  });
}
