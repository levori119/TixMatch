"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAdAction, type FormState } from "./actions";

const initial: FormState = { ok: false, message: "" };

export function AdForm() {
  const [state, action, pending] = useActionState(createAdAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [from, setFrom] = useState("#ff2e93");
  const [to, setTo] = useState("#7b5cff");
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [emoji, setEmoji] = useState("📣");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setFrom("#ff2e93");
      setTo("#7b5cff");
      setTitle("");
      setSub("");
      setEmoji("📣");
    }
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <p className="section-title">פרסומת חדשה</p>

      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="a-title">כותרת *</label>
          <input className="input" id="a-title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-sub">תת-כותרת</label>
          <input className="input" id="a-sub" name="subtitle" value={sub} onChange={(e) => setSub(e.target.value)} />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-emoji">אימוג'י</label>
          <input className="input" id="a-emoji" name="emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-cta">טקסט כפתור</label>
          <input className="input" id="a-cta" name="cta" placeholder="לפרטים" />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-href">קישור</label>
          <input className="input" id="a-href" name="href" dir="ltr" defaultValue="/browse" />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-sort">סדר תצוגה</label>
          <input className="input" id="a-sort" name="sortOrder" type="number" defaultValue="0" />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-start">תחילת הצגה (אופציונלי)</label>
          <input className="input" id="a-start" name="startsAt" type="datetime-local" />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-end">סיום הצגה (אופציונלי)</label>
          <input className="input" id="a-end" name="endsAt" type="datetime-local" />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-from">צבע התחלה</label>
          <input className="input" id="a-from" name="colorFrom" type="color" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="row">
          <label className="label" htmlFor="a-to">צבע סיום</label>
          <input className="input" id="a-to" name="colorTo" type="color" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <label className="label">תצוגה מקדימה</label>
        <div className="fakead" style={{ background: `linear-gradient(140deg, ${from}, ${to})`, maxWidth: 240 }}>
          <span className="promo">פרסומת</span>
          <span className="fa-emoji">{emoji || "📣"}</span>
          <span className="fa-title">{title || "כותרת"}</span>
          <span className="fa-sub">{sub || "תת-כותרת"}</span>
          <span className="fa-cta">לפרטים →</span>
        </div>
      </div>

      <button className="btn" type="submit" disabled={pending}>{pending ? "מוסיף…" : "➕ הוספת פרסומת"}</button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">{state.ok ? "✓" : "⚠"} {state.message}</div>
      ) : null}
    </form>
  );
}
