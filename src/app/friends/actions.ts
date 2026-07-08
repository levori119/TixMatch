"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { setMyPhone, addFriendByPhone, removeFriend } from "@/db/friends";

export type FormState = { ok: boolean; message: string };

export async function setPhoneAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר." };
  const raw = String(formData.get("phone") ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return { ok: false, message: "מספר טלפון לא תקין." };
  await setMyPhone(user.id, raw);
  revalidatePath("/friends");
  return { ok: true, message: "הטלפון נשמר ✓ עכשיו חברים יוכלו למצוא אותך, ואתה אותם." };
}

export async function addFriendAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר." };
  const phone = String(formData.get("phone") ?? "").trim();
  const res = await addFriendByPhone(user.id, phone);
  revalidatePath("/friends");
  switch (res.status) {
    case "ok": return { ok: true, message: `${res.name} נוסף/ה לחברים שלך ✓` };
    case "invalid": return { ok: false, message: "מספר טלפון לא תקין." };
    case "self": return { ok: false, message: "זה המספר שלך 🙂" };
    case "already": return { ok: false, message: "כבר חברים." };
    case "notfound": return { ok: false, message: "אין משתמש TixMatch עם המספר הזה (עדיין)." };
  }
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("friendId"));
  if (Number.isInteger(id)) {
    await removeFriend(user.id, id);
    revalidatePath("/friends");
  }
}
