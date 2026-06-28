"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRequestAction, type FormState } from "./actions";

const initial: FormState = { ok: false, message: "" };
type Option = { id: number; label: string };

export function RequestForm({
  buyers,
  shows,
}: {
  buyers: Option[];
  shows: Option[];
}) {
  const [state, action, pending] = useActionState(createRequestAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (buyers.length === 0 || shows.length === 0) {
    return (
      <p className="empty">
        צריך לפחות קונה אחד ומופע אחד כדי ליצור בקשה.
      </p>
    );
  }

  return (
    <form action={action} ref={formRef}>
      <p className="section-title">בקשת קנייה חדשה</p>

      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="r-buyer">קונה *</label>
          <select className="input" id="r-buyer" name="buyerId" required defaultValue="">
            <option value="" disabled>בחר קונה…</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <label className="label" htmlFor="r-show">מופע *</label>
          <select className="input" id="r-show" name="showId" required defaultValue="">
            <option value="" disabled>בחר מופע…</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <label className="label" htmlFor="r-pmin">מחיר מינ' לכרטיס (₪)</label>
          <input className="input" id="r-pmin" name="priceMin" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
        <div className="row">
          <label className="label" htmlFor="r-pmax">מחיר מקס' לכרטיס (₪) *</label>
          <input className="input" id="r-pmax" name="priceMax" type="number" min="0" step="0.01" required />
        </div>
        <div className="row">
          <label className="label" htmlFor="r-qmin">כמות מינ'</label>
          <input className="input" id="r-qmin" name="qtyMin" type="number" min="1" defaultValue="1" />
        </div>
        <div className="row">
          <label className="label" htmlFor="r-qmax">כמות מקס'</label>
          <input className="input" id="r-qmax" name="qtyMax" type="number" min="1" defaultValue="1" />
        </div>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מחפש התאמה…" : "🔎 שליחת בקשה"}
      </button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}
    </form>
  );
}
