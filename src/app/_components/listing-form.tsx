"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ShowPicker, type ShowOption } from "./show-picker";

export type ListingFormState = { ok: boolean; message: string };

export function ListingForm({
  action,
  shows,
  title,
  submitLabel,
}: {
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  shows: ShowOption[];
  title: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const [tiers, setTiers] = useState<{ qty: string; price: string }[]>([]);
  const [hasLoc, setHasLoc] = useState(false);
  const [kind, setKind] = useState<"seated" | "standing" | "">("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setTiers([]);
      setHasLoc(false);
      setKind("");
    }
  }, [state]);

  if (shows.length === 0) {
    return <p className="empty">אין כרגע מופעים זמינים למכירה. בדוק שוב מאוחר יותר.</p>;
  }

  return (
    <form action={formAction} ref={formRef}>
      <p className="section-title">{title}</p>

      <div className="row">
        <label className="label">מופע *</label>
        <ShowPicker name="showId" shows={shows} />
      </div>

      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="l-ptype">סוג מחיר *</label>
          <select className="input" id="l-ptype" name="priceType" defaultValue="at_cost">
            <option value="at_cost">מחיר עלות</option>
            <option value="above_cost">מעל מחיר עלות</option>
            <option value="discount">בהנחה</option>
          </select>
        </div>
        <div className="row">
          <label className="label" htmlFor="l-delivery">אופן מסירה *</label>
          <select className="input" id="l-delivery" name="deliveryType" defaultValue="digital">
            <option value="digital">דיגיטלי</option>
            <option value="physical">פיזי</option>
          </select>
        </div>
        <div className="row">
          <label className="label" htmlFor="l-qty">כמות כרטיסים *</label>
          <input className="input" id="l-qty" name="quantityTotal" type="number" min="1" defaultValue="1" required />
        </div>
        <div className="row">
          <label className="label" htmlFor="l-min">מינימום למכירה</label>
          <input className="input" id="l-min" name="minTicketsPerSale" type="number" min="1" defaultValue="1" />
        </div>
        <div className="row">
          <label className="label" htmlFor="l-base">מחיר לכרטיס בודד (₪) *</label>
          <input className="input" id="l-base" name="basePrice" type="number" min="0" step="0.01" required />
        </div>
        <div className="row" style={{ display: "flex", alignItems: "flex-end" }}>
          <label className="label" style={{ display: "flex", gap: 8, alignItems: "center", margin: 0 }}>
            <input type="checkbox" name="soldIndividually" defaultChecked />
            ניתן למכור בבודדים
          </label>
        </div>
      </div>

      <div className="row">
        <label className="label">תמחור מדורג לפי כמות (אופציונלי)</label>
        <p className="hint" style={{ marginTop: 0 }}>הנחה בקנייה מרובה — החל מכמות X, המחיר לכרטיס הוא Y.</p>
        {tiers.map((t, i) => (
          <div key={i} className="grid-2" style={{ marginTop: 8 }}>
            <input className="input" name="tierQty" type="number" min="2" placeholder="החל מכמות"
              value={t.qty}
              onChange={(e) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
            <input className="input" name="tierPrice" type="number" min="0" step="0.01" placeholder="מחיר לכרטיס (₪)"
              value={t.price}
              onChange={(e) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
          </div>
        ))}
        <div className="chips" style={{ marginTop: 10 }}>
          <button type="button" className="chip" onClick={() => setTiers((p) => [...p, { qty: "", price: "" }])}>
            ➕ מדרגת מחיר
          </button>
          {tiers.length > 0 ? (
            <button type="button" className="chip danger" onClick={() => setTiers((p) => p.slice(0, -1))}>
              הסר אחרונה
            </button>
          ) : null}
        </div>
      </div>

      <div className="row">
        <label className="label" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={hasLoc} onChange={(e) => setHasLoc(e.target.checked)} />
          📍 הוסף מיקום ספציפי
        </label>
        {hasLoc ? (
          <div style={{ marginTop: 10 }}>
            <div className="genrechips">
              <label className="genrechk">
                <input type="radio" name="seatKind" value="seated" checked={kind === "seated"} onChange={() => setKind("seated")} />
                <span>🪑 ישיבה</span>
              </label>
              <label className="genrechk">
                <input type="radio" name="seatKind" value="standing" checked={kind === "standing"} onChange={() => setKind("standing")} />
                <span>🧍 עמידה</span>
              </label>
            </div>
            {kind === "seated" ? (
              <div className="grid-2" style={{ marginTop: 10 }}>
                <input className="input" name="seatSection" placeholder="אזור / סקשן (למשל: יציע A)" />
                <input className="input" name="seatRow" placeholder="שורה" />
                <input className="input" name="seatNumber" placeholder="כיסא / כיסאות (למשל: 12–13)" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="row">
        <label className="label" htmlFor="l-note">הערה</label>
        <input className="input" id="l-note" name="note" placeholder="למשל: ישיבה צמודה, יציאה מוקדמת…" />
      </div>

      <div className="row">
        <label className="label">🎫 הכרטיס הדיגיטלי (אופציונלי)</label>
        <p className="hint" style={{ marginTop: 0 }}>
          העלה את קובץ הכרטיס (PDF/תמונה). ננסה לחלץ ממנו ברקוד ומיקום אוטומטית.
        </p>
        <div className="ticket-upload" style={{ border: "none", padding: 0, marginTop: 6 }}>
          <input className="input" type="file" name="file" accept=".pdf,image/*" />
          <input className="input" name="barcode" placeholder="ברקוד (אם ידוע — אחרת ייחלץ/ייווצר)" dir="ltr" />
        </div>
      </div>

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מפרסם…" : submitLabel}
      </button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}
    </form>
  );
}
