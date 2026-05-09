import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const TIKTOK_AUTH_COOKIE = "tiktok_auth";
const TIKTOK_PUBLIC_PROFILE_CACHE_TTL = 120_000;
const DEFAULT_TIKTOK_PUBLIC_PROFILE_URLS = [
  "https://www.tiktok.com/@thijswijma",
  "https://www.tiktok.com/@new.glory.running",
];

const publicProfileCache = new Map<
  string,
  { fetchedAt: number; profile: TikTokPublicProfileMetric }
>();

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

type TikTokPublicVideoMetric = {
  id: string;
  description: string | null;
  createdAt: string | null;
  coverUrl: string | null;
  url: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
};

type TikTokPublicProfileMetric = {
  ok: boolean;
  source: "public";
  handle: string;
  url: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  verified: boolean;
  followerCount: number | null;
  followingCount: number | null;
  likeCount: number | null;
  videoCount: number | null;
  videos: TikTokPublicVideoMetric[];
  fetchedAt: string;
  message: string | null;
};

type TikTokUniversalData = {
  __DEFAULT_SCOPE__?: {
    "webapp.user-detail"?: {
      userInfo?: {
        user?: {
          uniqueId?: string;
          nickname?: string;
          avatarLarger?: string;
          avatarMedium?: string;
          avatarThumb?: string;
          signature?: string;
          verified?: boolean;
        };
        stats?: Record<string, unknown>;
        statsV2?: Record<string, unknown>;
        itemList?: TikTokUniversalItem[];
      };
      shareMeta?: {
        desc?: string;
      };
    };
  };
};

type TikTokUniversalItem = {
  id?: string;
  desc?: string;
  createTime?: string | number;
  video?: {
    cover?: string;
    dynamicCover?: string;
    originCover?: string;
  };
  author?: {
    uniqueId?: string;
  };
  stats?: Record<string, unknown>;
  statsV2?: Record<string, unknown>;
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

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const compactMatch = value
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^([\d.]+)\s*([kmb])?$/);
  if (!compactMatch) return null;

  const amount = Number(compactMatch[1]);
  if (!Number.isFinite(amount)) return null;

  const multiplier =
    compactMatch[2] === "k"
      ? 1_000
      : compactMatch[2] === "m"
        ? 1_000_000
        : compactMatch[2] === "b"
          ? 1_000_000_000
          : 1;

  return Math.round(amount * multiplier);
}

function statNumber(stats: Record<string, unknown> | undefined, key: string) {
  return parseNumber(stats?.[key]);
}

function normalizePublicProfileUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = trimmed.startsWith("@")
    ? `https://www.tiktok.com/${trimmed}`
    : trimmed;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const isTikTokHost = host === "tiktok.com" || host.endsWith(".tiktok.com");
    const handle = url.pathname.match(/\/@([^/?#]+)/)?.[1];
    if (!isTikTokHost || !handle) return null;

    return {
      handle: decodeURIComponent(handle).replace(/^@/, ""),
      url: `https://www.tiktok.com/@${decodeURIComponent(handle).replace(/^@/, "")}`,
    };
  } catch {
    return null;
  }
}

function getPublicProfileTargets(req: NextRequest) {
  const raw =
    req.nextUrl.searchParams.get("profiles") ??
    req.nextUrl.searchParams.get("publicProfiles") ??
    process.env.TIKTOK_PUBLIC_PROFILE_URLS ??
    DEFAULT_TIKTOK_PUBLIC_PROFILE_URLS.join(",");

  return Array.from(
    new Map(
      raw
        .split(/[\n,]+/)
        .map(normalizePublicProfileUrl)
        .filter((profile): profile is { handle: string; url: string } => Boolean(profile))
        .map((profile) => [profile.handle.toLowerCase(), profile])
    ).values()
  );
}

function extractUniversalData(html: string) {
  const match = html.match(
    /<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (!match?.[1]) return null;

  try {
    return JSON.parse(match[1]) as TikTokUniversalData;
  } catch {
    return null;
  }
}

function publicVideoFromItem(
  item: TikTokUniversalItem,
  handle: string
): TikTokPublicVideoMetric | null {
  if (!item.id) return null;
  const stats = item.statsV2 ?? item.stats;
  const createdAtNumber = parseNumber(item.createTime);
  const createdAt = createdAtNumber
    ? new Date(createdAtNumber * 1000).toISOString()
    : null;

  return {
    id: item.id,
    description: item.desc ?? null,
    createdAt,
    coverUrl: item.video?.cover ?? item.video?.dynamicCover ?? item.video?.originCover ?? null,
    url: `https://www.tiktok.com/@${item.author?.uniqueId ?? handle}/video/${item.id}`,
    viewCount: statNumber(stats, "playCount"),
    likeCount: statNumber(stats, "diggCount"),
    commentCount: statNumber(stats, "commentCount"),
    shareCount: statNumber(stats, "shareCount"),
  };
}

async function fetchPublicTikTokProfile(target: { handle: string; url: string }) {
  const cacheKey = target.url.toLowerCase();
  const cached = publicProfileCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < TIKTOK_PUBLIC_PROFILE_CACHE_TTL) {
    return cached.profile;
  }

  try {
    const res = await fetch(target.url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const html = await res.text();
    const data = extractUniversalData(html);
    const userDetail = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
    const userInfo = userDetail?.userInfo;
    const user = userInfo?.user;
    const stats = userInfo?.statsV2 ?? userInfo?.stats;
    const videos = (userInfo?.itemList ?? [])
      .map((item) => publicVideoFromItem(item, user?.uniqueId ?? target.handle))
      .filter((item): item is TikTokPublicVideoMetric => Boolean(item));

    const profile: TikTokPublicProfileMetric = {
      ok: Boolean(res.ok && user?.uniqueId),
      source: "public",
      handle: user?.uniqueId ?? target.handle,
      url: target.url,
      displayName: user?.nickname ?? null,
      avatarUrl: user?.avatarLarger ?? user?.avatarMedium ?? user?.avatarThumb ?? null,
      bio: user?.signature ?? null,
      verified: Boolean(user?.verified),
      followerCount: statNumber(stats, "followerCount"),
      followingCount: statNumber(stats, "followingCount"),
      likeCount: statNumber(stats, "heartCount") ?? statNumber(stats, "heart"),
      videoCount: statNumber(stats, "videoCount"),
      videos,
      fetchedAt: new Date().toISOString(),
      message: videos.length
        ? null
        : "Public profile stats were loaded. TikTok did not include recent videos in the public page HTML for this request.",
    };

    publicProfileCache.set(cacheKey, { fetchedAt: Date.now(), profile });
    return profile;
  } catch (error) {
    return {
      ok: false,
      source: "public" as const,
      handle: target.handle,
      url: target.url,
      displayName: null,
      avatarUrl: null,
      bio: null,
      verified: false,
      followerCount: null,
      followingCount: null,
      likeCount: null,
      videoCount: null,
      videos: [],
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Public TikTok profile fetch failed.",
    };
  }
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

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TIKTOK_AUTH_COOKIE)?.value;
  const publicTargets = getPublicProfileTargets(req);
  const publicProfiles = await Promise.all(publicTargets.map(fetchPublicTikTokProfile));

  if (!raw) {
    const hasPublicProfiles = publicProfiles.length > 0;
    return NextResponse.json(
      {
        ok: hasPublicProfiles,
        source: hasPublicProfiles ? "public" : "none",
        message: hasPublicProfiles
          ? "Using public TikTok profile pages. No TikTok API account is connected."
          : "No connected TikTok account found. Connect first or add public profile URLs.",
        publicProfiles,
      },
      { status: hasPublicProfiles ? 200 : 400 }
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
        publicProfiles,
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
    publicProfiles,
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
