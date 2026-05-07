import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const INSTAGRAM_AUTH_COOKIE = "instagram_profiles";
const META_PAGES_COOKIE = "meta_pages";
const SIXTY_DAYS = 60 * 60 * 24 * 60;
const INSTAGRAM_GRAPH_ORIGIN = "https://graph.instagram.com";
const FACEBOOK_GRAPH_ORIGIN = "https://graph.facebook.com/v20.0";
const MEDIA_FETCH_LIMIT = 100;
const MEDIA_RETURN_LIMIT = 24;
const MEDIA_INSIGHTS_LIMIT = 18;
const profileGroups = ["personal", "newglory"] as const;

type InstagramProfileGroup = (typeof profileGroups)[number];
type InstagramContentSource = "owned" | "owned_with_collaborators" | "collaborator" | "tagged" | "story";

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

type StoredPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string | null;
  igUsername: string | null;
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
  error?: InstagramApiError;
};

type InstagramApiError = {
  message?: string;
  type?: string;
  code?: number;
};

type InstagramMediaOwner = {
  id?: string | number;
  username?: string;
};

type InstagramCollaborator = {
  id?: string | number;
  username?: string;
  status?: string;
  invite_status?: string;
};

type InstagramMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
  owner?: InstagramMediaOwner | string | number;
  like_count?: number;
  comments_count?: number;
  view_count?: number;
  is_shared_to_feed?: boolean;
  sourceType?: InstagramContentSource;
  collaborators?: InstagramCollaborator[];
  insights?: InstagramMediaInsightSummary | null;
};

type InstagramMediaResponse = {
  data?: InstagramMedia[];
  error?: InstagramApiError;
};

type InstagramCollaboratorsResponse = {
  data?: InstagramCollaborator[];
  error?: InstagramApiError;
};

type InstagramInsight = {
  name?: string;
  period?: string;
  values?: Array<{
    value?: number | Record<string, unknown>;
    end_time?: string;
  }>;
  total_value?: number | {
    value?: number | Record<string, unknown>;
  };
};

type InstagramInsightsResponse = {
  data?: InstagramInsight[];
  error?: InstagramApiError;
};

type InstagramMediaInsightSummary = {
  views: number | null;
  reach: number | null;
  interactions: number | null;
  shares: number | null;
  saves: number | null;
  plays: number | null;
  impressions: number | null;
};

type InstagramProfileInsightSummary = {
  rangeStart: string;
  rangeEnd: string;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  accountsEngaged: number | null;
  profileViews: number | null;
  follows: number | null;
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

function parseStoredPages(raw: string | undefined) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPage>[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (page): page is StoredPage =>
            typeof page.pageId === "string" &&
            typeof page.pageName === "string" &&
            typeof page.pageAccessToken === "string" &&
            (page.igBusinessId === null || typeof page.igBusinessId === "string") &&
            (page.igUsername === null || typeof page.igUsername === "string")
        )
      : [];
  } catch {
    return [];
  }
}

function findMetaPageForProfile(
  pages: StoredPage[],
  profile: StoredInstagramProfile
) {
  const username = profile.username?.toLowerCase();
  if (!username) return null;

  return (
    pages.find((page) => page.igUsername?.toLowerCase() === username) ?? null
  );
}

function getLastThirtyFullDays() {
  const untilDate = new Date();
  untilDate.setUTCHours(0, 0, 0, 0);

  const sinceDate = new Date(untilDate);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 30);

  return {
    since: Math.floor(sinceDate.getTime() / 1000),
    until: Math.floor(untilDate.getTime() / 1000),
    rangeStart: sinceDate.toISOString(),
    rangeEnd: new Date(untilDate.getTime() - 1).toISOString(),
  };
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumNumericObject(value: Record<string, unknown> | undefined, preferredKey?: string) {
  if (!value) return null;

  const preferred = preferredKey ? toNumber(value[preferredKey]) : null;
  if (preferred !== null) return preferred;

  const numbers = Object.values(value)
    .map(toNumber)
    .filter((item): item is number => item !== null);
  return numbers.length ? numbers.reduce((sum, item) => sum + item, 0) : null;
}

function readInsightTotal(insight: InstagramInsight | undefined, preferredKey?: string) {
  if (!insight) return null;

  if (typeof insight.total_value === "number") return insight.total_value;
  if (insight.total_value && typeof insight.total_value === "object") {
    const total = insight.total_value.value;
    if (typeof total === "number") return total;
    if (total && typeof total === "object") return sumNumericObject(total, preferredKey);
  }

  const values = insight.values ?? [];
  const total = values.reduce((sum, item) => {
    const value = item.value;
    if (typeof value === "number") return sum + value;
    if (value && typeof value === "object") {
      return sum + (sumNumericObject(value, preferredKey) ?? 0);
    }
    return sum;
  }, 0);

  return values.length ? total : null;
}

function findInsightValue(
  insights: InstagramInsight[],
  names: string[],
  preferredKey?: string
) {
  for (const name of names) {
    const value = readInsightTotal(
      insights.find((insight) => insight.name === name),
      preferredKey
    );
    if (value !== null) return value;
  }

  return null;
}

function normalizeOwnerId(owner: InstagramMedia["owner"]) {
  if (!owner) return null;
  if (typeof owner === "string") return owner;
  if (typeof owner === "number") return String(owner);
  if (typeof owner.id === "number") return String(owner.id);
  return owner.id ?? null;
}

function normalizeOwnerUsername(owner: InstagramMedia["owner"]) {
  if (!owner || typeof owner !== "object") return null;
  return owner.username ?? null;
}

function normalizeMediaId(media: InstagramMedia) {
  return typeof media.id === "string" && media.id.length > 0 ? media.id : null;
}

function inferSourceType(
  media: InstagramMedia,
  profile: StoredInstagramProfile,
  fallback: InstagramContentSource = "owned"
): InstagramContentSource {
  if (media.sourceType) return media.sourceType;
  if (media.media_product_type === "STORY") return "story";

  const ownerId = normalizeOwnerId(media.owner);
  const ownerUsername = normalizeOwnerUsername(media.owner) ?? media.username ?? null;
  const currentUsername = profile.username?.toLowerCase() ?? null;
  const hasCollaborators = Boolean(media.collaborators?.length);

  if (
    ownerUsername &&
    currentUsername &&
    ownerUsername.toLowerCase() !== currentUsername
  ) {
    return "collaborator";
  }
  if (
    ownerUsername &&
    currentUsername &&
    ownerUsername.toLowerCase() === currentUsername
  ) {
    return hasCollaborators ? "owned_with_collaborators" : fallback === "tagged" ? "owned" : fallback;
  }
  if (ownerId && ownerId !== profile.instagramUserId && fallback !== "owned") {
    return "collaborator";
  }

  return hasCollaborators ? "owned_with_collaborators" : fallback;
}

async function fetchInstagramProfile(profile: StoredInstagramProfile) {
  const url = new URL(`${INSTAGRAM_GRAPH_ORIGIN}/me`);
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

async function requestMediaEdge(
  edge: "media" | "stories" | "tags",
  accessToken: string,
  fields: string,
  instagramUserId?: string
) {
  const path =
    edge === "media"
      ? "me/media"
      : edge === "stories"
        ? "me/stories"
        : `${instagramUserId ?? "me"}/tags`;
  const url = new URL(`${INSTAGRAM_GRAPH_ORIGIN}/${path}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(edge === "media" ? MEDIA_FETCH_LIMIT : MEDIA_RETURN_LIMIT));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  return {
    ok: res.ok,
    data: (await res.json()) as InstagramMediaResponse,
  };
}

async function fetchMediaCollection(
  edge: "media" | "stories" | "tags",
  accessToken: string,
  instagramUserId?: string
) {
  const richFields =
    "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,username,owner,like_count,comments_count,view_count,is_shared_to_feed";
  const standardFields =
    "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,username,owner,like_count,comments_count";
  const basicFields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";

  for (const fields of [richFields, standardFields, basicFields]) {
    const result = await requestMediaEdge(edge, accessToken, fields, instagramUserId);
    if (result.ok) {
      return {
        ok: true,
        media: result.data.data ?? [],
        message: null,
      };
    }

    if (edge === "tags" && instagramUserId) {
      const meResult = await requestMediaEdge(edge, accessToken, fields);
      if (meResult.ok) {
        return {
          ok: true,
          media: meResult.data.data ?? [],
          message: null,
        };
      }
    }
  }

  const fallback = await requestMediaEdge(edge, accessToken, basicFields, instagramUserId);
  return {
    ok: false,
    media: [],
    message: fallback.data.error?.message ?? `Instagram ${edge} refresh failed.`,
  };
}

async function requestMetaMediaEdge(
  page: StoredPage,
  edge: "tags" | "mentioned_media",
  fields: string
) {
  if (!page.igBusinessId) {
    return {
      ok: false,
      data: { data: [] } as InstagramMediaResponse,
    };
  }

  const url = new URL(`${FACEBOOK_GRAPH_ORIGIN}/${page.igBusinessId}/${edge}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(MEDIA_RETURN_LIMIT));
  url.searchParams.set("access_token", page.pageAccessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  return {
    ok: res.ok,
    data: (await res.json()) as InstagramMediaResponse,
  };
}

async function fetchMetaMediaCollection(
  page: StoredPage | null,
  edge: "tags" | "mentioned_media"
) {
  if (!page?.igBusinessId) {
    return {
      ok: false,
      media: [],
      message:
        "Contributor posts need the Instagram account to be linked to its managing Page.",
    };
  }

  const richFields =
    "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,username,owner{id,username},like_count,comments_count";
  const basicFields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username";

  for (const fields of [richFields, basicFields]) {
    const result = await requestMetaMediaEdge(page, edge, fields);
    if (result.ok) {
      return {
        ok: true,
        media: result.data.data ?? [],
        message: null,
      };
    }
  }

  const fallback = await requestMetaMediaEdge(page, edge, basicFields);
  return {
    ok: false,
    media: [],
    message:
      fallback.data.error?.message ??
      "Contributor posts need tagged-media access for this Instagram account.",
  };
}

async function fetchInstagramCollaborators(mediaId: string, accessToken: string) {
  const url = new URL(`${INSTAGRAM_GRAPH_ORIGIN}/${mediaId}/collaborators`);
  url.searchParams.set("fields", "id,username,status,invite_status");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramCollaboratorsResponse;
  return res.ok ? data.data ?? [] : [];
}

async function fetchInsights(
  path: string,
  accessToken: string,
  metric: string,
  params: Record<string, string> = {}
) {
  const url = new URL(`${INSTAGRAM_GRAPH_ORIGIN}/${path}/insights`);
  url.searchParams.set("metric", metric);
  url.searchParams.set("access_token", accessToken);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramInsightsResponse;

  return {
    ok: res.ok,
    data,
  };
}

async function fetchSingleInsightMetric(
  path: string,
  accessToken: string,
  metric: string,
  params: Record<string, string>
) {
  const withTotalValue = await fetchInsights(path, accessToken, metric, {
    ...params,
    metric_type: "total_value",
  });
  if (withTotalValue.ok) return withTotalValue.data.data ?? [];

  const withoutMetricType = await fetchInsights(path, accessToken, metric, params);
  return withoutMetricType.ok ? withoutMetricType.data.data ?? [] : [];
}

async function fetchInstagramProfileInsights(accessToken: string) {
  const range = getLastThirtyFullDays();
  const params = {
    period: "day",
    since: String(range.since),
    until: String(range.until),
  };

  const metricNames = [
    "views",
    "reach",
    "total_interactions",
    "accounts_engaged",
    "profile_views",
    "follows_and_unfollows",
  ];
  const insights = (
    await Promise.all(
      metricNames.map((metric) =>
        fetchSingleInsightMetric("me", accessToken, metric, params)
      )
    )
  ).flat();

  const legacyInsights = insights.length
    ? []
    : (
        await Promise.all(
          ["impressions", "reach", "profile_views", "follower_count"].map((metric) =>
            fetchSingleInsightMetric("me", accessToken, metric, params)
          )
        )
      ).flat();
  const allInsights = [...insights, ...legacyInsights];

  return {
    summary: {
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      views: findInsightValue(allInsights, ["views", "impressions"]),
      reach: findInsightValue(allInsights, ["reach"]),
      interactions: findInsightValue(allInsights, ["total_interactions"]),
      accountsEngaged: findInsightValue(allInsights, ["accounts_engaged"]),
      profileViews: findInsightValue(allInsights, ["profile_views"]),
      follows: findInsightValue(
        allInsights,
        ["follows_and_unfollows", "follower_count"],
        "follows"
      ),
    } satisfies InstagramProfileInsightSummary,
    message: allInsights.length
      ? null
      : "Instagram insights require instagram_business_manage_insights permission and available account insights data.",
  };
}

async function fetchInstagramMediaInsights(mediaId: string, accessToken: string) {
  const primary = await fetchInsights(mediaId, accessToken, "views,total_interactions,reach,shares,saved,likes,comments");
  const secondary = await fetchInsights(mediaId, accessToken, "plays,video_views,impressions,engagement");
  const insights = [
    ...(primary.ok ? primary.data.data ?? [] : []),
    ...(secondary.ok ? secondary.data.data ?? [] : []),
  ];

  if (!insights.length) return null;

  return {
    views: findInsightValue(insights, ["views", "video_views", "plays", "impressions"]),
    reach: findInsightValue(insights, ["reach"]),
    interactions: findInsightValue(insights, ["total_interactions", "engagement"]),
    shares: findInsightValue(insights, ["shares"]),
    saves: findInsightValue(insights, ["saved", "saves"]),
    plays: findInsightValue(insights, ["plays", "video_views"]),
    impressions: findInsightValue(insights, ["impressions"]),
  } satisfies InstagramMediaInsightSummary;
}

async function enrichMediaForDashboard(
  media: InstagramMedia[],
  profile: StoredInstagramProfile,
  accessToken: string
) {
  const mediaToEnrich = media.slice(0, MEDIA_INSIGHTS_LIMIT);
  const enriched = await Promise.all(
    mediaToEnrich.map(async (item) => {
      const mediaId = normalizeMediaId(item);
      if (!mediaId) return item;

      const [collaborators, insights] = await Promise.all([
        fetchInstagramCollaborators(mediaId, accessToken),
        fetchInstagramMediaInsights(mediaId, accessToken),
      ]);

      return {
        ...item,
        collaborators,
        insights,
      };
    })
  );

  return [...enriched, ...media.slice(MEDIA_INSIGHTS_LIMIT)];
}

function dedupeMedia(media: InstagramMedia[]) {
  const seen = new Set<string>();
  return media.filter((item) => {
    const id = normalizeMediaId(item);
    if (!id) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function countInRange(media: InstagramMedia[], rangeStart: string, rangeEnd: string) {
  const start = new Date(rangeStart).getTime();
  const end = new Date(rangeEnd).getTime();

  return media.filter((item) => {
    const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : null;
    return timestamp !== null && timestamp >= start && timestamp <= end;
  }).length;
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

function sanitizeCollaborators(collaborators: InstagramCollaborator[] | undefined) {
  return (collaborators ?? []).map((item) => ({
    id:
      typeof item.id === "number"
        ? String(item.id)
        : typeof item.id === "string"
          ? item.id
          : null,
    username: item.username ?? null,
    status: item.status ?? item.invite_status ?? null,
  }));
}

function sanitizeMedia(media: InstagramMedia[], profile: StoredInstagramProfile) {
  return media.slice(0, MEDIA_RETURN_LIMIT).map((item) => {
    const sourceType = inferSourceType(item, profile);
    const insights = item.insights ?? null;

    return {
      id: item.id ?? "",
      caption: item.caption ?? null,
      mediaType: item.media_type ?? null,
      mediaProductType:
        item.media_product_type ?? (sourceType === "story" ? "STORY" : null),
      mediaUrl: item.media_url ?? null,
      permalink: item.permalink ?? null,
      thumbnailUrl: item.thumbnail_url ?? null,
      timestamp: item.timestamp ?? null,
      username: item.username ?? null,
      ownerId: normalizeOwnerId(item.owner),
      ownerUsername: normalizeOwnerUsername(item.owner) ?? item.username ?? null,
      sourceType,
      isSharedToFeed:
        typeof item.is_shared_to_feed === "boolean" ? item.is_shared_to_feed : null,
      likeCount: typeof item.like_count === "number" ? item.like_count : null,
      commentsCount:
        typeof item.comments_count === "number" ? item.comments_count : null,
      viewCount: typeof item.view_count === "number" ? item.view_count : null,
      insightViews: insights?.views ?? null,
      insightReach: insights?.reach ?? null,
      insightInteractions: insights?.interactions ?? null,
      insightShares: insights?.shares ?? null,
      insightSaves: insights?.saves ?? null,
      insightPlays: insights?.plays ?? null,
      insightImpressions: insights?.impressions ?? null,
      collaborators: sanitizeCollaborators(item.collaborators),
    };
  });
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
  const rawMetaPages = cookieStore.get(META_PAGES_COOKIE)?.value;
  const profiles = parseStoredProfiles(raw);
  const metaPages = parseStoredPages(rawMetaPages);

  if (!profiles.length) {
    return NextResponse.json(
      { ok: false, message: "No connected Instagram accounts found. Connect first." },
      { status: 400 }
    );
  }

  const refreshedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      const refreshedProfile = await fetchInstagramProfile(profile);
      if (!refreshedProfile.ok) {
        return {
          cookieProfile: toStoredProfile(refreshedProfile),
          responseProfile: {
            ...sanitizeProfile(refreshedProfile),
            media: [],
            stories: [],
            contentSummary: {
              rangeStart: null,
              rangeEnd: null,
              contentShared: null,
              feedMedia: 0,
              taggedMedia: 0,
              collaboratorMedia: 0,
              activeStories: 0,
            },
            insights: null,
            mediaMessage:
              "message" in refreshedProfile
                ? refreshedProfile.message
                : "Instagram profile refresh failed.",
            insightsMessage: "Instagram profile refresh failed.",
          },
        };
      }

      const metaPage = findMetaPageForProfile(metaPages, refreshedProfile);
      const [
        profileInsights,
        ownedMediaResult,
        storyResult,
        taggedMediaResult,
        metaTaggedMediaResult,
        metaMentionedMediaResult,
      ] =
        await Promise.all([
          fetchInstagramProfileInsights(refreshedProfile.accessToken),
          fetchMediaCollection("media", refreshedProfile.accessToken),
          fetchMediaCollection("stories", refreshedProfile.accessToken),
          fetchMediaCollection(
            "tags",
            refreshedProfile.accessToken,
            refreshedProfile.instagramUserId
          ),
          fetchMetaMediaCollection(metaPage, "tags"),
          fetchMetaMediaCollection(metaPage, "mentioned_media"),
        ]);

      const ownedMedia = ownedMediaResult.media.map((item) => ({
        ...item,
        sourceType: inferSourceType(item, refreshedProfile, "owned"),
      }));
      const stories = storyResult.media.map((item) => ({
        ...item,
        media_product_type: item.media_product_type ?? "STORY",
        sourceType: "story" as const,
      }));
      const taggedMedia = taggedMediaResult.media.map((item) => ({
        ...item,
        sourceType: inferSourceType(item, refreshedProfile, "tagged"),
      }));
      const metaTaggedMedia = metaTaggedMediaResult.media.map((item) => ({
        ...item,
        sourceType: inferSourceType(item, refreshedProfile, "tagged"),
      }));
      const metaMentionedMedia = metaMentionedMediaResult.media.map((item) => ({
        ...item,
        sourceType: inferSourceType(item, refreshedProfile, "tagged"),
      }));
      const allMedia = dedupeMedia([
        ...stories,
        ...ownedMedia,
        ...taggedMedia,
        ...metaTaggedMedia,
        ...metaMentionedMedia,
      ]).sort(
        (a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        }
      );
      const enrichedMedia = await enrichMediaForDashboard(
        allMedia,
        refreshedProfile,
        refreshedProfile.accessToken
      );
      const contentSharedFallback = countInRange(
        allMedia,
        profileInsights.summary.rangeStart,
        profileInsights.summary.rangeEnd
      );
      const nonStoryMedia = enrichedMedia.filter(
        (item) => inferSourceType(item, refreshedProfile) !== "story"
      );
      const collaboratorMedia = enrichedMedia.filter((item) => {
        const sourceType = inferSourceType(item, refreshedProfile);
        return sourceType === "collaborator" || sourceType === "tagged";
      }).length;
      const contentMessages = [
        ownedMediaResult.ok ? null : ownedMediaResult.message,
      ].filter(Boolean);
      const contributorMessage =
        collaboratorMedia > 0
          ? null
          : metaPage
            ? "No contributor posts were returned for this account yet. If a collaboration is missing, confirm the managing Page has tagged-media access for this Instagram account."
            : "Contributor posts need the Page that manages this Instagram account to be connected.";

      return {
        cookieProfile: toStoredProfile(refreshedProfile),
        responseProfile: {
          ...sanitizeProfile(refreshedProfile),
          media: sanitizeMedia(nonStoryMedia, refreshedProfile),
          stories: sanitizeMedia(stories, refreshedProfile),
          contentSummary: {
            rangeStart: profileInsights.summary.rangeStart,
            rangeEnd: profileInsights.summary.rangeEnd,
            contentShared: contentSharedFallback || null,
            feedMedia: ownedMedia.length,
            taggedMedia:
              taggedMedia.length + metaTaggedMedia.length + metaMentionedMedia.length,
            collaboratorMedia,
            activeStories: stories.length,
          },
          insights: profileInsights.summary,
          mediaMessage: contentMessages.length ? contentMessages.join(" ") : null,
          contributorMessage,
          insightsMessage: profileInsights.message,
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

  response.cookies.set(
    INSTAGRAM_AUTH_COOKIE,
    JSON.stringify(refreshedProfiles.map((profile) => profile.cookieProfile)),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: cookieMaxAge,
    }
  );

  return response;
}
