"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { createBuyRequest, runMatcherForShow } from "@/db/matching";
import { recordShowSignal } from "@/db/affinity";

export type BuyState = { ok: boolean; message: string };

const ils = (v: string) => Math.round(Number(v) * 100);

export async function submitBuyRequestAction(
  _prev: BuyState,
  formData: FormData,
): Promise<BuyState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר כדי לשלוח בקשת קנייה." };

  const showId = Number(formData.get("showId"));
  if (!Number.isInteger(showId)) return { ok: false, message: "מופע לא תקין." };

  const priceMax = ils(String(formData.get("priceMax") ?? ""));
  const priceMin = ils(String(formData.get("priceMin") ?? "0"));
  if (!Number.isFinite(priceMax) || priceMax <= 0) {
    return { ok: false, message: "מחיר מקסימום חייב להיות גדול מ-0." };
  }
  if (priceMin < 0 || priceMin > priceMax) {
    return { ok: false, message: "טווח מחיר לא תקין." };
  }

  const qtyMin = Number(formData.get("qtyMin") || "1");
  const qtyMax = Number(formData.get("qtyMax") || "1");
  if (!Number.isInteger(qtyMin) || qtyMin < 1 || !Number.isInteger(qtyMax) || qtyMax < qtyMin) {
    return { ok: false, message: "כמות לא תקינה (1 ≤ מינ' ≤ מקס')." };
  }

  const req = await createBuyRequest({
    buyerId: user.id,
    showId,
    priceMinAgorot: priceMin,
    priceMaxAgorot: priceMax,
    qtyMin,
    qtyMax,
  });

  await recordShowSignal(user.id, showId, 3); // buy intent is a strong taste signal

  const results = await runMatcherForShow(showId);
  revalidatePath(`/shows/${showId}`);
  revalidatePath("/account/requests");

  const mine = results.find((r) => r.buyRequestId === req.id);
  if (mine) {
    return {
      ok: true,
      message: `יש התאמה! שריינו לך ${mine.qty} כרטיס(ים) ב-₪${(mine.unitPriceAgorot / 100).toLocaleString("he-IL")} לכרטיס. עבור ל"הבקשות שלי".`,
    };
  }
  return {
    ok: true,
    message: "בקשתך נכנסה לתור (First-Come-First-Served). נודיע כשיימצא כרטיס תואם ⏳",
  };
}
