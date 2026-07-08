import { verifyBarcode } from "@/db/tickets";

export const dynamic = "force-dynamic";

/**
 * Venue-facing gate verification.
 *   GET /api/venue/verify?barcode=XXXX
 *   Header: x-venue-key: <VENUE_API_KEY>
 * Returns whether the barcode is currently valid + event/seat info. A barcode
 * that was invalidated on transfer returns { valid:false, reason:"invalidated_transferred" }.
 */
export async function GET(req: Request) {
  const key = req.headers.get("x-venue-key");
  if (!process.env.VENUE_API_KEY || key !== process.env.VENUE_API_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const barcode = new URL(req.url).searchParams.get("barcode")?.trim();
  if (!barcode) return Response.json({ error: "barcode query param required" }, { status: 400 });

  const result = await verifyBarcode(barcode);
  return Response.json(result);
}
