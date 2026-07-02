// Seed a rich "market" for ONE show: several sellers, different prices and
// different quantity-tier groups (bulk discounts). Idempotent per show.
// Run: node --env-file=.env scripts/seed-market.mjs
import pg from "pg";

// seller display name -> listing spec. tiers: [minQty, unitPriceAgorot][]
const SPECS = [
  { seller: "עברי", qty: 2, min: 1, sold: true, note: "יציע, שורה 3", tiers: [[1, 25000]] },
  { seller: "עלמה", qty: 4, min: 1, sold: true, note: "צמוד לבמה", tiers: [[1, 28000], [4, 24000]] },
  { seller: "מירב", qty: 6, min: 2, sold: false, note: "לקבוצות", tiers: [[1, 22000], [3, 20000], [6, 18000]] },
  { seller: "נועה", qty: 2, min: 1, sold: true, note: "מרכז האולם", tiers: [[1, 30000], [2, 27000]] },
  { seller: "רומי", qty: 3, min: 1, sold: true, note: "", tiers: [[1, 19500], [2, 18500]] },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();
try {
  const show = (await c.query(
    "SELECT s.id, e.name FROM shows s JOIN events e ON e.id=s.event_id WHERE s.starts_at > now() ORDER BY s.starts_at LIMIT 1",
  )).rows[0];
  if (!show) throw new Error("no upcoming show");

  const existing = (await c.query("SELECT count(*)::int n FROM listings WHERE show_id=$1 AND status='active'", [show.id])).rows[0].n;
  if (existing >= 5) {
    console.log(`show "${show.name}" already has ${existing} listings — skipping.`);
    process.exit(0);
  }

  const admin = (await c.query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1")).rows[0].id;
  let added = 0;
  for (const spec of SPECS) {
    const u = (await c.query("SELECT id FROM users WHERE lower(display_name)=lower($1) LIMIT 1", [spec.seller])).rows[0];
    const seller = u ? u.id : admin;
    const l = (await c.query(
      `INSERT INTO listings(seller_id,show_id,note,delivery_type,price_type,quantity_total,quantity_available,sold_individually,min_tickets_per_sale)
       VALUES($1,$2,$3,'digital','above_cost',$4,$4,$5,$6) RETURNING id`,
      [seller, show.id, spec.note || null, spec.qty, spec.sold, spec.min],
    )).rows[0];
    for (const [minQty, price] of spec.tiers) {
      await c.query("INSERT INTO listing_price_tiers(listing_id,min_qty,unit_price_agorot) VALUES($1,$2,$3)", [l.id, minQty, price]);
    }
    added++;
  }
  console.log(`show "${show.name}" (id ${show.id}): added ${added} listings from ${added} sellers with varied price tiers.`);
} catch (e) {
  console.error("seed-market failed:", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
