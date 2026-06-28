"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createListing,
  deleteListing,
  type PriceType,
  type DeliveryType,
  type Tier,
} from "@/db/listings";
import { runMatcherForShow } from "@/db/matching";

export type FormState = { ok: boolean; message: string };

const PRICE_TYPES: PriceType[] = ["at_cost", "above_cost", "discount"];
const DELIVERY_TYPES: DeliveryType[] = ["physical", "digital"];

function ilsToAgorot(v: string): number {
  return Math.round(Number(v) * 100);
}

export async function createListingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (session?.role !== "admin") return { ok: false, message: "אין הרשאה." };

  const showId = Number(formData.get("showId"));
  if (!Number.isInteger(showId)) return { ok: false, message: "יש לבחור מופע." };

  const priceType = String(formData.get("priceType") ?? "") as PriceType;
  const deliveryType = String(formData.get("deliveryType") ?? "") as DeliveryType;
  if (!PRICE_TYPES.includes(priceType)) return { ok: false, message: "סוג מחיר לא תקין." };
  if (!DELIVERY_TYPES.includes(deliveryType)) return { ok: false, message: "אופן מסירה לא תקין." };

  const quantityTotal = Number(formData.get("quantityTotal"));
  if (!Number.isInteger(quantityTotal) || quantityTotal < 1) {
    return { ok: false, message: "כמות כרטיסים חייבת להיות 1 ומעלה." };
  }

  const minTicketsPerSale = Number(formData.get("minTicketsPerSale") || "1");
  if (!Number.isInteger(minTicketsPerSale) || minTicketsPerSale < 1 || minTicketsPerSale > quantityTotal) {
    return { ok: false, message: "מינימום כרטיסים למכירה לא תקין (1 עד הכמות הכוללת)." };
  }

  const soldIndividually = formData.get("soldIndividually") === "on";
  const note = String(formData.get("note") ?? "").trim() || null;

  const basePrice = ilsToAgorot(String(formData.get("basePrice") ?? ""));
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { ok: false, message: "מחיר בסיס (לכרטיס בודד) חייב להיות גדול מ-0." };
  }

  // tiered pricing: base tier (qty 1) + optional extra tiers
  const tiers: Tier[] = [{ minQty: 1, unitPriceAgorot: basePrice }];
  const qtys = formData.getAll("tierQty").map((v) => Number(v));
  const prices = formData.getAll("tierPrice").map((v) => ilsToAgorot(String(v)));
  for (let i = 0; i < qtys.length; i++) {
    const q = qtys[i];
    const p = prices[i];
    if (!q && !p) continue; // empty row
    if (!Number.isInteger(q) || q <= 1 || q > quantityTotal) {
      return { ok: false, message: "מדרגת כמות חייבת להיות מספר שלם בין 2 לכמות הכוללת." };
    }
    if (!Number.isFinite(p) || p <= 0) {
      return { ok: false, message: "מחיר במדרגת כמות חייב להיות גדול מ-0." };
    }
    tiers.push({ minQty: q, unitPriceAgorot: p });
  }

  await createListing(
    {
      sellerId: session.uid,
      showId,
      note,
      priceType,
      deliveryType,
      quantityTotal,
      soldIndividually,
      minTicketsPerSale,
    },
    tiers,
  );

  // newly available inventory may satisfy buyers already waiting in the FCFS queue
  await runMatcherForShow(showId);

  revalidatePath("/admin/listings");
  revalidatePath("/admin/requests");
  return { ok: true, message: "הכרטיס פורסם למכירה ✓" };
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteListing(id);
    revalidatePath("/admin/listings");
  }
}
