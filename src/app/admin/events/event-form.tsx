"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEventAction, type FormState } from "./actions";
import { GenreCheckboxes } from "./genre-checkboxes";

const initial: FormState = { ok: false, message: "" };

export function EventForm({ genres }: { genres: { id: number; nameHe: string; emoji: string | null }[] }) {
  const [state, action, pending] = useActionState(createEventAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef}>
      <p className="section-title">הוספת הופעה</p>
      <div className="grid-2">
        <div className="row">
          <label className="label" htmlFor="e-name">שם ההופעה *</label>
          <input className="input" id="e-name" name="name" required />
        </div>
        <div className="row">
          <label className="label" htmlFor="e-artist">אמן</label>
          <input className="input" id="e-artist" name="artist" />
        </div>
        <div className="row">
          <label className="label" htmlFor="e-cat">קטגוריה</label>
          <input className="input" id="e-cat" name="category" placeholder="פופ / רוק / סטנדאפ…" />
        </div>
      </div>
      <div className="row">
        <label className="label">סגנונות מוזיקה</label>
        <GenreCheckboxes genres={genres} />
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מוסיף…" : "➕ הוספת הופעה"}
      </button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}
    </form>
  );
}
