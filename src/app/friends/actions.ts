"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { setMyPhone, addFriendByPhone, acceptRequest, removeFriendship, setOptOut } from "@/db/friends";

export type FormState = { ok: boolean; message: string };

export async function setPhoneAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר." };
  const raw = String(formData.get("phone") ?? "").trim();
  if (raw.replace(/\D/g, "").length < 9) return { ok: false, message: "מספר טלפון לא תקין." };
  await setMyPhone(user.id, raw);
  revalidatePath("/friends");
  return { ok: true, message: "הטלפון נשמר ✓" };
}

export async function addFriendAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "יש להתחבר." };
  const res = await addFriendByPhone(user.id, String(formData.get("phone") ?? "").trim());
  revalidatePath("/friends");
  switch (res.status) {
    case "requested": return { ok: true, message: `בקשת חברות נשלחה ל-${res.name}. תופיעו כחברים רק לאחר אישור ✓` };
    case "accepted": return { ok: true, message: `${res.name} כבר שלח/ה לך בקשה — אתם חברים עכשיו! 🎉` };
    case "already": return { ok: false, message: `אתם כבר חברים.` };
    case "requested_already": return { ok: false, message: `כבר שלחת בקשה — ממתינה לאישור.` };
    case "invalid": return { ok: false, message: "מספר טלפון לא תקין." };
    case "self": return { ok: false, message: "זה המספר שלך 🙂" };
    case "notfound": return { ok: false, message: "אין משתמש TixMatch עם המספר הזה (עדיין)." };
  }
}

export async function acceptRequestAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("userId"));
  if (Number.isInteger(id)) {
    await acceptRequest(user.id, id);
    revalidatePath("/friends");
  }
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const id = Number(formData.get("userId"));
  if (Number.isInteger(id)) {
    await removeFriendship(user.id, id);
    revalidatePath("/friends");
  }
}

export async function setOptOutAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  await setOptOut(user.id, formData.get("optout") === "1");
  revalidatePath("/friends");
}
