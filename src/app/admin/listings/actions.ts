"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { parseListingForm } from "@/lib/listing-input";
import { createListing, deleteListing } from "@/db/listings";
import { runMatcherForShow } from "@/db/matching";
import { saveTicketFromForm } from "@/db/tickets";

export type FormState = { ok: boolean; message: string };

export async function createListingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (session?.role !== "admin") return { ok: false, message: "אין הרשאה." };

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const { tiers, ...listing } = parsed.data;

  const created = await createListing({ sellerId: session.uid, ...listing }, tiers);
  try {
    await saveTicketFromForm(formData, created.id, session.uid);
  } catch {
    /* non-blocking */
  }
  await runMatcherForShow(listing.showId);

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
