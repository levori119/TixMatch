"use server";

import { revalidatePath } from "next/cache";
import {
  createBuyRequest,
  runMatcherForShow,
  cancelBuyRequest,
} from "@/db/matching";

export type FormState = { ok: boolean; message: string };

const ils = (v: string) => Math.round(Number(v) * 100);

export async function createRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const buyerId = Number(formData.get("buyerId"));
  const showId = Number(formData.get("showId"));
  if (!Number.isInteger(buyerId)) return { ok: false, message: "יש לבחור קונה." };
  if (!Number.isInteger(showId)) return { ok: false, message: "יש לבחור מופע." };

  const priceMin = ils(String(formData.get("priceMin") ?? "0"));
  const priceMax = ils(String(formData.get("priceMax") ?? ""));
  if (!Number.isFinite(priceMax) || priceMax <= 0) {
    return { ok: false, message: "מחיר מקסימום חייב להיות גדול מ-0." };
  }
  if (priceMin < 0 || priceMin > priceMax) {
    return { ok: false, message: "טווח המחיר לא תקין (מינ' ≤ מקס')." };
  }

  const qtyMin = Number(formData.get("qtyMin") || "1");
  const qtyMax = Number(formData.get("qtyMax") || "1");
  if (!Number.isInteger(qtyMin) || qtyMin < 1 || !Number.isInteger(qtyMax) || qtyMax < qtyMin) {
    return { ok: false, message: "כמות לא תקינה (1 ≤ מינ' ≤ מקס')." };
  }

  const req = await createBuyRequest({
    buyerId,
    showId,
    priceMinAgorot: priceMin,
    priceMaxAgorot: priceMax,
    qtyMin,
    qtyMax,
  });

  const results = await runMatcherForShow(showId);
  revalidatePath("/admin/requests");

  const mine = results.find((r) => r.buyRequestId === req.id);
  if (mine) {
    return {
      ok: true,
      message: `הותאם! ${mine.qty} כרטיס(ים) ב-₪${(mine.unitPriceAgorot / 100).toLocaleString("he-IL")} לכרטיס ✓`,
    };
  }
  return { ok: true, message: "הבקשה נכנסה לתור (אין כרגע כרטיס תואם) ⏳" };
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await cancelBuyRequest(id);
    revalidatePath("/admin/requests");
  }
}
