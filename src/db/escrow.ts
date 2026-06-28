import "server-only";
import { eq, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  trades,
  matches,
  listings,
  buyRequests,
  ledgerEntries,
  auditLog,
  events,
  venues,
  shows,
  users,
  platformSettings,
} from "./schema";
import { paymentProvider } from "./payment-provider";
import { hasVerifiedCard } from "./payments";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Entry = {
  account: "buyer" | "seller" | "platform" | "escrow";
  direction: "debit" | "credit";
  amount: number;
  memo?: string;
};

/** Insert balanced double-entry rows; throws if debits != credits. */
async function postLedger(tx: Tx, tradeId: number, entries: Entry[]) {
  const debit = entries.filter((e) => e.direction === "debit").reduce((s, e) => s + e.amount, 0);
  const credit = entries.filter((e) => e.direction === "credit").reduce((s, e) => s + e.amount, 0);
  if (debit !== credit) {
    throw new Error(`ledger not balanced for trade ${tradeId}: debit ${debit} != credit ${credit}`);
  }
  await tx.insert(ledgerEntries).values(
    entries.map((e) => ({
      tradeId,
      account: e.account,
      direction: e.direction,
      amountAgorot: e.amount,
      memo: e.memo,
    })),
  );
}

async function audit(tx: Tx, actorId: number, action: string, tradeId: number, payload: unknown) {
  await tx.insert(auditLog).values({
    actorId,
    action,
    entity: "trade",
    entityId: String(tradeId),
    payload: payload as object,
  });
}

function computeCommission(amount: number, bps: number, fixed: number) {
  return Math.round((amount * bps) / 10000) + fixed;
}

export class EscrowError extends Error {}

/** Buyer funds escrow: offer_accepted -> funds_held (places a hold). */
export async function payForTrade(tradeId: number, actorId: number) {
  if (!(await hasVerifiedCard(actorId))) {
    throw new EscrowError("יש להוסיף ולאמת כרטיס אשראי לפני תשלום.");
  }
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!t) throw new EscrowError("עסקה לא נמצאה.");
    if (t.buyerId !== actorId) throw new EscrowError("רק הקונה יכול לשלם על עסקה זו.");
    if (t.state !== "offer_accepted") throw new EscrowError("העסקה אינה במצב הממתין לתשלום.");

    const hold = await paymentProvider.authorizeHold(t.amountAgorot, `trade_${tradeId}`);

    await tx
      .update(trades)
      .set({ state: "funds_held", stateChangedAt: new Date() })
      .where(eq(trades.id, tradeId));

    // money moves into escrow
    await postLedger(tx, tradeId, [
      { account: "escrow", direction: "debit", amount: t.amountAgorot, memo: "hold" },
      { account: "buyer", direction: "credit", amount: t.amountAgorot, memo: "buyer paid" },
    ]);
    await audit(tx, actorId, "escrow_pay", tradeId, { holdId: hold.holdId, amount: t.amountAgorot });
  });
}

/** Seller delivers the ticket: funds_held -> ticket_delivered. */
export async function deliverTrade(tradeId: number, actorId: number) {
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!t) throw new EscrowError("עסקה לא נמצאה.");
    if (t.sellerId !== actorId) throw new EscrowError("רק המוכר יכול למסור את הכרטיס.");
    if (t.state !== "funds_held") throw new EscrowError("העסקה אינה במצב המתאים למסירה.");

    await tx
      .update(trades)
      .set({ state: "ticket_delivered", stateChangedAt: new Date() })
      .where(eq(trades.id, tradeId));
    await audit(tx, actorId, "escrow_deliver", tradeId, {});
  });
}

/** Buyer confirms receipt -> released: capture + pay out seller minus commission. */
export async function confirmTrade(tradeId: number, actorId: number) {
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!t) throw new EscrowError("עסקה לא נמצאה.");
    if (t.buyerId !== actorId) throw new EscrowError("רק הקונה יכול לאשר קבלה.");
    if (t.state !== "ticket_delivered") throw new EscrowError("יש להמתין למסירת הכרטיס לפני אישור.");

    const [settings] = await tx.select().from(platformSettings).where(eq(platformSettings.id, 1));
    const commission = computeCommission(
      t.amountAgorot,
      settings?.commissionBps ?? 0,
      settings?.commissionFixedAgorot ?? 0,
    );
    const sellerNet = t.amountAgorot - commission;

    await paymentProvider.capture(`trade_${tradeId}`);

    await tx
      .update(trades)
      .set({ state: "released", commissionAgorot: commission, stateChangedAt: new Date() })
      .where(eq(trades.id, tradeId));

    // escrow releases full amount; seller gets net, platform gets commission
    await postLedger(tx, tradeId, [
      { account: "escrow", direction: "credit", amount: t.amountAgorot, memo: "release" },
      { account: "seller", direction: "debit", amount: sellerNet, memo: "payout" },
      { account: "platform", direction: "debit", amount: commission, memo: "commission" },
    ]);

    // close out the related match + buy request
    const [m] = await tx.select().from(matches).where(eq(matches.id, t.matchId));
    if (m) {
      await tx.update(matches).set({ status: "completed" }).where(eq(matches.id, m.id));
      await tx
        .update(buyRequests)
        .set({ status: "fulfilled" })
        .where(eq(buyRequests.id, m.buyRequestId));
    }
    await audit(tx, actorId, "escrow_release", tradeId, { commission, sellerNet });
  });
}

/** Refund/cancel: returns held funds (if any), restores inventory. */
export async function refundTrade(tradeId: number, actorId: number) {
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!t) throw new EscrowError("עסקה לא נמצאה.");
    if (!["offer_accepted", "funds_held", "ticket_delivered"].includes(t.state)) {
      throw new EscrowError("לא ניתן לבטל עסקה במצב הנוכחי.");
    }

    if (t.state !== "offer_accepted") {
      await paymentProvider.refund(`trade_${tradeId}`);
      await postLedger(tx, tradeId, [
        { account: "escrow", direction: "credit", amount: t.amountAgorot, memo: "refund" },
        { account: "buyer", direction: "debit", amount: t.amountAgorot, memo: "buyer refunded" },
      ]);
    }

    // restore inventory to the listing
    const [m] = await tx.select().from(matches).where(eq(matches.id, t.matchId));
    if (m) {
      await tx
        .update(listings)
        .set({
          quantityAvailable: sql`${listings.quantityAvailable} + ${m.qty}`,
          status: "active",
          version: sql`${listings.version} + 1`,
        })
        .where(eq(listings.id, m.listingId));
      await tx.update(matches).set({ status: "cancelled" }).where(eq(matches.id, m.id));
      await tx.update(buyRequests).set({ status: "cancelled" }).where(eq(buyRequests.id, m.buyRequestId));
    }

    await tx
      .update(trades)
      .set({ state: "refunded", stateChangedAt: new Date() })
      .where(eq(trades.id, tradeId));
    await audit(tx, actorId, "escrow_refund", tradeId, { amount: t.amountAgorot });
  });
}

// ---------- views ----------
const buyerU = alias(users, "buyer");
const sellerU = alias(users, "seller");

function tradesBase() {
  return db
    .select({
      id: trades.id,
      state: trades.state,
      amountAgorot: trades.amountAgorot,
      commissionAgorot: trades.commissionAgorot,
      buyerId: trades.buyerId,
      sellerId: trades.sellerId,
      buyerName: buyerU.displayName,
      sellerName: sellerU.displayName,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
    })
    .from(trades)
    .innerJoin(matches, eq(trades.matchId, matches.id))
    .innerJoin(listings, eq(matches.listingId, listings.id))
    .innerJoin(shows, eq(listings.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .innerJoin(buyerU, eq(buyerU.id, trades.buyerId))
    .innerJoin(sellerU, eq(sellerU.id, trades.sellerId));
}

export function listAllTrades() {
  return tradesBase().orderBy(desc(trades.id));
}

export function listTradesForBuyer(buyerId: number) {
  return tradesBase().where(eq(trades.buyerId, buyerId)).orderBy(desc(trades.id));
}

export function listTradesForSeller(sellerId: number) {
  return tradesBase().where(eq(trades.sellerId, sellerId)).orderBy(desc(trades.id));
}

/** Sum of ledger entries by direction for a trade (for verification/QA). */
export async function ledgerBalance(tradeId: number) {
  const rows = await db
    .select({
      direction: ledgerEntries.direction,
      total: sql<number>`sum(${ledgerEntries.amountAgorot})`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.tradeId, tradeId))
    .groupBy(ledgerEntries.direction);
  const debit = Number(rows.find((r) => r.direction === "debit")?.total ?? 0);
  const credit = Number(rows.find((r) => r.direction === "credit")?.total ?? 0);
  return { debit, credit, balanced: debit === credit };
}
