import { getSettings } from "@/db/settings";
import { CommissionForm } from "./commission-form";

// Always read fresh from the DB (config screen).
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  const percent = settings.commissionBps / 100;
  const fixedIls = settings.commissionFixedAgorot / 100;

  return (
    <main className="container">
      <div className="brand">TixMix · ניהול</div>

      <div className="card">
        <p className="big">עמלת המערכת</p>
        <p className="muted">
          העמלה הנוכחית: <strong>{percent}%</strong>
          {fixedIls > 0 ? <> + ₪{fixedIls} קבוע</> : null}
        </p>

        <div style={{ height: 12 }} />

        <CommissionForm defaultPercent={percent} defaultFixedIls={fixedIls} />

        <p className="hint" style={{ marginTop: 20 }}>
          עודכן לאחרונה:{" "}
          {new Date(settings.updatedAt).toLocaleString("he-IL")}
        </p>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        ⚠️ מסך זה עדיין אינו מוגן בהרשאות — הוספת אימות אדמין היא משימה פתוחה (CLAUDE.md §8).
      </p>
    </main>
  );
}
