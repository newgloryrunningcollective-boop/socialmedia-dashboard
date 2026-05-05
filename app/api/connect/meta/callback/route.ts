import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const errorReason = req.nextUrl.searchParams.get("error_reason");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${appBaseUrl}?meta_connected=0&meta_error=${encodeURIComponent(
        errorDescription || errorReason || error
      )}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appBaseUrl}?meta_connected=0&meta_error=${encodeURIComponent(
        "Missing code in callback"
      )}`
    );
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${appBaseUrl}?meta_connected=0&meta_error=${encodeURIComponent(
        "Missing META env vars"
      )}`
    );
  }

  // 1) code -> user access token
  const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(
      `${appBaseUrl}?meta_connected=0&meta_error=${encodeURIComponent(
        "Token exchange failed"
      )}`
    );
  }

  const accessToken = tokenJson.access_token as string;

  // 2) Get pages + linked IG business account
  const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");
  pagesUrl.searchParams.set("access_token", accessToken);
  pagesUrl.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}"
  );

  const pagesRes = await fetch(pagesUrl.toString(), { method: "GET" });
  const pagesJson = await pagesRes.json();

  if (!pagesRes.ok) {
    return NextResponse.redirect(
      `${appBaseUrl}?meta_connected=0&meta_error=${encodeURIComponent(
        "Fetching pages failed"
      )}`
    );
  }

  const compact = encodeURIComponent(
    JSON.stringify(
      (pagesJson?.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        ig: p.instagram_business_account?.username ?? null,
      }))
    )
  );

  return NextResponse.redirect(`${appBaseUrl}?meta_connected=1&pages=${compact}`);
}