import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/browse");

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">TixMatch</span>
        <h1 className="page-title">הצטרפות ל-TixMatch ✨</h1>
      </div>

      <div className="card">
        <RegisterForm />
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        כבר רשום? <a href="/login">כניסה →</a>
      </p>
    </main>
  );
}
