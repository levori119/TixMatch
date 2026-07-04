import type { PriceType, DeliveryType, Tier } from "@/db/listings";

const PRICE_TYPES: PriceType[] = ["at_cost", "above_cost", "discount"];
const DELIVERY_TYPES: DeliveryType[] = ["physical", "digital"];

const ilsToAgorot = (v: string) => Math.round(Number(v) * 100);

export type SeatKind = "seated" | "standing" | null;

export type ParsedListing = {
  showId: number;
  note: string | null;
  priceType: PriceType;
  deliveryType: DeliveryType;
  quantityTotal: number;
  soldIndividually: boolean;
  minTicketsPerSale: number;
  seatKind: SeatKind;
  seatSection: string | null;
  seatRow: string | null;
  seatNumber: string | null;
  tiers: Tier[];
};

export type ParseResult =
  | { ok: true; data: ParsedListing }
  | { ok: false; error: string };

/** Validate + parse a listing/sell form (shared by admin and client sell flows). */
export function parseListingForm(formData: FormData): ParseResult {
  const showId = Number(formData.get("showId"));
  if (!Number.isInteger(showId)) return { ok: false, error: "יש לבחור מופע." };

  const priceType = String(formData.get("priceType") ?? "") as PriceType;
  const deliveryType = String(formData.get("deliveryType") ?? "") as DeliveryType;
  if (!PRICE_TYPES.includes(priceType)) return { ok: false, error: "סוג מחיר לא תקין." };
  if (!DELIVERY_TYPES.includes(deliveryType)) return { ok: false, error: "אופן מסירה לא תקין." };

  const quantityTotal = Number(formData.get("quantityTotal"));
  if (!Number.isInteger(quantityTotal) || quantityTotal < 1) {
    return { ok: false, error: "כמות כרטיסים חייבת להיות 1 ומעלה." };
  }

  const minTicketsPerSale = Number(formData.get("minTicketsPerSale") || "1");
  if (
    !Number.isInteger(minTicketsPerSale) ||
    minTicketsPerSale < 1 ||
    minTicketsPerSale > quantityTotal
  ) {
    return { ok: false, error: "מינימום כרטיסים למכירה לא תקין (1 עד הכמות הכוללת)." };
  }

  const soldIndividually = formData.get("soldIndividually") === "on";
  const note = String(formData.get("note") ?? "").trim() || null;

  const basePrice = ilsToAgorot(String(formData.get("basePrice") ?? ""));
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { ok: false, error: "מחיר בסיס (לכרטיס בודד) חייב להיות גדול מ-0." };
  }

  const tiers: Tier[] = [{ minQty: 1, unitPriceAgorot: basePrice }];
  const qtys = formData.getAll("tierQty").map((v) => Number(v));
  const prices = formData.getAll("tierPrice").map((v) => ilsToAgorot(String(v)));
  for (let i = 0; i < qtys.length; i++) {
    const q = qtys[i];
    const p = prices[i];
    if (!q && !p) continue;
    if (!Number.isInteger(q) || q <= 1 || q > quantityTotal) {
      return { ok: false, error: "מדרגת כמות חייבת להיות מספר שלם בין 2 לכמות הכוללת." };
    }
    if (!Number.isFinite(p) || p <= 0) {
      return { ok: false, error: "מחיר במדרגת כמות חייב להיות גדול מ-0." };
    }
    tiers.push({ minQty: q, unitPriceAgorot: p });
  }

  // optional specific location
  const kindRaw = String(formData.get("seatKind") ?? "");
  const seatKind: SeatKind = kindRaw === "seated" || kindRaw === "standing" ? kindRaw : null;
  const clean = (k: string) => (seatKind === "seated" ? String(formData.get(k) ?? "").trim() || null : null);
  const seatSection = clean("seatSection");
  const seatRow = clean("seatRow");
  const seatNumber = clean("seatNumber");

  return {
    ok: true,
    data: {
      showId, note, priceType, deliveryType, quantityTotal, soldIndividually, minTicketsPerSale,
      seatKind, seatSection, seatRow, seatNumber, tiers,
    },
  };
}
