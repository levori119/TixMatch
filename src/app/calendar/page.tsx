import Link from "next/link";
import { listShowsInRange, listUpcomingShows } from "@/db/public";
import { genresForEventIds } from "@/db/genres";
import { getAffinityMap } from "@/db/affinity";
import { currentUser } from "@/lib/auth";
import { coverGradient, initialOf } from "@/lib/cover";
import { CalendarView, type CalShow } from "./calendar-view";

export const dynamic = "force-dynamic";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function ym(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
function ils(a: number | null) {
  return a == null ? null : `₪${Math.round(a / 100).toLocaleString("he-IL")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let mIdx = now.getMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    year = y;
    mIdx = m - 1;
  }
  const from = new Date(year, mIdx, 1);
  const to = new Date(year, mIdx + 1, 1);
  const prev = new Date(year, mIdx - 1, 1);
  const next = new Date(year, mIdx + 1, 1);

  const [monthRows, upcoming, user] = await Promise.all([
    listShowsInRange(from, to),
    listUpcomingShows(),
    currentUser(),
  ]);

  const eventIds = Array.from(new Set([...monthRows, ...upcoming].map((r) => r.eventId)));
  const [genresByEvent, affinity] = await Promise.all([
    genresForEventIds(eventIds),
    user ? getAffinityMap(user.id) : Promise.resolve(new Map<number, number>()),
  ]);

  const shows: CalShow[] = monthRows.map((r) => {
    const d = new Date(r.startsAt);
    return {
      id: r.id,
      eventName: r.eventName,
      venueName: r.venueName,
      city: r.city,
      dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      dayNum: String(d.getDate()),
      weekday: d.toLocaleDateString("he-IL", { weekday: "short" }),
      timeStr: d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      fromPriceAgorot: r.fromPriceAgorot,
      available: Number(r.available),
      genres: (genresByEvent.get(r.eventId) ?? []).map((g) => ({ slug: g.slug, nameHe: g.nameHe, emoji: g.emoji })),
    };
  });

  // personalized ad banners: shows with tickets, ranked by the user's taste
  const withTickets = upcoming
    .filter((r) => r.fromPriceAgorot != null && Number(r.available) > 0)
    .map((r) => {
      const g = genresByEvent.get(r.eventId) ?? [];
      const score = g.reduce((sum, gg) => sum + (affinity.get(gg.id) ?? 0), 0);
      return { r, g, score };
    })
    .sort((a, b) => b.score - a.score || new Date(a.r.startsAt).getTime() - new Date(b.r.startsAt).getTime());

  // fallback so the sidebar is never empty: soonest upcoming shows
  const fallback = upcoming
    .slice(0, 5)
    .map((r) => ({ r, g: genresByEvent.get(r.eventId) ?? [], score: 0 }));

  const banners = (withTickets.length > 0 ? withTickets : fallback).slice(0, 5);
  const personalized = withTickets.length > 0 && banners.some((b) => b.score > 0);
  const adHead = withTickets.length > 0
    ? (personalized ? "🔥 מומלץ בשבילך" : "🎟️ כרטיסים חמים")
    : "🔜 הופעות קרובות";

  return (
    <main className="container">
      <div className="greet">
        <div className="hi">יומן ההופעות 📅</div>
        <div className="tag">{shows.length} הופעות ב{MONTHS[mIdx]} {year}</div>
      </div>

      <div className="cal-layout">
        <div className="cal-main">
          <CalendarView
            shows={shows}
            year={year}
            month={mIdx}
            monthLabel={`${MONTHS[mIdx]} ${year}`}
            prevMonth={ym(prev.getFullYear(), prev.getMonth())}
            nextMonth={ym(next.getFullYear(), next.getMonth())}
          />
        </div>

        <aside className="cal-side">
          <div className="adhead">{adHead}</div>
          <div className="bannerscroll">
            {/* duplicated for a seamless infinite marquee */}
            <div className="bannertrack">
              {[...banners, ...banners].map(({ r, g }, i) => {
                const price = ils(r.fromPriceAgorot);
                return (
                  <Link key={`${r.id}-${i}`} href={`/shows/${r.id}`} className="banner" aria-hidden={i >= banners.length}>
                    <div className="banner-cover" style={{ background: coverGradient(r.eventName) }}>
                      <span className="ini">{initialOf(r.eventName)}</span>
                      <span className="promo">מודעה</span>
                    </div>
                    <div className="banner-body">
                      <span className="ev">{r.eventName}</span>
                      <span className="vn">{r.venueName}{r.city ? ` · ${r.city}` : ""}</span>
                      {g.length > 0 ? <span className="gtag">{g[0].emoji} {g[0].nameHe}</span> : null}
                      <div className="banner-foot">
                        {price ? (
                          <span className="from">{price} <small>החל מ-</small></span>
                        ) : (
                          <span className="from" style={{ fontSize: 13, color: "var(--muted)" }}>בקרוב</span>
                        )}
                        <span className="cta">{price ? "כרטיסים →" : "פרטים →"}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
