import Link from "next/link";
import { listActiveAds } from "@/db/ads";
import { FAKE_ADS } from "@/lib/fake-ads";

type RailAd = {
  key: string;
  title: string;
  sub: string;
  emoji: string;
  from: string;
  to: string;
  cta: string;
  href: string;
};

async function getAds(): Promise<RailAd[]> {
  try {
    const rows = await listActiveAds();
    if (rows.length > 0) {
      return rows.map((a) => ({
        key: `db-${a.id}`,
        title: a.title,
        sub: a.subtitle ?? "",
        emoji: a.emoji ?? "📣",
        from: a.colorFrom,
        to: a.colorTo,
        cta: a.cta ?? "לפרטים",
        href: a.href,
      }));
    }
  } catch {
    // the rail renders on every page — never let a DB issue break the site
  }
  return FAKE_ADS.map((a) => ({ key: a.id, title: a.title, sub: a.sub, emoji: a.emoji, from: a.from, to: a.to, cta: a.cta, href: a.href }));
}

/**
 * Global promo rail: fixed to the physical LEFT edge, scrolls top -> bottom.
 * Shown on wide screens only (body gets matching padding); hidden on mobile.
 */
export async function AdRail() {
  const list = await getAds();

  return (
    <aside className="adrail" aria-label="מבצעים ופרסומות">
      <div className="adrail-head">מבצעים 📣</div>
      <div className="adrail-viewport">
        {/* list duplicated for a seamless loop */}
        <div className="adrail-track">
          {[...list, ...list].map((a, i) => (
            <Link
              key={`${a.key}-${i}`}
              href={a.href}
              className="fakead"
              style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})` }}
              aria-hidden={i >= list.length}
            >
              <span className="promo">פרסומת</span>
              <span className="fa-emoji">{a.emoji}</span>
              <span className="fa-title">{a.title}</span>
              <span className="fa-sub">{a.sub}</span>
              <span className="fa-cta">{a.cta} →</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
