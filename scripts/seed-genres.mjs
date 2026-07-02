// Rebuild the (granular) music-genre catalog and re-tag events.
// NOTE: this RESETS the taxonomy — it clears user taste profiles and event tags,
// then re-inserts genres and re-tags events. Users should re-import (Spotify) after.
// Run: node --env-file=.env scripts/seed-genres.mjs
import pg from "pg";

const GENRES = [
  ["rock_il", "רוק ישראלי", "🎸"],
  ["rock_intl", "רוק לועזי", "🎸"],
  ["metal", "מטאל", "🤘"],
  ["indie", "אינדי / אלטרנטיבי", "🎶"],
  ["pop_il", "פופ ישראלי", "🎤"],
  ["pop_intl", "פופ לועזי", "🎤"],
  ["mizrahi", "מזרחי", "🪕"],
  ["hiphop_il", "היפ-הופ ישראלי", "🎧"],
  ["hiphop_intl", "היפ-הופ / ראפ לועזי", "🎧"],
  ["electronic", "אלקטרוני / EDM", "🎛️"],
  ["jazz", "ג'אז", "🎷"],
  ["classical", "קלאסי", "🎻"],
  ["folk_il", "שירי ארץ ישראל", "🌾"],
  ["folk_intl", "פולק לועזי", "🪗"],
  ["rnb", "ר&ב / סול", "💫"],
  ["reggae", "רגאיי", "🌴"],
  ["world", "מוזיקת עולם", "🌍"],
  ["hasidic", "חסידי / יהודי", "✡️"],
  ["blues", "בלוז", "🎼"],
  ["country", "קאנטרי", "🤠"],
  ["latin", "לטיני", "💃"],
  ["standup", "סטנדאפ / בידור", "🎭"],
];

// artist (events.artist) -> granular genre slugs
const MAP = {
  "עופר לוי": ["mizrahi", "pop_il"],
  "משינה": ["rock_il"],
  "אברהם פריד": ["hasidic"],
  "מארק אליהו": ["world", "classical"],
  "פול טראנק": ["rock_il", "blues"],
  "התזמורת התימנית": ["world", "mizrahi"],
  "שלום חנוך": ["rock_il"],
  'משה להב "הטיש הגדול"': ["hasidic"],
  "עברי לידר": ["pop_il"],
  "A Night of Dire Straits": ["rock_intl"],
  "PARTY": ["pop_intl"],
  "Moonlight": ["rock_intl", "pop_intl"],
  "יהודה פוליקר": ["rock_il", "world"],
  "גון בן ארי ומקהלת זולת": ["indie"],
  "אלון עדר": ["indie", "pop_il"],
  "אתניקס": ["rock_il", "mizrahi"],
  "רוקוויל": ["pop_intl"],
  "סינגולדה וחברים": ["pop_il", "folk_il"],
  "סי היימן + התקווה 6": ["rock_il", "reggae", "mizrahi"],
  "מאור כהן": ["rock_il", "indie"],
  "ארז נץ": ["rock_il"],
  "נורית גלרון": ["folk_il", "pop_il"],
  "יוני בלוך": ["indie", "rock_il"],
  "ברי סחרוף וטיפקס": ["rock_il", "indie"],
  "ישראל קטורזה": ["standup"],
  "הפרויקט של עידן רייכל": ["world", "folk_il"],
  "שלומי שבת & פבלו רוזנברג": ["mizrahi", "pop_il"],
  "Zusha (זושא)": ["world", "hasidic"],
  "רביד פלוטניק": ["hiphop_il"],
  "שלומי שבן": ["pop_il", "indie"],
  "דודו טסה": ["rock_il", "world"],
  "עומר אדם": ["mizrahi", "pop_il"],
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  // reset taxonomy (order matters for FKs)
  await c.query("DELETE FROM user_genre_affinity");
  await c.query("DELETE FROM event_genres");
  await c.query("DELETE FROM genres");

  const idBySlug = {};
  for (const [slug, nameHe, emoji] of GENRES) {
    const r = await c.query("INSERT INTO genres(slug,name_he,emoji) VALUES($1,$2,$3) RETURNING id", [slug, nameHe, emoji]);
    idBySlug[slug] = r.rows[0].id;
  }

  const events = (await c.query("SELECT id, artist FROM events")).rows;
  let tagged = 0;
  for (const ev of events) {
    const slugs = MAP[ev.artist];
    if (!slugs) continue;
    for (const slug of slugs) {
      const gid = idBySlug[slug];
      if (!gid) continue;
      await c.query("INSERT INTO event_genres(event_id,genre_id) VALUES($1,$2) ON CONFLICT (event_id,genre_id) DO NOTHING", [ev.id, gid]);
      tagged++;
    }
  }
  await c.query("COMMIT");
  console.log(`genres: ${GENRES.length}, event-genre links: ${tagged} (taste profiles reset)`);
} catch (e) {
  await c.query("ROLLBACK");
  console.error("seed-genres failed:", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
