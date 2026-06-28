import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logoutToHomeAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="container narrow">
        <div className="page-head">
          <span className="crumb">TixMix</span>
          <h1 className="page-title">החשבון שלי 👤</h1>
        </div>
        <div className="card">
          <p className="empty">אינך מחובר.</p>
          <div className="cta-row" style={{ justifyContent: "flex-start" }}>
            <Link href="/login" className="btn">כניסה</Link>
            <Link href="/register" className="btn ghost">הרשמה</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">TixMix</span>
        <h1 className="page-title">החשבון שלי 👤</h1>
      </div>

      <div className="card">
        <p className="big">{user.displayName}</p>
        <p className="muted">{user.email}</p>
        <p className="muted">סוג חשבון: {user.role === "admin" ? "מנהל 🛡️" : "לקוח"}</p>

        <div className="cta-row" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <Link href="/account/payment" className="btn ghost">אמצעי תשלום 💳</Link>
          <Link href="/sell" className="btn ghost">מכירת כרטיס</Link>
          <Link href="/account/listings" className="btn ghost">הכרטיסים שלי</Link>
          <Link href="/account/requests" className="btn ghost">הבקשות שלי</Link>
          <Link href="/account/trades" className="btn ghost">העסקאות שלי (קנייה)</Link>
          <Link href="/account/sales" className="btn ghost">המכירות שלי</Link>
          {user.role === "admin" ? (
            <Link href="/admin/settings" className="btn ghost">מסך ניהול</Link>
          ) : null}
          <form action={logoutToHomeAction}>
            <button type="submit" className="btn ghost">יציאה</button>
          </form>
        </div>
      </div>
    </main>
  );
}
