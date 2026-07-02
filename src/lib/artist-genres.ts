// Spotify deprecated artist `genres` (empty for new apps since 2025), but artist
// NAMES are still returned. We derive granular genres from names: match against
// our events catalog (see affinity.ts) + this curated map of popular artists.

export function normalizeArtist(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// normalized name -> our granular genre slugs
export const STAR_ARTISTS: Record<string, string[]> = {
  // Israeli — mizrahi / pop
  "עומר אדם": ["mizrahi", "pop_il"], "omer adam": ["mizrahi", "pop_il"],
  "אייל גולן": ["mizrahi"], "eyal golan": ["mizrahi"],
  "משה פרץ": ["mizrahi"], "moshe peretz": ["mizrahi"],
  "שרית חדד": ["mizrahi"], "sarit hadad": ["mizrahi"],
  "עדן בן זקן": ["mizrahi"], "eden ben zaken": ["mizrahi"],
  "אושר כהן": ["mizrahi"], "osher cohen": ["mizrahi"],
  "עדן חסון": ["mizrahi", "pop_il"], "eden hason": ["mizrahi", "pop_il"],
  "שלומי שבת": ["mizrahi", "pop_il"], "נסרין קדרי": ["mizrahi"],
  // Israeli — pop / rock
  "נועה קירל": ["pop_il"], "noa kirel": ["pop_il"],
  "סטטיק ובן אל תבורי": ["pop_il", "hiphop_il"], "static & ben el": ["pop_il", "hiphop_il"], "static & ben el tavori": ["pop_il", "hiphop_il"],
  "שלמה ארצי": ["rock_il", "pop_il"], "shlomo artzi": ["rock_il", "pop_il"],
  "אביב גפן": ["rock_il"], "aviv geffen": ["rock_il"],
  "שלום חנוך": ["rock_il"], "כוורת": ["rock_il"], "משינה": ["rock_il"], "mashina": ["rock_il"],
  "אתניקס": ["rock_il", "mizrahi"], "יהודה פוליקר": ["rock_il", "world"],
  "דודו טסה": ["rock_il", "world"], "ברי סחרוף": ["rock_il"], "אהוד בנאי": ["rock_il", "folk_il"],
  "מוניקה סקס": ["rock_il"], "קפה שחור חזק": ["rock_il"], "היהודים": ["rock_il"],
  "אברהם טל": ["pop_il", "rock_il"], "ריטה": ["pop_il"], "רמי קלינשטיין": ["pop_il"],
  // Israeli — hip hop
  "הדג נחש": ["hiphop_il"], "hadag nahash": ["hiphop_il"],
  "טונה": ["hiphop_il"], "tuna": ["hiphop_il"], "פלד": ["hiphop_il"], "peled": ["hiphop_il"],
  "רביד פלוטניק": ["hiphop_il"], "נצ'י נצ'": ["hiphop_il"],
  // Israeli — world / folk
  "עידן רייכל": ["world", "folk_il"], "idan raichel": ["world", "folk_il"],
  "נורית גלרון": ["folk_il", "pop_il"],
  // Global — pop
  "ed sheeran": ["pop_intl"], "taylor swift": ["pop_intl"], "dua lipa": ["pop_intl", "electronic"],
  "billie eilish": ["pop_intl"], "ariana grande": ["pop_intl"], "justin bieber": ["pop_intl"],
  "coldplay": ["rock_intl", "pop_intl"], "imagine dragons": ["rock_intl", "pop_intl"], "maroon 5": ["pop_intl"],
  // Global — hip hop / r&b
  "drake": ["hiphop_intl"], "eminem": ["hiphop_intl"], "kendrick lamar": ["hiphop_intl"],
  "travis scott": ["hiphop_intl"], "kanye west": ["hiphop_intl"], "post malone": ["hiphop_intl", "pop_intl"],
  "the weeknd": ["rnb", "pop_intl"], "beyonce": ["rnb", "pop_intl"], "beyoncé": ["rnb", "pop_intl"],
  "rihanna": ["pop_intl", "rnb"], "sza": ["rnb"], "bruno mars": ["rnb", "pop_intl"],
  // Global — rock / metal
  "metallica": ["metal"], "iron maiden": ["metal"], "system of a down": ["metal"],
  "queen": ["rock_intl"], "ac/dc": ["rock_intl"], "guns n' roses": ["rock_intl"], "nirvana": ["rock_intl"],
  "red hot chili peppers": ["rock_intl"], "arctic monkeys": ["rock_intl", "indie"], "radiohead": ["rock_intl", "indie"],
  "pink floyd": ["rock_intl"], "the beatles": ["rock_intl"],
  // Global — electronic / jazz / reggae
  "david guetta": ["electronic"], "calvin harris": ["electronic"], "avicii": ["electronic"],
  "martin garrix": ["electronic"], "daft punk": ["electronic"], "the chainsmokers": ["electronic", "pop_intl"],
  "miles davis": ["jazz"], "john coltrane": ["jazz"], "louis armstrong": ["jazz"],
  "bob marley": ["reggae"],
};
