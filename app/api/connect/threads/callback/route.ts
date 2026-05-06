import { NextRequest, NextResponse } from "next/server";

const THREADS_OAUTH_STATE_COOKIE = "threads_oauth_state";
const SIXTY_DAYS = 60 * 60 * 24 * 60;

type ThreadsApiError = {
  error?: {
    message?: string;
  };
};

type ThreadsTokenResponse = ThreadsApiError & {
  access_token?: string;
  user_id?: string | number;
  expires_in?: number;
};

type ThreadsProfileResponse = ThreadsApiError & {
  id?: string | number;
  username?: string | null;
  threads_profile_picture_url?: string | null;
  threads_biography?: string | null;
};

function redirectWithThreadsStatus(
  appBaseUrl: string,
  params: Record<string, string>
) {
  const url = new URL(appBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(THREADS_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getThreadsErrorMessage(payload: ThreadsApiError, fallback: string) {
  return payload.error?.message ?? fallback;
}

async function fetchThreadsProfile(accessToken: string) {
  const url = new URL("https://graph.threads.net/v1.0/me");
  url.searchParams.set(
    "fields",
    "id,username,threads_profile_picture_url,threads_biography"
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as ThreadsProfileResponse;

  if (!res.ok) {
    return null;
  }

  return {
    id: json.id ? String(json.id) : null,
    username: json.username ?? null,
    profilePictureUrl: json.threads_profile_picture_url ?? null,
    biography: json.threads_biography ?? null,
  };
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const clientId = process.env.THREADS_APP_ID ?? process.env.META_APP_ID;
  const clientSecret = process.env.THREADS_APP_SECRET ?? process.env.META_APP_SECRET;
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const expectedState = req.cookies.get(THREADS_OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return redirectWithThreadsStatus(appBaseUrl, {
      threads_connected: "0",
      threads_error: errorDescription || error,
    });
  }

  if (!code) {
    return redirectWithThreadsStatus(appBaseUrl, {
      threads_connected: "0",
      threads_error: "Missing code in callback",
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithThreadsStatus(appBaseUrl, {
      threads_connected: "0",
      threads_error: "Invalid OAuth state",
    });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithThreadsStatus(appBaseUrl, {
      threads_connected: "0",
      threads_error: "Missing Threads env vars",
    });
  }

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });
  const tokenJson = (await tokenRes.json()) as ThreadsTokenResponse;

  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectWithThreadsStatus(appBaseUrl, {
      threads_connected: "0",
      threads_error: getThreadsErrorMessage(tokenJson, "Token exchange failed"),
    });
  }

  let accessToken = tokenJson.access_token;
  let expiresIn =
    typeof tokenJson.expires_in === "number" && tokenJson.expires_in > 0
      ? tokenJson.expires_in
      : SIXTY_DAYS;

  const longLivedUrl = new URL("https://graph.threads.net/access_token");
  longLivedUrl.searchParams.set("grant_type", "th_exchange_token");
  longLivedUrl.searchParams.set("client_secret", clientSecret);
  longLivedUrl.searchParams.set("access_token", accessToken);

  const longLivedRes = await fetch(longLivedUrl.toString(), { method: "GET" });
  const longLivedJson = (await longLivedRes.json()) as ThreadsTokenResponse;

  if (longLivedRes.ok && longLivedJson.access_token) {
    accessToken = longLivedJson.access_token;
    expiresIn =
      typeof longLivedJson.expires_in === "number" && longLivedJson.expires_in > 0
        ? longLivedJson.expires_in
        : expiresIn;
  }

  const profile = await fetchThreadsProfile(accessToken);

  const response = redirectWithThreadsStatus(appBaseUrl, {
    threads_connected: "1",
  });
  response.cookies.set(
    "threads_account",
    JSON.stringify({
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      profile,
      userId: profile?.id ?? (tokenJson.user_id ? String(tokenJson.user_id) : null),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(expiresIn, SIXTY_DAYS),
    }
  );

  return response;
}
