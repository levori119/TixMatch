import { listUpcomingShows } from "@/db/public";
import { genresForEventIds } from "@/db/genres";
import { getAffinityMap, topGenres } from "@/db/affinity";
import { currentUser } from "@/lib/auth";
import { BrowseClient, type BrowseShow } from "./browse-client";

export const dynamic = "force-dynamic";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export default async function BrowsePage() {
  const [rows, user] = await Promise.all([listUpcomingShows(), currentUser()]);

  const eventIds = Array.from(new Set(rows.map((r) => r.eventId)));
  const [genresByEvent, affinity, faves] = await Promise.all([
    genresForEventIds(eventIds),
    user ? getAffinityMap(user.id) : Promise.resolve(new Map<number, number>()),
    user ? topGenres(user.id, 3) : Promise.resolve([]),
  ]);

  const shows: BrowseShow[] = rows.map((r) => {
    const d = new Date(r.startsAt);
    const g = genresByEvent.get(r.eventId) ?? [];
    const score = g.reduce((sum, gg) => sum + (affinity.get(gg.id) ?? 0), 0);
    return {
      id: r.id,
      eventName: r.eventName,
      venueName: r.venueName,
      city: r.city,
      day: String(d.getDate()),
      month: MONTHS[d.getMonth()],
      fromPriceAgorot: r.fromPriceAgorot,
      available: Number(r.available),
      genres: g.map((x) => ({ slug: x.slug, nameHe: x.nameHe, emoji: x.emoji })),
      score,
    };
  });

  const recommended = user
    ? shows.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6)
    : [];

  return (
    <main className="container">
      <div className="greet">
        <div className="hi">
          {user ? <>היי {user.displayName.split(" ")[0]} <span className="wave">👋</span></> : <>גלה הופעות <span className="wave">🎉</span></>}
        </div>
        <div className="tag">
          {faves.length > 0
            ? <>הטעם שלך: {faves.map((f) => `${f.emoji} ${f.nameHe}`).join(" · ")}</>
            : <>{shows.length} הופעות קרובות · מצא את הכרטיס שלך</>}
        </div>
      </div>

      <BrowseClient shows={shows} recommended={recommended} />
    </main>
  );
}
