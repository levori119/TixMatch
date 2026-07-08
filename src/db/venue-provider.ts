import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Venue / issuer ticketing integration.
 *
 * ⚠️ DEV SANDBOX ONLY. Real barcode invalidation + reissue can ONLY be done by
 * the ticket ISSUER's system (the venue's scanners only honor barcodes from
 * their own database). In production this must be implemented against a real
 * issuer/venue API — e.g. Ticketmaster SafeTix Partner API, or the Israeli
 * issuer's API — under a B2B agreement (see CLAUDE.md §3 B2B, §8 open items).
 * The sandbox below generates/rotates barcodes locally and moves nothing real.
 */
export interface VenueTicketingProvider {
  /** Register a ticket's barcode with the venue when it's uploaded/listed. */
  registerBarcode(barcode: string, ref: string): Promise<void>;
  /**
   * On sale/transfer: tell the venue to INVALIDATE the old barcode and ISSUE a
   * new one to the buyer. Returns the new (valid) barcode.
   */
  invalidateAndReissue(oldBarcode: string, ref: string): Promise<{ newBarcode: string }>;
}

function genBarcode(): string {
  // sandbox barcode value (would be the issuer's in production)
  return `TIX-${randomBytes(9).toString("hex").toUpperCase()}`;
}

class SandboxVenueProvider implements VenueTicketingProvider {
  async registerBarcode(_barcode: string, _ref: string) {
    /* no-op in sandbox */
  }
  async invalidateAndReissue(_oldBarcode: string, _ref: string) {
    return { newBarcode: genBarcode() };
  }
}

export const venueProvider: VenueTicketingProvider = new SandboxVenueProvider();
export { genBarcode };
