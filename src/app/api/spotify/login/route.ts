import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeUrl, redirectUri } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  const origin = new URL(req.url).origin;
  if (!session) return NextResponse.redirect(`${origin}/login`);

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(redirectUri(req), state));
  res.cookies.set("sp_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
