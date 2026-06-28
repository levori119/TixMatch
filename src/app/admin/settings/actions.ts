"use server";

import { revalidatePath } from "next/cache";
import { updateCommission } from "@/db/settings";

export type ActionState = { ok: boolean; message: string };

/**
 * Update the platform commission from the Admin screen.
 * Admin enters a percent (e.g. 2.5) and a fixed fee in ILS; we store bps + agorot.
 * NOTE: this screen is NOT yet access-controlled — admin auth is an open task (CLAUDE.md §8).
 */
export async function updateCommissionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const percentRaw = String(formData.get("commissionPercent") ?? "").trim();
  const fixedIlsRaw = String(formData.get("commissionFixedIls") ?? "").trim();

  const percent = Number(percentRaw);
  const fixedIls = Number(fixedIlsRaw || "0");

  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { ok: false, message: "אחוז העמלה חייב להיות מספר בין 0 ל-100." };
  }
  if (!Number.isFinite(fixedIls) || fixedIls < 0) {
    return { ok: false, message: "עמלה קבועה חייבת להיות מספר אי-שלילי." };
  }

  const commissionBps = Math.round(percent * 100); // 2.5% -> 250 bps
  const commissionFixedAgorot = Math.round(fixedIls * 100); // ₪1 -> 100 agorot

  try {
    await updateCommission({ commissionBps, commissionFixedAgorot, updatedBy: null });
    revalidatePath("/admin/settings");
    return { ok: true, message: "העמלה עודכנה בהצלחה ✓" };
  } catch (err) {
    console.error("updateCommission failed", err);
    return { ok: false, message: "עדכון נכשל. נסה שוב או בדוק את חיבור ה-DB." };
  }
}
