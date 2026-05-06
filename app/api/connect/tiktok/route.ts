import { NextResponse } from "next/server";

const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";
const TEN_MINUTES = 60 * 10;
const DEFAULT_TIKTOK_SCOPES = "user.info.basic";

function getTikTokClientKey() {
  return process.env.TIKTOK_CLIENT_KEY ?? process.env.TIKTOK_CLIENT_ID;
}

export async function GET() {
  const clientKey = getTikTokClientKey();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  const scopes = process.env.TIKTOK_SCOPES ?? DEFAULT_TIKTOK_SCOPES;

  if (!clientKey || !redirectUri) {
    return NextResponse.json(
      { error: "Missing TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_ID or TIKTOK_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scopes,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  const response = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );

  response.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  return response;
}
