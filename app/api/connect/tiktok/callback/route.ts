import { NextRequest, NextResponse } from "next/server";

const TIKTOK_AUTH_COOKIE = "tiktok_auth";
const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";
const ONE_YEAR = 60 * 60 * 24 * 365;

type TikTokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  log_id?: string;
};

type TikTokTokenEnvelopeResponse = TikTokTokenResponse & {
  data?: TikTokTokenResponse;
  message?: string;
};

type StoredTikTokAuth = {
  openId: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

function getTikTokClientKey() {
  return process.env.TIKTOK_CLIENT_KEY ?? process.env.TIKTOK_CLIENT_ID;
}

function redirectWithTikTokStatus(
  appBaseUrl: string,
  params: Record<string, string>
) {
  const url = new URL(appBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getTikTokErrorMessage(fallback: string, payload: TikTokTokenResponse) {
  return payload.error_description ?? payload.error ?? fallback;
}

function unwrapTikTokTokenResponse(payload: TikTokTokenEnvelopeResponse) {
  return payload.data ?? payload;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const clientKey = getTikTokClientKey();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const expectedState = req.cookies.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return redirectWithTikTokStatus(appBaseUrl, {
      tiktok_connected: "0",
      tiktok_error: errorDescription || error,
    });
  }

  if (!code) {
    return redirectWithTikTokStatus(appBaseUrl, {
      tiktok_connected: "0",
      tiktok_error: "Missing code in callback",
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithTikTokStatus(appBaseUrl, {
      tiktok_connected: "0",
      tiktok_error: "Invalid OAuth state",
    });
  }

  if (!clientKey || !clientSecret || !redirectUri) {
    return redirectWithTikTokStatus(appBaseUrl, {
      tiktok_connected: "0",
      tiktok_error: "Missing TikTok env vars",
    });
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenJson = (await tokenRes.json()) as TikTokTokenEnvelopeResponse;
  const tokenData = unwrapTikTokTokenResponse(tokenJson);

  if (
    !tokenRes.ok ||
    !tokenData.access_token ||
    !tokenData.refresh_token ||
    !tokenData.open_id
  ) {
    return redirectWithTikTokStatus(appBaseUrl, {
      tiktok_connected: "0",
      tiktok_error: getTikTokErrorMessage("Token exchange failed", tokenData),
    });
  }

  const now = Date.now();
  const auth: StoredTikTokAuth = {
    openId: tokenData.open_id,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    scope: tokenData.scope ?? "",
    accessTokenExpiresAt: now + (tokenData.expires_in ?? 0) * 1000,
    refreshTokenExpiresAt: now + (tokenData.refresh_expires_in ?? ONE_YEAR) * 1000,
  };

  const response = redirectWithTikTokStatus(appBaseUrl, {
    tiktok_connected: "1",
  });

  response.cookies.set(TIKTOK_AUTH_COOKIE, JSON.stringify(auth), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: tokenData.refresh_expires_in ?? ONE_YEAR,
  });

  return response;
}
