"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createAd, toggleAd, deleteAd } from "@/db/ads";

export type FormState = { ok: boolean; message: string };

function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createAdAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (session?.role !== "admin") return { ok: false, message: "אין הרשאה." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "כותרת חובה." };

  const href = String(formData.get("href") ?? "").trim() || "/browse";
  const sortOrder = Number(formData.get("sortOrder") || "0");
  if (!Number.isInteger(sortOrder)) return { ok: false, message: "סדר תצוגה חייב להיות מספר שלם." };

  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));
  if (startsAt && endsAt && endsAt < startsAt) {
    return { ok: false, message: "תאריך הסיום מוקדם מתאריך ההתחלה." };
  }

  await createAd({
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    emoji: String(formData.get("emoji") ?? "").trim() || null,
    colorFrom: String(formData.get("colorFrom") ?? "#ff2e93"),
    colorTo: String(formData.get("colorTo") ?? "#7b5cff"),
    cta: String(formData.get("cta") ?? "").trim() || null,
    href,
    startsAt,
    endsAt,
    sortOrder,
  });

  revalidatePath("/admin/ads");
  revalidatePath("/", "layout"); // rail shows on every page
  return { ok: true, message: `הפרסומת "${title}" נוספה ✓` };
}

export async function toggleAdAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1";
  if (Number.isInteger(id)) {
    await toggleAd(id, active);
    revalidatePath("/admin/ads");
    revalidatePath("/", "layout");
  }
}

export async function deleteAdAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (session?.role !== "admin") return;
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteAd(id);
    revalidatePath("/admin/ads");
    revalidatePath("/", "layout");
  }
}
