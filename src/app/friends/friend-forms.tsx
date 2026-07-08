"use client";

import { useActionState } from "react";
import { setPhoneAction, addFriendAction, type FormState } from "./actions";

const init: FormState = { ok: false, message: "" };

export function PhoneForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(setPhoneAction, init);
  return (
    <form action={action}>
      <label className="label" htmlFor="ph">הטלפון שלי</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" id="ph" name="phone" type="tel" dir="ltr" placeholder="050-0000000" defaultValue={current ?? ""} />
        <button className="btn" type="submit" disabled={pending}>{pending ? "…" : "שמירה"}</button>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>נשמר כדי שחברים ימצאו אותך לפי מספר. פרטי — לא מוצג לאף אחד.</p>
      {state.message ? <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">{state.ok ? "✓" : "⚠"} {state.message}</div> : null}
    </form>
  );
}

export function AddFriendForm() {
  const [state, action, pending] = useActionState(addFriendAction, init);
  return (
    <form action={action}>
      <label className="label" htmlFor="fp">הוספת חבר לפי טלפון</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" id="fp" name="phone" type="tel" dir="ltr" placeholder="הטלפון של החבר" />
        <button className="btn" type="submit" disabled={pending}>{pending ? "…" : "➕ הוספה"}</button>
      </div>
      {state.message ? <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">{state.ok ? "✓" : "⚠"} {state.message}</div> : null}
    </form>
  );
}
