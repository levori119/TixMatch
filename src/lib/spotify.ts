import "server-only";

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
export const SPOTIFY_SCOPE = "user-top-read";

function clientId() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID missing");
  return id;
}
function clientSecret() {
  const s = process.env.SPOTIFY_CLIENT_SECRET;
  if (!s) throw new Error("SPOTIFY_CLIENT_SECRET missing");
  return s;
}

/** Public origin of the incoming request (works locally and behind Railway proxy). */
export function originOf(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUri(req: Request): string {
  return `${originOf(req)}/api/spotify/callback`;
}

export function authorizeUrl(redirect: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: redirect,
    scope: SPOTIFY_SCOPE,
    state,
  });
  return `${AUTHORIZE}?${p.toString()}`;
}

export async function exchangeCode(code: string, redirect: string): Promise<string> {
  const basic = Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function sget<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

type Artist = { id: string; name?: string; genres?: string[] };
type Track = { artists?: { id: string; name?: string }[] };

export type SpotifyTaste = {
  artistCount: number;
  trackCount: number;
  genres: string[];
  artistNames: string[];
};

/**
 * Gather a rich taste signal: top artists across all time ranges + the artists
 * behind top tracks, then the full artist objects (which carry `genres`).
 */
export async function getSpotifyTaste(token: string): Promise<SpotifyTaste> {
  const genres: string[] = [];
  const names = new Set<string>();
  const artistIds = new Set<string>();
  let artistCount = 0;
  let trackCount = 0;

  for (const range of ["short_term", "medium_term", "long_term"]) {
    const a = await sget<{ items: Artist[] }>(`/me/top/artists?limit=50&time_range=${range}`, token);
    for (const art of a?.items ?? []) {
      artistCount++;
      (art.genres ?? []).forEach((g) => genres.push(g));
      if (art.name) names.add(art.name);
      if (art.id) artistIds.add(art.id);
    }
  }

  const t = await sget<{ items: Track[] }>(`/me/top/tracks?limit=50&time_range=medium_term`, token);
  for (const tr of t?.items ?? []) {
    trackCount++;
    for (const ar of tr.artists ?? []) {
      if (ar.name) names.add(ar.name);
      if (ar.id) artistIds.add(ar.id);
    }
  }

  // fetch full artist objects (name + any genres) in batches of 50
  const ids = Array.from(artistIds);
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const ar = await sget<{ artists: Artist[] }>(`/artists?ids=${batch.join(",")}`, token);
    for (const a of ar?.artists ?? []) {
      (a.genres ?? []).forEach((g) => genres.push(g));
      if (a.name) names.add(a.name);
    }
  }

  return { artistCount, trackCount, genres, artistNames: Array.from(names) };
}

// non-national genres (single slug)
const RULES: { kw: string[]; slug: string }[] = [
  { kw: ["metal"], slug: "metal" },
  { kw: ["jazz"], slug: "jazz" },
  { kw: ["classical", "orchestra", "baroque", "opera"], slug: "classical" },
  { kw: ["mizrahi", "mizrahit"], slug: "mizrahi" },
  { kw: ["hasidic", "jewish", "kabbalah", "nigun"], slug: "hasidic" },
  { kw: ["blues"], slug: "blues" },
  { kw: ["reggae", "dancehall", "ska"], slug: "reggae" },
  { kw: ["country"], slug: "country" },
  { kw: ["latin", "reggaeton", "salsa"], slug: "latin" },
  { kw: ["soul", "r&b", "rnb", "funk"], slug: "rnb" },
  { kw: ["house", "techno", "edm", "electro", "trance", "dance", "electronic"], slug: "electronic" },
  { kw: ["world", "ethnic", "oriental"], slug: "world" },
  { kw: ["indie", "alternative"], slug: "indie" },
];
// national genres — resolved to _il or _intl based on the string
const NATIONAL: { kw: string[]; base: string }[] = [
  { kw: ["rock"], base: "rock" },
  { kw: ["hip hop", "hip-hop", "rap", "trap"], base: "hiphop" },
  { kw: ["folk", "singer-songwriter"], base: "folk" },
  { kw: ["pop"], base: "pop" },
];

/** Count our-slug weights from a list of Spotify genre strings (best-effort). */
export function mapGenresToSlugCounts(spotifyGenres: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const inc = (s: string) => counts.set(s, (counts.get(s) ?? 0) + 1);
  for (const g of spotifyGenres) {
    const low = g.toLowerCase();
    const isIL = /israeli|hebrew|mizrahi/.test(low);
    for (const rule of RULES) if (rule.kw.some((k) => low.includes(k))) inc(rule.slug);
    for (const rule of NATIONAL) {
      if (rule.kw.some((k) => low.includes(k))) inc(`${rule.base}_${isIL ? "il" : "intl"}`);
    }
  }
  return counts;
}
