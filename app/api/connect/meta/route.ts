import { NextResponse } from "next/server";

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
    scope: "public_profile,pages_show_list,pages_read_engagement",
    response_type: "code",
  });

  const url = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  return NextResponse.redirect(url);
}