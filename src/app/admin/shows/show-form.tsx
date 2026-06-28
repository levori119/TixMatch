"use client";

import { useActionState, useEffect, useRef } from "react";
import { createShowAction, type FormState } from "./actions";
import { SearchableSelect } from "@/app/_components/searchable-select";

const initial: FormState = { ok: false, message: "" };

type Option = { id: number; name: string };

export function ShowForm({
  events,
  venues,
}: {
  events: Option[];
  venues: Option[];
}) {
  const [state, action, pending] = useActionState(createShowAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (events.length === 0 || venues.length === 0) {
    return (
      <p className="empty">
        כדי להוסיף מופע צריך לפחות הופעה אחת ואולם אחד.
        {events.length === 0 ? " הוסף הופעה בלשונית 🎤." : ""}
        {venues.length === 0 ? " הוסף אולם בלשונית 🏟️." : ""}
      </p>
    );
  }

  return (
    <form action={action} ref={formRef}>
      <p className="section-title">הוספת מופע</p>
      <div className="grid-2">
        <div className="row">
          <label className="label">הופעה *</label>
          <SearchableSelect
            name="eventId"
            placeholder="בחר הופעה…"
            options={events.map((e) => ({ id: e.id, label: e.name }))}
          />
        </div>
        <div className="row">
          <label className="label">אולם *</label>
          <SearchableSelect
            name="venueId"
            placeholder="בחר אולם…"
            options={venues.map((v) => ({ id: v.id, label: v.name }))}
          />
        </div>
        <div className="row">
          <label className="label" htmlFor="s-date">תאריך ושעה *</label>
          <input className="input" id="s-date" name="startsAt" type="datetime-local" required />
        </div>
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "מוסיף…" : "➕ הוספת מופע"}
      </button>
      {state.message ? (
        <div className={`notice ${state.ok ? "ok" : "err"}`} role="status">
          {state.ok ? "✓" : "⚠"} {state.message}
        </div>
      ) : null}
    </form>
  );
}
