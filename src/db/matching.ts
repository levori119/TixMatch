import "server-only";
import { and, eq, asc, gt, gte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  buyRequests,
  listings,
  listingPriceTiers,
  matches,
  trades,
  shows,
  events,
  venues,
  users,
} from "./schema";

export type NewBuyRequest = {
  buyerId: number;
  showId: number;
  priceMinAgorot: number;
  priceMaxAgorot: number;
  qtyMin: number;
  qtyMax: number;
};

export async function createBuyRequest(input: NewBuyRequest) {
  const [row] = await db.insert(buyRequests).values(input).returning();
  return row;
}

/** unit price that applies for a given quantity (highest tier whose minQty <= qty). */
function applicableUnitPrice(
  tiers: { minQty: number; unitPriceAgorot: number }[],
  qty: number,
): number | null {
  let price: number | null = null;
  for (const t of tiers) {
    if (t.minQty <= qty) price = t.unitPriceAgorot;
  }
  return price;
}

export type MatchResult = {
  buyRequestId: number;
  listingId: number;
  qty: number;
  unitPriceAgorot: number;
};

/**
 * FCFS matcher for one show. Serialized per-show via a Postgres advisory lock,
 * with an atomic conditional decrement (CAS on version + availability guard) so
 * two buyers can never claim the same ticket.
 */
export async function runMatcherForShow(showId: number): Promise<MatchResult[]> {
  return db.transaction(async (tx) => {
    // one matcher per show at a time -> FCFS fairness, no inter-run race
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${showId})`);

    const queued = await tx
      .select()
      .from(buyRequests)
      .where(and(eq(buyRequests.showId, showId), eq(buyRequests.status, "queued")))
      .orderBy(asc(buyRequests.seq));
    if (queued.length === 0) return [];

    // candidate listings (active, available) + their tiers
    const cands = await tx
      .select({
        id: listings.id,
        sellerId: listings.sellerId,
        available: listings.quantityAvailable,
        version: listings.version,
        soldIndividually: listings.soldIndividually,
        minTicketsPerSale: listings.minTicketsPerSale,
      })
      .from(listings)
      .where(
        and(
          eq(listings.showId, showId),
          eq(listings.status, "active"),
          gt(listings.quantityAvailable, 0),
        ),
      );

    const tierRows =
      cands.length > 0
        ? await tx
            .select()
            .from(listingPriceTiers)
            .where(
              sql`${listingPriceTiers.listingId} in (${sql.join(
                cands.map((c) => c.id),
                sql`, `,
              )})`,
            )
        : [];
    const tiersByListing = new Map<number, { minQty: number; unitPriceAgorot: number }[]>();
    for (const t of tierRows) {
      const arr = tiersByListing.get(t.listingId) ?? [];
      arr.push({ minQty: t.minQty, unitPriceAgorot: t.unitPriceAgorot });
      tiersByListing.set(t.listingId, arr.sort((a, b) => a.minQty - b.minQty));
    }

    // local mutable mirror of availability (we hold the advisory lock)
    const pool = cands.map((c) => ({ ...c }));
    const results: MatchResult[] = [];

    for (const req of queued) {
      let best:
        | { listing: (typeof pool)[number]; qty: number; unitPrice: number }
        | null = null;

      for (const l of pool) {
        if (l.available <= 0) continue;
        const qty = Math.min(req.qtyMax, l.available);
        if (qty < Math.max(req.qtyMin, l.minTicketsPerSale)) continue;
        const unit = applicableUnitPrice(tiersByListing.get(l.id) ?? [], qty);
        if (unit == null) continue;
        if (unit > req.priceMaxAgorot) continue; // cheaper-than-asked is allowed
        if (
          !best ||
          unit < best.unitPrice ||
          (unit === best.unitPrice && l.id < best.listing.id)
        ) {
          best = { listing: l, qty, unitPrice: unit };
        }
      }

      if (!best) continue; // stays queued (standby)

      // atomic conditional reserve
      const upd = await tx
        .update(listings)
        .set({
          quantityAvailable: sql`${listings.quantityAvailable} - ${best.qty}`,
          version: sql`${listings.version} + 1`,
          status: sql`case when ${listings.quantityAvailable} - ${best.qty} <= 0 then 'sold' else ${listings.status} end`,
        })
        .where(
          and(
            eq(listings.id, best.listing.id),
            eq(listings.version, best.listing.version),
            gte(listings.quantityAvailable, best.qty),
          ),
        )
        .returning({ available: listings.quantityAvailable, version: listings.version });

      if (upd.length === 0) continue; // lost a race (defensive; shouldn't happen under lock)

      best.listing.available = upd[0].available;
      best.listing.version = upd[0].version;

      const [match] = await tx
        .insert(matches)
        .values({
          buyRequestId: req.id,
          listingId: best.listing.id,
          qty: best.qty,
          agreedUnitPriceAgorot: best.unitPrice,
        })
        .returning();

      await tx.insert(trades).values({
        matchId: match.id,
        buyerId: req.buyerId,
        sellerId: best.listing.sellerId,
        amountAgorot: best.qty * best.unitPrice,
        state: "offer_accepted",
      });

      await tx
        .update(buyRequests)
        .set({ status: "matched" })
        .where(eq(buyRequests.id, req.id));

      results.push({
        buyRequestId: req.id,
        listingId: best.listing.id,
        qty: best.qty,
        unitPriceAgorot: best.unitPrice,
      });
    }

    return results;
  });
}

// ---------- admin views ----------
export function listBuyers() {
  return db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(eq(users.role, "client"))
    .orderBy(asc(users.displayName));
}

export function listBuyRequests() {
  return db
    .select({
      id: buyRequests.id,
      seq: buyRequests.seq,
      buyerName: users.displayName,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
      priceMinAgorot: buyRequests.priceMinAgorot,
      priceMaxAgorot: buyRequests.priceMaxAgorot,
      qtyMin: buyRequests.qtyMin,
      qtyMax: buyRequests.qtyMax,
      status: buyRequests.status,
      matchedQty: matches.qty,
      matchedUnitAgorot: matches.agreedUnitPriceAgorot,
    })
    .from(buyRequests)
    .innerJoin(users, eq(buyRequests.buyerId, users.id))
    .innerJoin(shows, eq(buyRequests.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(matches, eq(matches.buyRequestId, buyRequests.id))
    .orderBy(asc(buyRequests.seq));
}

export async function cancelBuyRequest(id: number) {
  await db
    .update(buyRequests)
    .set({ status: "cancelled" })
    .where(and(eq(buyRequests.id, id), eq(buyRequests.status, "queued")));
}
