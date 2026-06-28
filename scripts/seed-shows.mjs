// Seed the catalog with the June–July 2026 shows.
// Idempotent: venues/events deduped by name, shows deduped by (event, venue, start).
// Notes are folded into the event name (the shows table has no note column).
// Run: node --env-file=.env scripts/seed-shows.mjs   (uses DEV DATABASE_URL)
import pg from "pg";

// [artist, venue, "dd.mm.yyyy", "HH:MM", note]
const ROWS = [
  ["עופר לוי", "זאפה הרצליה / מידטאון ת\"א", "29.06.2026", "21:30", ""],
  ["משינה", "אמפיתיאטרון קיסריה", "30.06.2026", "21:00", "חוגגים 40 שנות יצירה"],
  ["אברהם פריד", "בריכת הסולטן, ירושלים", "30.06.2026", "20:30", ""],
  ["מארק אליהו", "בנימינה", "30.06.2026", "21:00", ""],
  ["פול טראנק", "אמפי עומר", "01.07.2026", "20:30", "מארחים את רד בנד ושירה זלוף"],
  ["התזמורת התימנית", "היכל התרבות, תל אביב", "01.07.2026", "20:00", "מארחת את בועז שרעבי ושי צבר"],
  ["שלום חנוך", "אמפי מבשרת ציון", "01.07.2026", "21:00", "פסגת הרוק"],
  ["משה להב \"הטיש הגדול\"", "זאפה חיפה", "02.07.2026", "21:30", ""],
  ["עברי לידר", "זאפה אמפי שוני, בנימינה", "03.07.2026", "21:30", ""],
  ["A Night of Dire Straits", "זאפה חיפה", "03.07.2026", "21:30", "מופע מחווה"],
  ["PARTY", "זאפה הרצליה", "03.07.2026", "21:30", "להיטים הגדולים מכל הזמנים"],
  ["Moonlight", "זאפה הרצליה", "04.07.2026", "21:30", "מופע מחווה לקולדפליי"],
  ["יהודה פוליקר", "זאפה הרצליה", "06.07.2026", "21:30", ""],
  ["גון בן ארי ומקהלת זולת", "בארבי, יפו-תל אביב", "06.07.2026", "21:00", "פתיחת דלתות"],
  ["אלון עדר", "מערת צדקיהו, ירושלים", "09.07.2026", "21:00", "מארח את עלמה גוב"],
  ["אתניקס", "בארבי, יפו-תל אביב", "09.07.2026", "21:00", "\"רק אהבה תנצח\" (פתיחת דלתות)"],
  ["רוקוויל", "זאפה חיפה", "10.07.2026", "21:30", "מופע מחווה לג'ורג' מייקל"],
  ["סינגולדה וחברים", "זאפה הרצליה", "10.07.2026", "14:00", "מופע צהריים"],
  ["רוקוויל", "זאפה הרצליה", "16.07.2026", "21:30", "מופע מחווה לאבבא"],
  ["סי היימן + התקווה 6", "קיבוץ אפק", "17.07.2026", "13:00", "שני מופעים ברצף"],
  ["מאור כהן", "זאפה הרצליה", "17.07.2026", "14:00", "מופע צהריים (מארח את ירמי קפלן)"],
  ["ארז נץ", "זאפה הרצליה", "17.07.2026", "21:30", "נץ מנגן אגדות רוק"],
  ["נורית גלרון", "זאפה חיפה", "24.07.2026", "21:30", "מופע להקה"],
  ["יוני בלוך", "בארבי, יפו-תל אביב", "25.07.2026", "21:00", "מופע להקה (פתיחת דלתות)"],
  ["ברי סחרוף וטיפקס", "סיטי לייב, חולון", "28.07.2026", "21:00", "פסטיבל היין"],
  ["ישראל קטורזה", "זאפה הרצליה", "28.07.2026", "21:30", "סטנדאפ מיוחד לט\"ו באב"],
  ["הפרויקט של עידן רייכל", "אמפיתיאטרון קיסריה", "29.07.2026", "21:00", ""],
  ["שלומי שבת & פבלו רוזנברג", "סיטי לייב, חולון", "29.07.2026", "21:00", "פסטיבל היין"],
  ["Zusha (זושא)", "בארבי, יפו-תל אביב", "29.07.2026", "21:00", "מופע ט\"ו באב (פתיחת דלתות)"],
  ["רביד פלוטניק", "זאפה אמפי שוני, בנימינה", "30.07.2026", "21:30", ""],
  ["שלומי שבן", "מערת צדקיהו, ירושלים", "30.07.2026", "21:00", "סולו פסנתר"],
  ["דודו טסה", "בארבי, יפו-תל אביב", "31.07.2026", "21:00", ""],
];

function toIso(dmy, hm) {
  const [d, m, y] = dmy.split(".");
  return `${y}-${m}-${d}T${hm}:00+03:00`; // Israel summer time (IDT)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getOrCreateVenue(c, name) {
  const found = await c.query("SELECT id FROM venues WHERE name=$1", [name]);
  if (found.rows[0]) return found.rows[0].id;
  return (await c.query("INSERT INTO venues(name) VALUES($1) RETURNING id", [name])).rows[0].id;
}

async function getOrCreateEvent(c, name, artist) {
  const found = await c.query("SELECT id FROM events WHERE name=$1", [name]);
  if (found.rows[0]) return found.rows[0].id;
  return (await c.query("INSERT INTO events(name,artist) VALUES($1,$2) RETURNING id", [name, artist])).rows[0].id;
}

async function ensureShow(c, eventId, venueId, startsAt) {
  const found = await c.query(
    "SELECT id FROM shows WHERE event_id=$1 AND venue_id=$2 AND starts_at=$3",
    [eventId, venueId, startsAt],
  );
  if (found.rows[0]) return false;
  await c.query("INSERT INTO shows(event_id,venue_id,starts_at) VALUES($1,$2,$3)", [eventId, venueId, startsAt]);
  return true;
}

const c = await pool.connect();
let added = 0, skipped = 0;
try {
  for (const [artist, venue, dmy, hm, note] of ROWS) {
    const eventName = note ? `${artist} — ${note}` : artist;
    const venueId = await getOrCreateVenue(c, venue);
    const eventId = await getOrCreateEvent(c, eventName, artist);
    const created = await ensureShow(c, eventId, venueId, toIso(dmy, hm));
    created ? added++ : skipped++;
  }
  const counts = await c.query(
    "SELECT (SELECT count(*) FROM venues) v, (SELECT count(*) FROM events) e, (SELECT count(*) FROM shows) s",
  );
  console.log(`shows added: ${added}, already existed: ${skipped}`);
  console.log("totals:", counts.rows[0]);
} catch (e) {
  console.error("seed-shows failed:", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
