"use client";

import { useRef, useState } from "react";
import { updateLocationAction } from "./actions";

export function ProximityShare({ showId }: { showId: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const share = () => {
    setErr("");
    if (!("geolocation" in navigator)) {
      setErr("הדפדפן לא תומך במיקום.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current && lngRef.current) {
          latRef.current.value = String(pos.coords.latitude);
          lngRef.current.value = String(pos.coords.longitude);
          formRef.current?.requestSubmit();
        }
      },
      (e) => {
        setBusy(false);
        setErr(e.code === e.PERMISSION_DENIED ? "לא אושרה גישה למיקום." : "לא הצלחנו לקבל מיקום.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <form action={updateLocationAction} ref={formRef}>
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="lat" ref={latRef} />
      <input type="hidden" name="lng" ref={lngRef} />
      <button type="button" className="btn" onClick={share} disabled={busy}>
        {busy ? "משתף…" : "📍 שתף מיקום וראה מי בקרבת מקום"}
      </button>
      {err ? <div className="notice err" role="alert" style={{ marginTop: 10 }}>⚠ {err}</div> : null}
    </form>
  );
}
