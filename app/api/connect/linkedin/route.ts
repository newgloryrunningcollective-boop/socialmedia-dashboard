import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PERSONAL_LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
];
const ORGANIZATION_LINKEDIN_SCOPES = [
  ...PERSONAL_LINKEDIN_SCOPES,
  "rw_organization_admin",
];

function getLinkedInScopes(mode: string | null) {
  if (mode === "organization") {
    return (
      process.env.LINKEDIN_ORGANIZATION_SCOPES?.trim() ||
      ORGANIZATION_LINKEDIN_SCOPES.join(" ")
    );
  }

  return process.env.LINKEDIN_PERSONAL_SCOPES?.trim() || PERSONAL_LINKEDIN_SCOPES.join(" ");
}

export async function GET(req: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const mode = req.nextUrl.searchParams.get("mode");

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
    scope: getLinkedInScopes(mode),
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
