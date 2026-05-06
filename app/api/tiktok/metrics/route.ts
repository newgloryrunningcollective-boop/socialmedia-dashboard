import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TIKTOK_AUTH_COOKIE = "tiktok_auth";

type StoredTikTokAuth = {
  openId: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      open_id?: string;
      union_id?: string;
      avatar_url?: string;
      display_name?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type TikTokVideoListResponse = {
  data?: {
    videos?: Array<{
      id?: string;
      title?: string;
      video_description?: string;
      duration?: number;
      cover_image_url?: string;
      share_url?: string;
      embed_link?: string;
    }>;
    cursor?: number;
    has_more?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

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

const ONE_YEAR = 60 * 60 * 24 * 365;

function hasTikTokScope(scope: string, requiredScope: string) {
  return scope
    .split(",")
    .map((item) => item.trim())
    .includes(requiredScope);
}

function getTikTokClientKey() {
  return process.env.TIKTOK_CLIENT_KEY ?? process.env.TIKTOK_CLIENT_ID;
}

function parseStoredAuth(raw: string): StoredTikTokAuth | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTikTokAuth>;
    if (
      typeof parsed.openId !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.accessTokenExpiresAt !== "number"
    ) {
      return null;
    }

    return {
      openId: parsed.openId,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      scope: typeof parsed.scope === "string" ? parsed.scope : "",
      accessTokenExpiresAt: parsed.accessTokenExpiresAt,
      refreshTokenExpiresAt:
        typeof parsed.refreshTokenExpiresAt === "number"
          ? parsed.refreshTokenExpiresAt
          : 0,
    };
  } catch {
    return null;
  }
}

function unwrapTikTokTokenResponse(payload: TikTokTokenEnvelopeResponse) {
  return payload.data ?? payload;
}

async function refreshTikTokAuth(auth: StoredTikTokAuth) {
  const clientKey = getTikTokClientKey();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return {
      ok: false,
      message: "Missing TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_ID or TIKTOK_CLIENT_SECRET",
      auth,
    };
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
  });

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenJson = (await res.json()) as TikTokTokenEnvelopeResponse;
  const tokenData = unwrapTikTokTokenResponse(tokenJson);

  if (
    !res.ok ||
    !tokenData.access_token ||
    !tokenData.refresh_token ||
    !tokenData.open_id
  ) {
    return {
      ok: false,
      message:
        tokenData.error_description ??
        tokenData.error ??
        "TikTok token refresh failed.",
      auth,
    };
  }

  const now = Date.now();
  return {
    ok: true,
    auth: {
      openId: tokenData.open_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      scope: tokenData.scope ?? auth.scope,
      accessTokenExpiresAt: now + (tokenData.expires_in ?? 0) * 1000,
      refreshTokenExpiresAt:
        now + (tokenData.refresh_expires_in ?? ONE_YEAR) * 1000,
    },
  };
}

async function fetchTikTokUserInfo(accessToken: string) {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return {
    ok: res.ok,
    data: (await res.json()) as TikTokUserInfoResponse,
  };
}

async function fetchTikTokVideos(accessToken: string) {
  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set(
    "fields",
    "id,title,video_description,duration,cover_image_url,share_url,embed_link"
  );

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: 20 }),
  });
  return {
    ok: res.ok,
    data: (await res.json()) as TikTokVideoListResponse,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TIKTOK_AUTH_COOKIE)?.value;

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "No connected TikTok account found. Connect first." },
      { status: 400 }
    );
  }

  let auth = parseStoredAuth(raw);
  if (!auth) {
    return NextResponse.json(
      { ok: false, message: "Invalid TikTok auth cookie." },
      { status: 400 }
    );
  }

  if (Date.now() >= auth.accessTokenExpiresAt) {
    const refreshResult = await refreshTikTokAuth(auth);
    if (!refreshResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: refreshResult.message,
          openId: auth.openId,
        },
        { status: 401 }
      );
    }
    auth = refreshResult.auth;
  }

  const canReadVideos = hasTikTokScope(auth.scope, "video.list");
  const [profile, videos] = await Promise.all([
    fetchTikTokUserInfo(auth.accessToken),
    canReadVideos ? fetchTikTokVideos(auth.accessToken) : Promise.resolve(null),
  ]);

  const response = NextResponse.json({
    ok: profile.ok && (videos?.ok ?? true),
    source: "cookie",
    openId: auth.openId,
    scope: auth.scope,
    accessTokenExpiresAt: auth.accessTokenExpiresAt,
    profile: profile.data,
    videos: videos?.data ?? null,
    videosMessage: canReadVideos
      ? null
      : "TikTok video.list scope is not connected for this account.",
  });

  response.cookies.set(TIKTOK_AUTH_COOKIE, JSON.stringify(auth), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((auth.refreshTokenExpiresAt - Date.now()) / 1000)),
  });

  return response;
}
