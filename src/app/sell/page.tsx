import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listShows } from "@/db/catalog";
import { ListingForm } from "@/app/_components/listing-form";
import { toShowOptions } from "@/lib/show-options";
import { createMyListingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const shows = await listShows();
  const showOptions = toShowOptions(shows);

  return (
    <main className="container narrow">
      <div className="page-head">
        <span className="crumb">TixMatch</span>
        <h1 className="page-title">מכירת כרטיס 🎫</h1>
      </div>

      <div className="card">
        <ListingForm
          action={createMyListingAction}
          shows={showOptions}
          title="פרטי הכרטיס"
          submitLabel="🚀 פרסום למכירה"
        />
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        💡 הכסף מהקונה יוחזק בנאמנות (escrow) וישוחרר אליך לאחר שהקונה יאשר קבלת הכרטיס.
        אימות הכרטיס הדיגיטלי מול המקור — בקרוב. <Link href="/account/listings">הכרטיסים שלי →</Link>
      </p>
    </main>
  );
}
