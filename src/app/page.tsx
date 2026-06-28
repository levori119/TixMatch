export default function Home() {
  return (
    <main className="container">
      <div className="brand">TixMix 🎟️</div>
      <div className="card">
        <p className="big">סחר הוגן בכרטיסי הופעות</p>
        <p className="muted">
          First Come, First Served — ללא עוקץ, עם escrow מאובטח.
        </p>
        <p style={{ marginTop: 24 }}>
          <a href="/admin/settings">מסך ניהול → עמלה</a>
        </p>
      </div>
    </main>
  );
}
