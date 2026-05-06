import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type StoredPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string | null;
  igUsername: string | null;
};

type MetaApiError = {
  error?: {
    message?: string;
  };
};

type MetaPageResponse = MetaApiError & {
  fan_count?: number;
  followers_count?: number;
};

type MetaInstagramResponse = MetaApiError & {
  username?: string | null;
  followers_count?: number;
  media_count?: number;
};

type MetaInsightResponse = MetaApiError & {
  data?: Array<{
    name?: string;
    values?: Array<{
      value?: number | Record<string, number> | null;
      end_time?: string;
    }>;
  }>;
};

type MetaPostResponse = MetaApiError & {
  data?: Array<{
    id?: string;
    message?: string;
    story?: string;
    created_time?: string;
    permalink_url?: string;
    full_picture?: string;
    shares?: { count?: number };
    comments?: { summary?: { total_count?: number } };
    reactions?: { summary?: { total_count?: number } };
  }>;
};

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMetaErrorMessage(payload: MetaApiError, fallback: string) {
  return payload.error?.message ?? fallback;
}

function sumNumbers(values: Array<number | null>) {
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return values.some((value) => typeof value === "number") ? total : null;
}

async function fetchPageFanCount(pageId: string, pageAccessToken: string) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}`);
  url.searchParams.set("fields", "fan_count,followers_count,name");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as MetaPageResponse;
  if (!res.ok) return { fan_count: null, followers_count: null };
  return {
    fan_count: typeof json.fan_count === "number" ? json.fan_count : null,
    followers_count:
      typeof json.followers_count === "number" ? json.followers_count : null,
  };
}

async function fetchIgAccount(igBusinessId: string, pageAccessToken: string) {
  const url = new URL(`https://graph.facebook.com/v20.0/${igBusinessId}`);
  url.searchParams.set("fields", "username,followers_count,media_count");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as MetaInstagramResponse;
  if (!res.ok) return { username: null, followers_count: null, media_count: null };

  return {
    username: json.username ?? null,
    followers_count:
      typeof json.followers_count === "number" ? json.followers_count : null,
    media_count: typeof json.media_count === "number" ? json.media_count : null,
  };
}

async function fetchPageInsightMetric(
  pageId: string,
  pageAccessToken: string,
  metric: string,
  reducer: "sum" | "latest"
) {
  const now = new Date();
  const until = Math.floor(now.getTime() / 1000);
  const since = until - 60 * 60 * 24 * 30;
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}/insights`);
  url.searchParams.set("metric", metric);
  url.searchParams.set("period", "day");
  url.searchParams.set("since", String(since));
  url.searchParams.set("until", String(until));
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as MetaInsightResponse;

  if (!res.ok) {
    return {
      value: null,
      message: getMetaErrorMessage(json, `${metric} is not available.`),
    };
  }

  const values = json.data?.[0]?.values ?? [];
  const numbers = values.map((item) => {
    if (typeof item.value === "number") return item.value;
    if (item.value && typeof item.value === "object") {
      return sumNumbers(Object.values(item.value).map(numberOrNull));
    }
    return null;
  });

  return {
    value:
      reducer === "latest"
        ? numbers.findLast((value) => typeof value === "number") ?? null
        : sumNumbers(numbers),
    message: null,
  };
}

async function fetchPageInsights(pageId: string, pageAccessToken: string) {
  const [
    views,
    postEngagements,
    impressions,
    followerSnapshot,
    newFollowers,
  ] = await Promise.all([
    fetchPageInsightMetric(pageId, pageAccessToken, "page_media_view", "sum"),
    fetchPageInsightMetric(pageId, pageAccessToken, "page_post_engagements", "sum"),
    fetchPageInsightMetric(pageId, pageAccessToken, "page_impressions", "sum"),
    fetchPageInsightMetric(pageId, pageAccessToken, "page_follows", "latest"),
    fetchPageInsightMetric(pageId, pageAccessToken, "page_fan_adds_unique", "sum"),
  ]);

  const messages = [
    views.message,
    postEngagements.message,
    impressions.message,
    followerSnapshot.message,
    newFollowers.message,
  ].filter((message): message is string => Boolean(message));

  return {
    views: views.value,
    postEngagements: postEngagements.value,
    impressions: impressions.value,
    followerSnapshot: followerSnapshot.value,
    newFollowers: newFollowers.value,
    message:
      messages.length === 5
        ? "Facebook Page Insights were not returned for this Page/token. Reconnect Meta with page insights access or use the post engagement fallback."
        : null,
  };
}

async function fetchPagePosts(pageId: string, pageAccessToken: string) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}/posts`);
  url.searchParams.set(
    "fields",
    "id,message,story,created_time,permalink_url,full_picture,shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)"
  );
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as MetaPostResponse;

  if (!res.ok) {
    return {
      posts: [],
      message: getMetaErrorMessage(
        json,
        "Facebook posts were not returned for this Page/token."
      ),
    };
  }

  const posts = (json.data ?? []).map((post) => {
    const reactionCount = numberOrNull(post.reactions?.summary?.total_count);
    const commentCount = numberOrNull(post.comments?.summary?.total_count);
    const shareCount = numberOrNull(post.shares?.count);

    return {
      id: post.id ?? crypto.randomUUID(),
      message: post.message ?? post.story ?? null,
      createdTime: post.created_time ?? null,
      permalinkUrl: post.permalink_url ?? null,
      pictureUrl: post.full_picture ?? null,
      reactionCount,
      commentCount,
      shareCount,
      engagementCount:
        (reactionCount ?? 0) + (commentCount ?? 0) + (shareCount ?? 0),
    };
  });

  return {
    posts,
    message: null,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("meta_pages")?.value;

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "No connected pages found. Reconnect Meta first." },
      { status: 400 }
    );
  }

  let pages: StoredPage[] = [];
  try {
    pages = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid meta_pages cookie payload." },
      { status: 400 }
    );
  }

  if (!pages.length) {
    return NextResponse.json(
      { ok: false, message: "No connected pages found. Reconnect Meta first." },
      { status: 400 }
    );
  }

  const metrics = await Promise.all(
    pages.map(async (p) => {
      const [fb, fbInsights, fbPosts] = await Promise.all([
        fetchPageFanCount(p.pageId, p.pageAccessToken),
        fetchPageInsights(p.pageId, p.pageAccessToken),
        fetchPagePosts(p.pageId, p.pageAccessToken),
      ]);
      const ig = p.igBusinessId
        ? await fetchIgAccount(p.igBusinessId, p.pageAccessToken)
        : null;
      const fbRecentPostEngagements = fbPosts.posts.reduce(
        (sum, post) => sum + post.engagementCount,
        0
      );

      return {
        pageId: p.pageId,
        pageName: p.pageName,
        fbFanCount: fb.fan_count,
        fbFollowersCount: fb.followers_count,
        fbViews: fbInsights.views,
        fbImpressions: fbInsights.impressions,
        fbPostEngagements: fbInsights.postEngagements,
        fbFollowerSnapshot: fbInsights.followerSnapshot,
        fbNewFollowers: fbInsights.newFollowers,
        fbRecentPostCount: fbPosts.posts.length,
        fbRecentPostEngagements,
        fbPosts: fbPosts.posts,
        fbInsightsMessage: fbInsights.message,
        fbPostsMessage: fbPosts.message,
        igBusinessId: p.igBusinessId,
        igUsername: ig?.username ?? p.igUsername ?? null,
        igFollowersCount: ig?.followers_count ?? null,
        igMediaCount: ig?.media_count ?? null,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    source: "cookie",
    count: metrics.length,
    metrics,
  });
}
