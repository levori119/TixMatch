import Link from "next/link";
import { notFound } from "next/navigation";
import { getShow, getActiveListingsForShow } from "@/db/public";

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

  return (
    <main className="container narrow">
      <div className="page-head">
        <Link href="/browse" className="crumb">← חזרה לכל הכרטיסים</Link>
        <h1 className="page-title">{show.eventName}</h1>
        <p className="muted">
          {[show.artist].filter(Boolean).join("")}
          {show.artist ? " · " : ""}
          {show.venueName}
          {show.city ? `, ${show.city}` : ""} ·{" "}
          {new Date(show.startsAt).toLocaleString("he-IL", {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
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
                <span className="price-badge">בקרוב: קנייה</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        💡 מנגנון הקנייה (בקשה + תור First-Come-First-Served) בבנייה — זהו השלב הבא.
      </p>
    </main>
  );
}
