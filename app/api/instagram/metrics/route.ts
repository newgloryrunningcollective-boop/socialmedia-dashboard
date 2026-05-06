import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const INSTAGRAM_AUTH_COOKIE = "instagram_profiles";
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

async function fetchInstagramProfile(profile: StoredInstagramProfile) {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set(
    "fields",
    "id,user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count"
  );
  url.searchParams.set("access_token", profile.accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramProfileResponse;

  if (!res.ok) {
    return {
      ...profile,
      ok: false,
      message: data.error?.message ?? "Instagram profile refresh failed.",
    };
  }

  return {
    ...profile,
    ok: true,
    instagramUserId:
      typeof data.user_id === "string"
        ? data.user_id
        : typeof data.user_id === "number"
          ? String(data.user_id)
          : data.id ?? profile.instagramUserId,
    username: data.username ?? profile.username,
    name: data.name ?? profile.name,
    accountType: data.account_type ?? profile.accountType,
    profilePictureUrl: data.profile_picture_url ?? profile.profilePictureUrl,
    followersCount:
      typeof data.followers_count === "number"
        ? data.followers_count
        : profile.followersCount,
    followsCount:
      typeof data.follows_count === "number" ? data.follows_count : profile.followsCount,
    mediaCount:
      typeof data.media_count === "number" ? data.media_count : profile.mediaCount,
  };
}

function sanitizeProfile(
  profile: Awaited<ReturnType<typeof fetchInstagramProfile>>
) {
  return {
    ok: profile.ok,
    message: "message" in profile ? profile.message : undefined,
    profileGroup: profile.profileGroup,
    instagramUserId: profile.instagramUserId,
    username: profile.username,
    name: profile.name,
    accountType: profile.accountType,
    profilePictureUrl: profile.profilePictureUrl,
    followersCount: profile.followersCount,
    followsCount: profile.followsCount,
    mediaCount: profile.mediaCount,
    connectedAt: profile.connectedAt,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(INSTAGRAM_AUTH_COOKIE)?.value;
  const profiles = parseStoredProfiles(raw);

  if (!profiles.length) {
    return NextResponse.json(
      { ok: false, message: "No connected Instagram accounts found. Connect first." },
      { status: 400 }
    );
  }

  const refreshedProfiles = await Promise.all(profiles.map(fetchInstagramProfile));
  const now = Date.now();
  const cookieMaxAge = Math.min(
    ...profiles.map((profile) =>
      profile.accessTokenExpiresAt
        ? Math.max(0, Math.floor((profile.accessTokenExpiresAt - now) / 1000))
        : SIXTY_DAYS
    )
  );

  const response = NextResponse.json({
    ok: refreshedProfiles.every((profile) => profile.ok),
    source: "cookie",
    count: refreshedProfiles.length,
    profiles: refreshedProfiles.map(sanitizeProfile),
  });

  response.cookies.set(INSTAGRAM_AUTH_COOKIE, JSON.stringify(refreshedProfiles), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });

  return response;
}
