"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { id: number; label: string };

/** A dark, type-to-filter single-select with a hidden input for form submission. */
export function SearchableSelect({
  name,
  options,
  placeholder = "בחר…",
}: {
  name: string;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<SelectOption | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  return (
    <div className="picker" ref={ref}>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <button
        type="button"
        className="input picker-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? <span>{selected.label}</span> : <span className="muted">{placeholder}</span>}
        <span className="picker-caret">▾</span>
      </button>

      {open ? (
        <div className="picker-pop" role="listbox">
          <div className="picker-filters">
            <input
              className="input"
              placeholder="🔎 חיפוש…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="picker-list">
            {filtered.length === 0 ? (
              <div className="empty">לא נמצאו תוצאות</div>
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className="picker-item"
                  onClick={() => {
                    setSelected(o);
                    setOpen(false);
                  }}
                >
                  <span className="title">{o.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
