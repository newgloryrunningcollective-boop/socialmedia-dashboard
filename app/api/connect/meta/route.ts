import { NextResponse } from "next/server";

const META_OAUTH_STATE_COOKIE = "meta_oauth_state";
const TEN_MINUTES = 60 * 10;
const DEFAULT_META_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
];

function getMetaScopes() {
  return process.env.META_SCOPES?.trim() || DEFAULT_META_SCOPES.join(",");
}

export async function GET() {
  const clientId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing META_APP_ID or META_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: getMetaScopes(),
    response_type: "code",
    auth_type: "rerequest",
  });

  const url = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  const response = NextResponse.redirect(url);

  response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  return response;
}
