import "server-only";

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
const TOP_ARTISTS = "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term";
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

export async function getTopArtistGenres(accessToken: string): Promise<string[]> {
  const res = await fetch(TOP_ARTISTS, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`top artists failed: ${res.status}`);
  const json = (await res.json()) as { items: { genres: string[] }[] };
  return json.items.flatMap((a) => a.genres ?? []);
}

// map Spotify's granular English genre strings to our genre slugs
const RULES: { kw: string[]; slug: string }[] = [
  { kw: ["metal"], slug: "metal" },
  { kw: ["rock"], slug: "rock" },
  { kw: ["hip hop", "hip-hop", "rap", "trap"], slug: "hiphop" },
  { kw: ["jazz"], slug: "jazz" },
  { kw: ["classical", "orchestra", "baroque", "opera"], slug: "classical" },
  { kw: ["mizrahi", "mizrahit"], slug: "mizrahi" },
  { kw: ["hasidic", "jewish", "kabbalah", "nigun"], slug: "hasidic" },
  { kw: ["indie"], slug: "indie" },
  { kw: ["blues"], slug: "blues" },
  { kw: ["soul", "r&b", "rnb", "funk"], slug: "rnb" },
  { kw: ["house", "techno", "edm", "electro", "trance", "dance", "electronic"], slug: "electronic" },
  { kw: ["folk", "singer-songwriter"], slug: "folk" },
  { kw: ["world", "ethnic", "oriental"], slug: "world" },
  { kw: ["pop"], slug: "pop" },
];

/** Count our-slug weights from a list of Spotify genre strings. */
export function mapGenresToSlugCounts(spotifyGenres: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const g of spotifyGenres) {
    const low = g.toLowerCase();
    for (const rule of RULES) {
      if (rule.kw.some((k) => low.includes(k))) {
        counts.set(rule.slug, (counts.get(rule.slug) ?? 0) + 1);
      }
    }
  }
  return counts;
}
