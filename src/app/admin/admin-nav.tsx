"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  { href: "/admin/settings", label: "עמלה 💸" },
  { href: "/admin/venues", label: "אולמות 🏟️" },
  { href: "/admin/events", label: "הופעות 🎤" },
  { href: "/admin/shows", label: "מופעים 📅" },
  { href: "/admin/listings", label: "כרטיסים 🎟️" },
  { href: "/admin/requests", label: "בקשות 🔎" },
  { href: "/admin/trades", label: "עסקאות 🤝" },
  { href: "/admin/users", label: "משתמשים 👥" },
  { href: "/admin/ads", label: "פרסומות 📣" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="subnav">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`chip ${pathname === t.href ? "active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
