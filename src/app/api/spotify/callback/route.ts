import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { bumpAffinityBySlugs } from "@/db/affinity";
import { exchangeCode, getTopArtistGenres, mapGenresToSlugCounts, redirectUri } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const done = (status: string) => NextResponse.redirect(`${origin}/account?spotify=${status}`);

  const session = await getSession();
  if (!session) return NextResponse.redirect(`${origin}/login`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = req.headers.get("cookie")?.match(/sp_state=([^;]+)/)?.[1];

  if (error) return done("denied");
  if (!code || !state || !cookieState || state !== cookieState) return done("state");

  try {
    const token = await exchangeCode(code, redirectUri(req));
    const genres = await getTopArtistGenres(token);
    const counts = mapGenresToSlugCounts(genres);
    const touched = await bumpAffinityBySlugs(session.uid, counts);

    await db.insert(auditLog).values({
      actorId: session.uid,
      action: "spotify_import",
      entity: "user",
      entityId: String(session.uid),
      payload: { artistGenres: genres.length, genresTouched: touched },
    });

    const res = done(touched > 0 ? "ok" : "empty");
    res.cookies.delete("sp_state");
    return res;
  } catch (e) {
    console.error("spotify callback failed", e);
    return done("error");
  }
}
