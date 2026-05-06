import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

const DEFAULT_LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
  "rw_organization_admin",
  "r_liteprofile",
  "r_member_profileAnalytics",
  "r_1st_connections_size",
];

function getLinkedInScopes() {
  return process.env.LINKEDIN_SCOPES?.trim() || DEFAULT_LINKEDIN_SCOPES.join(" ");
}

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: getLinkedInScopes(),
  });

  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );

  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
