"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCardAction, type CardState } from "./actions";

const initial: CardState = { ok: false, message: "" };
const thisYear = new Date().getFullYear();

export function CardForm() {
  const [state, action, pending] = useActionState(addCardAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <p className="section-title">הוספת כרטיס</p>
      <div className="row">
        <label className="label" htmlFor="cardNumber">מספר כרטיס</label>
        <input
          className="input"
          id="cardNumber"
          name="cardNumber"
          inputMode="numeric"
          dir="ltr"
          placeholder="4111 1111 1111 1111 (כרטיס בדיקה)"
          autoComplete="off"
          required
        />
      </div>
      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="expMonth">חודש תוקף</label>
          <input className="input" id="expMonth" name="expMonth" type="number" min="1" max="12" placeholder="MM" dir="ltr" required />
        </div>
        <div className="row">
          <label className="label" htmlFor="expYear">שנת תוקף</label>
          <input className="input" id="expYear" name="expYear" type="number" min={thisYear} max={thisYear + 20} placeholder="YYYY" dir="ltr" required />
        </div>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מוסיף…" : "➕ הוספת כרטיס"}
      </button>

      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}

      <p className="hint" style={{ marginTop: 14 }}>
        🔒 <strong>סביבת sandbox לפיתוח.</strong> בפרודקשן הכרטיס נקלט ישירות אצל ספק הסליקה
        (tokenization) ומספר הכרטיס לעולם לא נשמר אצלנו — נשמרים רק טוקן, 4 ספרות אחרונות וסוג כרטיס.
      </p>
    </form>
  );
}
