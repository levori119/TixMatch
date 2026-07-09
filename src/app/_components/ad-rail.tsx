import Link from "next/link";
import { FAKE_ADS } from "@/lib/fake-ads";

/**
 * Global promo rail: fixed to the physical LEFT edge, scrolls top -> bottom.
 * Shown on wide screens only (body gets matching padding); hidden on mobile.
 */
export function AdRail() {
  return (
    <aside className="adrail" aria-label="מבצעים ופרסומות">
      <div className="adrail-head">מבצעים 📣</div>
      <div className="adrail-viewport">
        {/* list duplicated for a seamless loop */}
        <div className="adrail-track">
          {[...FAKE_ADS, ...FAKE_ADS].map((a, i) => (
            <Link
              key={`${a.id}-${i}`}
              href={a.href}
              className="fakead"
              style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})` }}
              aria-hidden={i >= FAKE_ADS.length}
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
