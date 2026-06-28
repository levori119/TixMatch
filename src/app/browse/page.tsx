import Link from "next/link";
import { listOpenShows } from "@/db/public";

export const dynamic = "force-dynamic";

function ils(agorot: number | null) {
  if (agorot == null) return "—";
  return `₪${Math.round(agorot / 100).toLocaleString("he-IL")}`;
}

export default async function BrowsePage() {
  const shows = await listOpenShows();

  return (
    <main className="container">
      <div className="page-head">
        <span className="crumb">TixMix</span>
        <h1 className="page-title">כרטיסים זמינים 🎟️</h1>
      </div>

      {shows.length === 0 ? (
        <div className="card">
          <p className="empty">אין כרגע כרטיסים למכירה. בקרוב יהיו 🎶</p>
        </div>
      ) : (
        <div className="grid">
          {shows.map((s) => (
            <Link key={s.id} href={`/shows/${s.id}`} className="card showcard">
              <div className="pill">{s.city ?? "—"}</div>
              <h3>{s.eventName}</h3>
              <p className="muted" style={{ margin: "4px 0 14px" }}>
                {s.venueName} ·{" "}
                {new Date(s.startsAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <div className="showcard-foot">
                <span className="price-badge">החל מ-{ils(s.fromPriceAgorot)}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {s.available} כרטיסים
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
