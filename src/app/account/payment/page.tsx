import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listCards } from "@/db/payments";
import { CardForm } from "./card-form";
import { verifyCardAction, deleteCardAction } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "ממתין לאימות",
  verified: "מאומת ✓",
  rejected: "נדחה",
  manual_review: "בבדיקה",
};

export default async function PaymentPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const cards = await listCards(user.id);

  return (
    <main className="container narrow">
      <div className="page-head">
        <Link href="/account" className="crumb">← החשבון שלי</Link>
        <h1 className="page-title">אמצעי תשלום 💳</h1>
      </div>

      <div className="card">
        <CardForm />
      </div>

      <div className="card">
        <p className="section-title">הכרטיסים שלי ({cards.length})</p>
        {cards.length === 0 ? (
          <p className="empty">עדיין לא הוספת כרטיס. הוסף כרטיס ואמת אותו כדי לקנות ולמכור.</p>
        ) : (
          <div className="list">
            {cards.map((c) => (
              <div key={c.id} className="list-item">
                <div className="meta">
                  <span className="title">{c.brand} •••• {c.last4}</span>
                  <span className="sub">{statusLabel[c.verificationStatus] ?? c.verificationStatus}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {c.verificationStatus !== "verified" ? (
                    <form action={verifyCardAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="chip">אימות ₪1</button>
                    </form>
                  ) : null}
                  <form action={deleteCardAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="chip danger">הסרה</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        💡 סליקת ₪1 מאמתת שמקור הכסף אמיתי. לפי האפיון, סכום זה חוזר במלואו למוכר,
        ולקונה הוא נגבה כדמי אימות.
      </p>
    </main>
  );
}
