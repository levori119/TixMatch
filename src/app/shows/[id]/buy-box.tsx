"use client";

import { useActionState } from "react";
import { submitBuyRequestAction, type BuyState } from "./actions";

const initial: BuyState = { ok: false, message: "" };

export function BuyBox({
  showId,
  fromPrice,
  interested = 0,
}: {
  showId: number;
  fromPrice: string;
  interested?: number;
}) {
  const [state, action, pending] = useActionState(submitBuyRequestAction, initial);

  return (
    <form action={action}>
      <input type="hidden" name="showId" value={showId} />
      <p className="section-title">בקשת קנייה — תור הוגן (FCFS)</p>
      <p className="hint" style={{ marginTop: 0 }}>
        הגדר כמה אתה מוכן לשלם לכרטיס וכמה כרטיסים. נשריין לך את הכרטיס הזול ביותר שתואם
        (גם זול מהמבוקש). {fromPrice ? `כרגע החל מ-${fromPrice}.` : ""}{" "}
        {interested > 0 ? `יש ${interested} מתעניינים נוספים — רק הראשון שמשלים זוכה.` : ""}
      </p>
      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="b-pmax">מחיר מקס' לכרטיס (₪) *</label>
          <input className="input" id="b-pmax" name="priceMax" type="number" min="0" step="0.01" required />
        </div>
        <div className="row">
          <label className="label" htmlFor="b-qmin">כמות מינ'</label>
          <input className="input" id="b-qmin" name="qtyMin" type="number" min="1" defaultValue="1" />
        </div>
        <div className="row">
          <label className="label" htmlFor="b-qmax">כמות מקס'</label>
          <input className="input" id="b-qmax" name="qtyMax" type="number" min="1" defaultValue="1" />
        </div>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מחפש…" : "🎯 שליחת בקשה לתור"}
      </button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}
    </form>
  );
}
