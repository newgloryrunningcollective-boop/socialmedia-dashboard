import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_AUTH_COOKIE = "instagram_profiles";
const INSTAGRAM_OAUTH_STATE_COOKIE = "instagram_oauth_state";
const INSTAGRAM_OAUTH_PROFILE_COOKIE = "instagram_oauth_profile";
const ONE_WEEK = 60 * 60 * 24 * 7;
const SIXTY_DAYS = 60 * 60 * 24 * 60;
const profileGroups = ["personal", "newglory"] as const;

type InstagramProfileGroup = (typeof profileGroups)[number];

type StoredInstagramProfile = {
  profileGroup: InstagramProfileGroup;
  instagramUserId: string;
  accessToken: string;
  accessTokenExpiresAt: number | null;
  username: string | null;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  connectedAt: number;
};

type InstagramTokenResponse = {
  access_token?: string;
  user_id?: number | string;
  permissions?: string[];
  error_type?: string;
  code?: number;
  error_message?: string;
};

type InstagramLongLivedTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type InstagramProfileResponse = {
  id?: string;
  user_id?: string | number;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

function getInstagramClientId() {
  return process.env.INSTAGRAM_CLIENT_ID;
}

function getInstagramClientSecret() {
  return process.env.INSTAGRAM_CLIENT_SECRET;
}

function getInstagramRedirectUri() {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/connect/instagram/callback`
  );
}

function getProfileGroup(value: string | undefined): InstagramProfileGroup {
  return profileGroups.includes(value as InstagramProfileGroup)
    ? (value as InstagramProfileGroup)
    : "personal";
}

function redirectWithInstagramStatus(
  appBaseUrl: string,
  params: Record<string, string>
) {
  const url = new URL(appBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(INSTAGRAM_OAUTH_PROFILE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getInstagramErrorMessage(
  fallback: string,
  payload: InstagramTokenResponse | InstagramLongLivedTokenResponse | InstagramProfileResponse
) {
  if ("error_message" in payload && payload.error_message) return payload.error_message;
  if ("error" in payload && payload.error?.message) return payload.error.message;
  return fallback;
}

function parseStoredProfiles(raw: string | undefined) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<StoredInstagramProfile>[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (profile): profile is StoredInstagramProfile =>
            typeof profile.instagramUserId === "string" &&
            typeof profile.accessToken === "string" &&
            profileGroups.includes(profile.profileGroup as InstagramProfileGroup)
        )
      : [];
  } catch {
    return [];
  }
}

function upsertProfile(
  profiles: StoredInstagramProfile[],
  profile: StoredInstagramProfile
) {
  const withoutExisting = profiles.filter(
    (item) => item.profileGroup !== profile.profileGroup
  );
  return [profile, ...withoutExisting];
}

async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  return {
    ok: res.ok,
    data: (await res.json()) as InstagramTokenResponse,
  };
}

async function exchangeForLongLivedToken(
  accessToken: string,
  clientSecret: string
) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  return {
    ok: res.ok,
    data: (await res.json()) as InstagramLongLivedTokenResponse,
  };
}

async function fetchInstagramProfile(accessToken: string) {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set(
    "fields",
    "id,user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count"
  );
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  return {
    ok: res.ok,
    data: (await res.json()) as InstagramProfileResponse,
  };
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const clientId = getInstagramClientId();
  const clientSecret = getInstagramClientSecret();
  const redirectUri = getInstagramRedirectUri();
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const expectedState = req.cookies.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;
  const profileGroup = getProfileGroup(
    req.cookies.get(INSTAGRAM_OAUTH_PROFILE_COOKIE)?.value
  );

  if (error) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: errorDescription || error,
    });
  }

  if (!code) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: "Missing code in callback",
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: "Invalid OAuth state",
    });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error:
        "Missing Instagram env vars. Set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET from Instagram API > API setup with Instagram login.",
    });
  }

  const tokenResult = await exchangeCodeForToken(
    code,
    clientId,
    clientSecret,
    redirectUri
  );

  if (!tokenResult.ok || !tokenResult.data.access_token) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: getInstagramErrorMessage(
        "Instagram token exchange failed",
        tokenResult.data
      ),
    });
  }

  const longLivedTokenResult = await exchangeForLongLivedToken(
    tokenResult.data.access_token,
    clientSecret
  );
  const now = Date.now();
  const accessToken =
    longLivedTokenResult.ok && longLivedTokenResult.data.access_token
      ? longLivedTokenResult.data.access_token
      : tokenResult.data.access_token;
  const accessTokenExpiresAt =
    longLivedTokenResult.ok && longLivedTokenResult.data.expires_in
      ? now + longLivedTokenResult.data.expires_in * 1000
      : null;

  const profileResult = await fetchInstagramProfile(accessToken);
  if (!profileResult.ok) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: getInstagramErrorMessage(
        "Fetching Instagram profile failed",
        profileResult.data
      ),
    });
  }

  const profile = profileResult.data;
  const instagramUserId =
    typeof profile.user_id === "string"
      ? profile.user_id
      : typeof profile.user_id === "number"
        ? String(profile.user_id)
        : profile.id ?? String(tokenResult.data.user_id ?? "");

  if (!instagramUserId) {
    return redirectWithInstagramStatus(appBaseUrl, {
      instagram_connected: "0",
      instagram_profile: profileGroup,
      instagram_error: "Instagram profile did not include a user id",
    });
  }

  const storedProfile: StoredInstagramProfile = {
    profileGroup,
    instagramUserId,
    accessToken,
    accessTokenExpiresAt,
    username: profile.username ?? null,
    name: profile.name ?? null,
    accountType: profile.account_type ?? null,
    profilePictureUrl: profile.profile_picture_url ?? null,
    followersCount:
      typeof profile.followers_count === "number" ? profile.followers_count : null,
    followsCount:
      typeof profile.follows_count === "number" ? profile.follows_count : null,
    mediaCount: typeof profile.media_count === "number" ? profile.media_count : null,
    connectedAt: now,
  };

  const profiles = upsertProfile(
    parseStoredProfiles(req.cookies.get(INSTAGRAM_AUTH_COOKIE)?.value),
    storedProfile
  );

  const response = redirectWithInstagramStatus(appBaseUrl, {
    instagram_connected: "1",
    instagram_profile: profileGroup,
    instagram_username: profile.username ?? "",
  });

  response.cookies.set(INSTAGRAM_AUTH_COOKIE, JSON.stringify(profiles), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(
      accessTokenExpiresAt
        ? Math.max(0, Math.floor((accessTokenExpiresAt - now) / 1000))
        : ONE_WEEK,
      SIXTY_DAYS
    ),
  });

  return response;
}
