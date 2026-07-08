import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "./index";
import { ticketFiles, listings, shows, events, venues, auditLog } from "./schema";
import { venueProvider, genBarcode } from "./venue-provider";

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
  // ownership check
  const [own] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.id, input.listingId), eq(listings.sellerId, input.sellerId)));
  if (!own) throw new TicketError("הכרטיס לא שייך לך.");

  const barcode = input.barcode?.trim() || genBarcode();
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
    payload: { fileName: input.fileName, barcode },
  });
  return row;
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
