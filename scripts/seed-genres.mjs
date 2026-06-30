// Seed the music-genre catalog and tag existing events.
// Idempotent. Run: node --env-file=.env scripts/seed-genres.mjs  (DEV)
import pg from "pg";

const GENRES = [
  ["rock", "רוק", "🎸"],
  ["pop", "פופ", "🎤"],
  ["mizrahi", "מזרחי", "🪕"],
  ["hiphop", "היפ-הופ / ראפ", "🎧"],
  ["jazz", "ג'אז", "🎷"],
  ["classical", "קלאסי", "🎻"],
  ["electronic", "אלקטרוני", "🎛️"],
  ["folk", "שירי א\"י / פולק", "🌾"],
  ["hasidic", "חסידי / יהודי", "✡️"],
  ["indie", "אינדי", "🎶"],
  ["metal", "מטאל", "🤘"],
  ["blues", "בלוז", "🎼"],
  ["rnb", "ר&ב / סול", "💫"],
  ["world", "מוזיקת עולם", "🌍"],
  ["standup", "סטנדאפ / בידור", "🎭"],
];

// artist (events.artist) -> genre slugs
const MAP = {
  "עופר לוי": ["mizrahi", "pop"],
  "משינה": ["rock"],
  "אברהם פריד": ["hasidic"],
  "מארק אליהו": ["world", "classical"],
  "פול טראנק": ["rock", "blues"],
  "התזמורת התימנית": ["world", "mizrahi"],
  "שלום חנוך": ["rock"],
  'משה להב "הטיש הגדול"': ["hasidic"],
  "עברי לידר": ["pop"],
  "A Night of Dire Straits": ["rock"],
  "PARTY": ["pop"],
  "Moonlight": ["rock", "pop"],
  "יהודה פוליקר": ["rock", "world"],
  "גון בן ארי ומקהלת זולת": ["indie"],
  "אלון עדר": ["indie", "pop"],
  "אתניקס": ["rock", "mizrahi"],
  "רוקוויל": ["pop"],
  "סינגולדה וחברים": ["pop", "folk"],
  "סי היימן + התקווה 6": ["rock", "mizrahi"],
  "מאור כהן": ["rock", "indie"],
  "ארז נץ": ["rock"],
  "נורית גלרון": ["folk", "pop"],
  "יוני בלוך": ["indie", "rock"],
  "ברי סחרוף וטיפקס": ["rock", "indie"],
  "ישראל קטורזה": ["standup"],
  "הפרויקט של עידן רייכל": ["world", "folk"],
  "שלומי שבת & פבלו רוזנברג": ["mizrahi", "pop"],
  "Zusha (זושא)": ["world", "hasidic"],
  "רביד פלוטניק": ["hiphop"],
  "שלומי שבן": ["pop", "indie"],
  "דודו טסה": ["rock", "world"],
  "עומר אדם": ["mizrahi", "pop"],
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const c = await pool.connect();
try {
  // upsert genres
  const idBySlug = {};
  for (const [slug, nameHe, emoji] of GENRES) {
    const r = await c.query(
      `INSERT INTO genres(slug,name_he,emoji) VALUES($1,$2,$3)
       ON CONFLICT (slug) DO UPDATE SET name_he=EXCLUDED.name_he, emoji=EXCLUDED.emoji
       RETURNING id`,
      [slug, nameHe, emoji],
    );
    idBySlug[slug] = r.rows[0].id;
  }

  // tag events by artist
  const events = (await c.query("SELECT id, artist FROM events")).rows;
  let tagged = 0;
  for (const ev of events) {
    const slugs = MAP[ev.artist];
    if (!slugs) continue;
    for (const slug of slugs) {
      const gid = idBySlug[slug];
      await c.query(
        `INSERT INTO event_genres(event_id,genre_id) VALUES($1,$2)
         ON CONFLICT (event_id,genre_id) DO NOTHING`,
        [ev.id, gid],
      );
      tagged++;
    }
  }
  console.log(`genres: ${GENRES.length}, events tagged (links upserted): ${tagged}`);
} catch (e) {
  console.error("seed-genres failed:", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
