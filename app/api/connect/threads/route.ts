import { NextResponse } from "next/server";

const THREADS_OAUTH_STATE_COOKIE = "threads_oauth_state";
const TEN_MINUTES = 60 * 10;
const DEFAULT_THREADS_SCOPES = [
  "threads_basic",
  "threads_manage_insights",
];

function getThreadsScopes() {
  return process.env.THREADS_SCOPES?.trim() || DEFAULT_THREADS_SCOPES.join(",");
}

export async function GET() {
  const clientId = process.env.THREADS_APP_ID ?? process.env.META_APP_ID;
  const redirectUri = process.env.THREADS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing THREADS_APP_ID/META_APP_ID or THREADS_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: getThreadsScopes(),
    response_type: "code",
  });

  const response = NextResponse.redirect(
    `https://threads.net/oauth/authorize?${params.toString()}`
  );

  response.cookies.set(THREADS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  return response;
}
