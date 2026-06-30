"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coverGradient, initialOf } from "@/lib/cover";

export type CardGenre = { slug: string; nameHe: string; emoji: string | null };
export type BrowseShow = {
  id: number;
  eventName: string;
  venueName: string;
  city: string | null;
  day: string;
  month: string;
  fromPriceAgorot: number | null;
  available: number;
  genres: CardGenre[];
  score: number;
};

function ils(a: number | null) {
  return a == null ? null : `₪${Math.round(a / 100).toLocaleString("he-IL")}`;
}

function ShowCard({ s }: { s: BrowseShow }) {
  const price = ils(s.fromPriceAgorot);
  return (
    <Link href={`/shows/${s.id}`} className="scard">
      <div className="cover" style={{ background: coverGradient(s.eventName) }}>
        <span className="ini">{initialOf(s.eventName)}</span>
        <span className="datechip">
          <span className="d">{s.day}</span>
          <br />
          <span className="m">{s.month}</span>
        </span>
        {s.available > 0 ? null : <span className="soldout">אזל</span>}
      </div>
      <div className="body">
        <span className="ev">{s.eventName}</span>
        <span className="vn">{s.venueName}{s.city ? ` · ${s.city}` : ""}</span>
        {s.genres.length > 0 ? (
          <div className="gtags">
            {s.genres.slice(0, 2).map((g) => (
              <span key={g.slug} className="gtag">{g.emoji} {g.nameHe}</span>
            ))}
          </div>
        ) : null}
        <div className="foot">
          {price ? (
            <span className="from">{price} <small>החל מ-</small></span>
          ) : (
            <span className="none">אין כרטיסים כרגע</span>
          )}
          {s.available > 0 ? <span className="muted" style={{ fontSize: 12 }}>{s.available} כרט'</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function BrowseClient({
  shows,
  recommended,
}: {
  shows: BrowseShow[];
  recommended: BrowseShow[];
}) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("הכל");

  const genreChips = useMemo(() => {
    const seen = new Map<string, CardGenre>();
    shows.forEach((s) => s.genres.forEach((g) => seen.set(g.slug, g)));
    return Array.from(seen.values());
  }, [shows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shows.filter((s) => {
      if (genre !== "הכל" && !s.genres.some((g) => g.slug === genre)) return false;
      if (needle && !`${s.eventName} ${s.venueName} ${s.city ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [shows, q, genre]);

  const showReco = genre === "הכל" && q.trim() === "" && recommended.length > 0;

  return (
    <>
      <div className="searchbar">
        <span className="ico">🔎</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש אמן, הופעה או אולם…" aria-label="חיפוש" />
      </div>

      <div className="cats">
        <button className={`cat ${genre === "הכל" ? "active" : ""}`} onClick={() => setGenre("הכל")}>🔥 הכל</button>
        {genreChips.map((g) => (
          <button key={g.slug} className={`cat ${genre === g.slug ? "active" : ""}`} onClick={() => setGenre(g.slug)}>
            {g.emoji} {g.nameHe}
          </button>
        ))}
      </div>

      {showReco ? (
        <>
          <div className="rowhead">מומלץ עבורך <span>🔥</span></div>
          <div className="bento" style={{ marginBottom: 26 }}>
            {recommended.map((s) => <ShowCard key={`r-${s.id}`} s={s} />)}
          </div>
          <div className="rowhead">כל ההופעות</div>
        </>
      ) : null}

      {filtered.length === 0 ? (
        <div className="card"><p className="empty">לא נמצאו הופעות תואמות 🤷</p></div>
      ) : (
        <div className="bento">
          {filtered.map((s) => <ShowCard key={s.id} s={s} />)}
        </div>
      )}
    </>
  );
}
