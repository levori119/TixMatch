import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin/settings");
  if (session) redirect("/browse");

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">TixMatch</span>
        <h1 className="page-title">כניסה 🔐</h1>
      </div>

      <div className="card">
        <LoginForm />
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        אין לך חשבון? <a href="/register">הרשמה →</a>
      </p>
    </main>
  );
}
