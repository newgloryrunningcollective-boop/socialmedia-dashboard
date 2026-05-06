import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_OAUTH_STATE_COOKIE = "instagram_oauth_state";
const INSTAGRAM_OAUTH_PROFILE_COOKIE = "instagram_oauth_profile";
const TEN_MINUTES = 60 * 10;
const DEFAULT_INSTAGRAM_SCOPES = "instagram_business_basic";
const profileGroups = ["personal", "newglory"] as const;

type InstagramProfileGroup = (typeof profileGroups)[number];

function getInstagramClientId() {
  return process.env.INSTAGRAM_CLIENT_ID;
}

function getInstagramRedirectUri() {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/connect/instagram/callback`
  );
}

function getProfileGroup(value: string | null): InstagramProfileGroup {
  return profileGroups.includes(value as InstagramProfileGroup)
    ? (value as InstagramProfileGroup)
    : "personal";
}

export async function GET(req: NextRequest) {
  const clientId = getInstagramClientId();
  const redirectUri = getInstagramRedirectUri();
  const scopes = process.env.INSTAGRAM_SCOPES ?? DEFAULT_INSTAGRAM_SCOPES;
  const profileGroup = getProfileGroup(req.nextUrl.searchParams.get("profile"));

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_REDIRECT_URI. Use the Instagram App ID from Instagram API > API setup with Instagram login.",
      },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });

  const response = NextResponse.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`
  );

  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  response.cookies.set(INSTAGRAM_OAUTH_PROFILE_COOKIE, profileGroup, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  return response;
}
