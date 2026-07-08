"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutToHomeAction } from "@/app/auth-actions";

export function UserMenu({ name, isAdmin }: { name: string | null; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!name) {
    return <Link href="/login" className="nav-login">כניסה</Link>;
  }

  const first = name.split(" ")[0];
  return (
    <div className="usermenu" ref={ref}>
      <button
        type="button"
        className="usermenu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ua">{first[0]}</span>
        <span className="un">{first}</span>
        <span className="uc">▾</span>
      </button>
      {open ? (
        <div className="usermenu-pop" role="menu">
          <Link href="/account" onClick={() => setOpen(false)}>👤 החשבון שלי</Link>
          <Link href="/account/trades" onClick={() => setOpen(false)}>🤝 העסקאות שלי</Link>
          {isAdmin ? <Link href="/admin/settings" onClick={() => setOpen(false)}>🛡️ ניהול</Link> : null}
          <form action={logoutToHomeAction}>
            <button type="submit" className="usermenu-logout">🚪 יציאה</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
