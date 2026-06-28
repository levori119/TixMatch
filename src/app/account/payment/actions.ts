"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { addCard, verifyCard, deleteCard, PaymentError } from "@/db/payments";

export type CardState = { ok: boolean; message: string };

export async function addCardAction(
  _prev: CardState,
  formData: FormData,
): Promise<CardState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר." };

  const cardNumber = String(formData.get("cardNumber") ?? "");
  const expMonth = Number(formData.get("expMonth"));
  const expYear = Number(formData.get("expYear"));

  try {
    await addCard(user.id, { cardNumber, expMonth, expYear });
  } catch (e) {
    return { ok: false, message: e instanceof PaymentError ? e.message : "הוספת הכרטיס נכשלה." };
  }
  revalidatePath("/account/payment");
  return { ok: true, message: "הכרטיס נוסף. כעת אמת אותו בסליקת ₪1 ✓" };
}

export async function verifyCardAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    try {
      await verifyCard(id, user.id);
    } catch {
      /* surfaced via status on reload */
    }
    revalidatePath("/account/payment");
  }
}

export async function deleteCardAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await deleteCard(id, user.id);
    revalidatePath("/account/payment");
  }
}
