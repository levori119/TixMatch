import Link from "next/link";
import { notFound } from "next/navigation";
import { getShow, getActiveListingsForShow } from "@/db/public";
import { genresForEventIds } from "@/db/genres";
import { recordShowSignal } from "@/db/affinity";
import { currentUser } from "@/lib/auth";
import { coverGradient } from "@/lib/cover";
import { BuyBox } from "./buy-box";

export const dynamic = "force-dynamic";

function ils(agorot: number | null) {
  if (agorot == null) return "—";
  return `₪${(agorot / 100).toLocaleString("he-IL")}`;
}

const priceTypeLabel: Record<string, string> = {
  at_cost: "מחיר עלות",
  above_cost: "מעל עלות",
  discount: "בהנחה",
};
const deliveryLabel: Record<string, string> = {
  digital: "דיגיטלי",
  physical: "פיזי",
};

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const showId = Number(id);
  if (!Number.isInteger(showId)) notFound();

  const show = await getShow(showId);
  if (!show) notFound();

  const listings = await getActiveListingsForShow(showId);
  const user = await currentUser();

  const genresByEvent = await genresForEventIds([show.eventId]);
  const showGenres = genresByEvent.get(show.eventId) ?? [];

  // record a taste signal (a view) for logged-in users
  if (user) await recordShowSignal(user.id, showId, 1);

  const fromPrice =
    listings.length > 0
      ? `₪${Math.min(...listings.map((l) => l.basePriceAgorot ?? Infinity)) / 100}`
      : "";

  const when = new Date(show.startsAt);

  return (
    <main className="container narrow">
      <Link href="/browse" className="crumb" style={{ display: "inline-block", marginTop: 8 }}>
        ← חזרה לגילוי
      </Link>

      <div className="show-hero" style={{ background: coverGradient(show.eventName) }}>
        <div className="cap">
          <h1>{show.eventName}</h1>
          <div className="meta-row">
            {show.artist ? <span className="metachip">🎤 {show.artist}</span> : null}
            <span className="metachip">📍 {show.venueName}{show.city ? `, ${show.city}` : ""}</span>
            <span className="metachip">
              📅 {when.toLocaleDateString("he-IL", { day: "numeric", month: "long" })} ·{" "}
              {when.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {showGenres.map((g) => (
              <span key={g.slug} className="metachip">{g.emoji} {g.nameHe}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title">היצע הכרטיסים ({listings.length})</p>
        {listings.length === 0 ? (
          <p className="empty">אין כרגע כרטיסים זמינים למופע זה.</p>
        ) : (
          <div className="list">
            {listings.map((l) => (
              <div key={l.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <div className="meta">
                  <span className="title">{ils(l.basePriceAgorot)} לכרטיס</span>
                  <span className="sub">
                    {l.quantityAvailable} זמינים · {priceTypeLabel[l.priceType]} ·{" "}
                    {deliveryLabel[l.deliveryType]} ·{" "}
                    {l.soldIndividually ? "ניתן בבודדים" : `מינ' ${l.minTicketsPerSale}`}
                  </span>
                  {l.tiers.length > 1 ? (
                    <span className="sub" style={{ marginTop: 4 }}>
                      🏷️ הנחת כמות:{" "}
                      {l.tiers
                        .filter((t) => t.minQty > 1)
                        .map((t) => `${ils(t.unitPriceAgorot)} מ-${t.minQty}+`)
                        .join(" · ")}
                    </span>
                  ) : null}
                  {l.note ? <span className="sub" style={{ marginTop: 4 }}>“{l.note}”</span> : null}
                  <span className="sub" style={{ marginTop: 4 }}>מוכר: {l.sellerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        {user ? (
          <BuyBox showId={showId} fromPrice={fromPrice} />
        ) : (
          <>
            <p className="section-title">רוצה לקנות?</p>
            <p className="muted" style={{ marginBottom: 14 }}>
              התחבר או הירשם כדי לשלוח בקשת קנייה ולהיכנס לתור ההוגן.
            </p>
            <div className="cta-row" style={{ justifyContent: "flex-start" }}>
              <Link href="/login" className="btn">כניסה</Link>
              <Link href="/register" className="btn ghost">הרשמה</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
