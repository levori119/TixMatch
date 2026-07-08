import "server-only";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { ticketFiles, listings, shows, events, venues, auditLog, trades, matches } from "./schema";
import { venueProvider, genBarcode } from "./venue-provider";
import { extractFromPdf, type Extracted } from "@/lib/ticket-extract";

export class TicketError extends Error {}

/** Seller uploads a ticket file (+ optional barcode) for one of their listings. */
export async function uploadTicketFile(input: {
  listingId: number;
  sellerId: number;
  fileName: string;
  mime: string;
  dataBase64: string;
  barcode?: string | null;
}) {
  // ownership check + current seat info
  const [own] = await db
    .select({
      id: listings.id,
      seatKind: listings.seatKind,
    })
    .from(listings)
    .where(and(eq(listings.id, input.listingId), eq(listings.sellerId, input.sellerId)));
  if (!own) throw new TicketError("הכרטיס לא שייך לך.");

  // best-effort auto-extract from PDF
  let extracted: Extracted = {};
  if (input.mime.includes("pdf")) {
    extracted = await extractFromPdf(Buffer.from(input.dataBase64, "base64"));
  }

  // fill listing seat info from the ticket if the seller left it blank
  if (!own.seatKind && (extracted.section || extracted.row || extracted.seat)) {
    await db
      .update(listings)
      .set({
        seatKind: "seated",
        seatSection: extracted.section ?? null,
        seatRow: extracted.row ?? null,
        seatNumber: extracted.seat ?? null,
      })
      .where(eq(listings.id, input.listingId));
  }

  const barcode = input.barcode?.trim() || extracted.barcode || genBarcode();
  await venueProvider.registerBarcode(barcode, `listing_${input.listingId}`);

  const [row] = await db
    .insert(ticketFiles)
    .values({
      listingId: input.listingId,
      fileName: input.fileName,
      mime: input.mime,
      dataBase64: input.dataBase64,
      barcode,
    })
    .returning({ id: ticketFiles.id, barcode: ticketFiles.barcode });

  await db.insert(auditLog).values({
    actorId: input.sellerId,
    action: "ticket_upload",
    entity: "listing",
    entityId: String(input.listingId),
    payload: { fileName: input.fileName, barcode, extracted },
  });
  return { ...row, extracted };
}

/** Save a ticket file attached to a listing-form submission (optional). */
export async function saveTicketFromForm(
  formData: FormData,
  listingId: number,
  sellerId: number,
): Promise<boolean> {
  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string" || file.size === 0) return false;
  if (file.size > 8 * 1024 * 1024) throw new TicketError("קובץ גדול מדי (מקס' 8MB).");
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadTicketFile({
    listingId,
    sellerId,
    fileName: file.name,
    mime: file.type || "application/octet-stream",
    dataBase64: buf.toString("base64"),
    barcode: String(formData.get("barcode") ?? "").trim() || null,
  });
  return true;
}

/**
 * Return a ticket file for download IF the requester may access it: the seller,
 * or a buyer whose trade for that listing has funds held / been delivered / released.
 */
export async function getTicketFileForDownload(fileId: number, userId: number) {
  const [f] = await db
    .select({
      id: ticketFiles.id,
      mime: ticketFiles.mime,
      fileName: ticketFiles.fileName,
      dataBase64: ticketFiles.dataBase64,
      listingId: ticketFiles.listingId,
      sellerId: listings.sellerId,
    })
    .from(ticketFiles)
    .innerJoin(listings, eq(ticketFiles.listingId, listings.id))
    .where(eq(ticketFiles.id, fileId));
  if (!f) return null;

  if (f.sellerId === userId) return f;

  const [buy] = await db
    .select({ n: sql<number>`count(*)` })
    .from(trades)
    .innerJoin(matches, eq(trades.matchId, matches.id))
    .where(
      and(
        eq(matches.listingId, f.listingId),
        eq(trades.buyerId, userId),
        inArray(trades.state, ["funds_held", "ticket_delivered", "released"]),
      ),
    );
  return Number(buy?.n ?? 0) > 0 ? f : null;
}

/** Ticket files a buyer is entitled to download (paid/delivered/released). */
export function listBuyerDownloads(userId: number) {
  return db
    .select({
      fileId: ticketFiles.id,
      fileName: ticketFiles.fileName,
      eventName: events.name,
      startsAt: shows.startsAt,
      state: trades.state,
    })
    .from(trades)
    .innerJoin(matches, eq(trades.matchId, matches.id))
    .innerJoin(listings, eq(matches.listingId, listings.id))
    .innerJoin(ticketFiles, eq(ticketFiles.listingId, listings.id))
    .innerJoin(shows, eq(listings.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .where(
      and(
        eq(trades.buyerId, userId),
        inArray(trades.state, ["funds_held", "ticket_delivered", "released"]),
      ),
    )
    .orderBy(desc(ticketFiles.id));
}

export function listTicketFilesForListing(listingId: number) {
  return db
    .select({
      id: ticketFiles.id,
      fileName: ticketFiles.fileName,
      barcode: ticketFiles.barcode,
      previousBarcode: ticketFiles.previousBarcode,
      rotatedAt: ticketFiles.rotatedAt,
      createdAt: ticketFiles.createdAt,
    })
    .from(ticketFiles)
    .where(eq(ticketFiles.listingId, listingId))
    .orderBy(desc(ticketFiles.id));
}

/**
 * On sale completion: rotate barcodes for a listing — invalidate the old ones
 * at the venue and issue new ones (the buyer's valid barcode). Sandbox provider.
 */
export async function rotateBarcodesForListing(listingId: number, actorId: number) {
  const files = await db.select().from(ticketFiles).where(eq(ticketFiles.listingId, listingId));
  for (const f of files) {
    if (!f.barcode) continue;
    const { newBarcode } = await venueProvider.invalidateAndReissue(f.barcode, `listing_${listingId}`);
    await db
      .update(ticketFiles)
      .set({ previousBarcode: f.barcode, barcode: newBarcode, rotatedAt: new Date() })
      .where(eq(ticketFiles.id, f.id));
    await db.insert(auditLog).values({
      actorId,
      action: "barcode_rotated",
      entity: "ticket_file",
      entityId: String(f.id),
      payload: { invalidated: f.barcode, issued: newBarcode, sentToVenue: true },
    });
  }
  return files.length;
}

/** Venue-facing lookup: validate a barcode at the gate. */
export async function verifyBarcode(barcode: string) {
  const rows = await db
    .select({
      id: ticketFiles.id,
      barcode: ticketFiles.barcode,
      previousBarcode: ticketFiles.previousBarcode,
      eventName: events.name,
      venueName: venues.name,
      startsAt: shows.startsAt,
      section: listings.seatSection,
      row: listings.seatRow,
      seat: listings.seatNumber,
      kind: listings.seatKind,
    })
    .from(ticketFiles)
    .innerJoin(listings, eq(ticketFiles.listingId, listings.id))
    .innerJoin(shows, eq(listings.showId, shows.id))
    .innerJoin(events, eq(shows.eventId, events.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(ticketFiles.barcode, barcode));

  if (rows[0]) {
    const t = rows[0];
    return {
      valid: true as const,
      event: t.eventName,
      venue: t.venueName,
      startsAt: t.startsAt,
      seat: { kind: t.kind, section: t.section, row: t.row, seat: t.seat },
    };
  }

  // was this an old (invalidated/transferred) barcode?
  const [old] = await db
    .select({ id: ticketFiles.id })
    .from(ticketFiles)
    .where(eq(ticketFiles.previousBarcode, barcode));
  if (old) return { valid: false as const, reason: "invalidated_transferred" };

  return { valid: false as const, reason: "not_found" };
}
