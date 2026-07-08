"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { cancelListing } from "@/db/listings";
import { uploadTicketFile, TicketError } from "@/db/tickets";

export async function cancelListingAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await cancelListing(id, user.id);
    revalidatePath("/account/listings");
  }
}

const MAX = 6 * 1024 * 1024; // 6MB

export async function uploadTicketAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const listingId = Number(formData.get("listingId"));
  const file = formData.get("file") as File | null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;

  if (!Number.isInteger(listingId) || !file || file.size === 0) {
    redirect("/account/listings?tk=missing");
  }
  if (file!.size > MAX) redirect("/account/listings?tk=toobig");

  try {
    const buf = Buffer.from(await file!.arrayBuffer());
    await uploadTicketFile({
      listingId,
      sellerId: user.id,
      fileName: file!.name,
      mime: file!.type || "application/octet-stream",
      dataBase64: buf.toString("base64"),
      barcode,
    });
  } catch (e) {
    redirect(`/account/listings?tk=${e instanceof TicketError ? "owner" : "error"}`);
  }
  revalidatePath("/account/listings");
  redirect("/account/listings?tk=ok");
}
