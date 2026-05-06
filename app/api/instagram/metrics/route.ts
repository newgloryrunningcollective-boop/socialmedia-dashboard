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

type InstagramMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type InstagramMediaResponse = {
  data?: InstagramMedia[];
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

async function fetchInstagramMedia(accessToken: string) {
  const fullFields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
  const basicFields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";

  async function requestMedia(fields: string) {
    const url = new URL("https://graph.instagram.com/me/media");
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", "6");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    return {
      ok: res.ok,
      data: (await res.json()) as InstagramMediaResponse,
    };
  }

  const fullResult = await requestMedia(fullFields);
  if (fullResult.ok) {
    return {
      ok: true,
      media: fullResult.data.data ?? [],
      message: null,
    };
  }

  const basicResult = await requestMedia(basicFields);
  if (basicResult.ok) {
    return {
      ok: true,
      media: basicResult.data.data ?? [],
      message:
        "Post previews loaded. Engagement counts require additional Instagram permissions.",
    };
  }

  return {
    ok: false,
    media: [],
    message:
      fullResult.data.error?.message ??
      basicResult.data.error?.message ??
      "Instagram media refresh failed.",
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

function sanitizeMedia(media: InstagramMedia[]) {
  return media.map((item) => ({
    id: item.id ?? "",
    caption: item.caption ?? null,
    mediaType: item.media_type ?? null,
    mediaUrl: item.media_url ?? null,
    permalink: item.permalink ?? null,
    thumbnailUrl: item.thumbnail_url ?? null,
    timestamp: item.timestamp ?? null,
    likeCount: typeof item.like_count === "number" ? item.like_count : null,
    commentsCount:
      typeof item.comments_count === "number" ? item.comments_count : null,
  }));
}

function toStoredProfile(profile: StoredInstagramProfile): StoredInstagramProfile {
  return {
    profileGroup: profile.profileGroup,
    instagramUserId: profile.instagramUserId,
    accessToken: profile.accessToken,
    accessTokenExpiresAt: profile.accessTokenExpiresAt,
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

  const refreshedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      const refreshedProfile = await fetchInstagramProfile(profile);
      const mediaResult = refreshedProfile.ok
        ? await fetchInstagramMedia(refreshedProfile.accessToken)
        : {
            ok: false,
            media: [],
            message:
              "message" in refreshedProfile
                ? refreshedProfile.message
                : "Instagram profile refresh failed.",
          };

      return {
        cookieProfile: toStoredProfile(refreshedProfile),
        responseProfile: {
          ...sanitizeProfile(refreshedProfile),
          media: sanitizeMedia(mediaResult.media),
          mediaMessage: mediaResult.message,
        },
      };
    })
  );
  const now = Date.now();
  const cookieMaxAge = Math.min(
    ...profiles.map((profile) =>
      profile.accessTokenExpiresAt
        ? Math.max(0, Math.floor((profile.accessTokenExpiresAt - now) / 1000))
        : SIXTY_DAYS
    )
  );

  const response = NextResponse.json({
    ok: refreshedProfiles.every((profile) => profile.responseProfile.ok),
    source: "cookie",
    count: refreshedProfiles.length,
    profiles: refreshedProfiles.map((profile) => profile.responseProfile),
  });

  response.cookies.set(INSTAGRAM_AUTH_COOKIE, JSON.stringify(refreshedProfiles.map((profile) => profile.cookieProfile)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge,
  });

  return response;
}
