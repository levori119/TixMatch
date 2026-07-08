"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { parseListingForm } from "@/lib/listing-input";
import { createListing } from "@/db/listings";
import { runMatcherForShow } from "@/db/matching";
import { hasVerifiedCard } from "@/db/payments";
import { saveTicketFromForm } from "@/db/tickets";

export type ListingFormState = { ok: boolean; message: string };

export async function createMyListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר כדי למכור כרטיס." };

  if (!(await hasVerifiedCard(user.id))) {
    return {
      ok: false,
      message: "כדי לפרסם כרטיס יש להוסיף ולאמת כרטיס אשראי תחילה (החשבון שלי → אמצעי תשלום).",
    };
  }

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const { tiers, ...listing } = parsed.data;

  const created = await createListing({ sellerId: user.id, ...listing }, tiers);

  // optional: attach the uploaded ticket file (extracts barcode/seat best-effort)
  let uploaded = false;
  try {
    uploaded = await saveTicketFromForm(formData, created.id, user.id);
  } catch {
    /* non-blocking: listing is published even if the file failed */
  }

  // waiting buyers in the FCFS queue may grab this immediately
  await runMatcherForShow(listing.showId);

  revalidatePath("/account/listings");
  return {
    ok: true,
    message: uploaded
      ? "הכרטיס פורסם והקובץ הועלה! 🎉 עקוב ב\"הכרטיסים שלי\"."
      : "הכרטיס פורסם למכירה! 🎉 עקוב ב\"הכרטיסים שלי\".",
  };
}
