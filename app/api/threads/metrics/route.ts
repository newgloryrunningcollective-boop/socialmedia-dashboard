import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ThreadsStoredAccount = {
  accessToken?: string;
  expiresAt?: number;
  userId?: string | null;
  profile?: ThreadsProfile | null;
};

type ThreadsProfile = {
  id: string | null;
  username: string | null;
  profilePictureUrl: string | null;
  biography: string | null;
};

type ThreadsApiError = {
  error?: {
    message?: string;
  };
};

type ThreadsProfileResponse = ThreadsApiError & {
  id?: string | number;
  username?: string | null;
  threads_profile_picture_url?: string | null;
  threads_biography?: string | null;
};

type ThreadsInsightsResponse = ThreadsApiError & {
  data?: Array<{
    name?: string;
    values?: Array<{
      value?: number | null;
    }>;
  }>;
};

type ThreadsMediaResponse = ThreadsApiError & {
  data?: Array<{
    id?: string;
    media_type?: string | null;
    media_url?: string | null;
    permalink?: string | null;
    text?: string | null;
    timestamp?: string | null;
    shortcode?: string | null;
    thumbnail_url?: string | null;
    is_quote_post?: boolean | null;
  }>;
};

function parseThreadsAccount(raw: string | undefined) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ThreadsStoredAccount;
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getThreadsErrorMessage(payload: ThreadsApiError, fallback: string) {
  return payload.error?.message ?? fallback;
}

function getInsightValue(
  insights: ThreadsInsightsResponse,
  metric: string,
  reducer: "sum" | "latest" = "latest"
) {
  const values =
    insights.data
      ?.find((item) => item.name === metric)
      ?.values?.map((item) => item.value)
      .filter((value): value is number => typeof value === "number") ?? [];

  if (!values.length) return null;
  return reducer === "sum" ? values.reduce((sum, value) => sum + value, 0) : values.at(-1) ?? null;
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
    return { profile: null, message: getThreadsErrorMessage(json, "Threads profile was not returned.") };
  }

  return {
    profile: {
      id: json.id ? String(json.id) : null,
      username: json.username ?? null,
      profilePictureUrl: json.threads_profile_picture_url ?? null,
      biography: json.threads_biography ?? null,
    },
    message: null,
  };
}

async function fetchThreadsAccountInsights(userId: string, accessToken: string) {
  const url = new URL(`https://graph.threads.net/v1.0/${userId}/threads_insights`);
  url.searchParams.set("metric", "views,likes,replies,reposts,quotes,followers_count");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as ThreadsInsightsResponse;

  if (!res.ok) {
    return {
      insights: null,
      message: getThreadsErrorMessage(json, "Threads account insights were not returned."),
    };
  }

  return {
    insights: {
      views: getInsightValue(json, "views", "sum"),
      likes: getInsightValue(json, "likes", "sum"),
      replies: getInsightValue(json, "replies", "sum"),
      reposts: getInsightValue(json, "reposts", "sum"),
      quotes: getInsightValue(json, "quotes", "sum"),
      followersCount: getInsightValue(json, "followers_count"),
    },
    message: null,
  };
}

async function fetchThreadsPostInsights(postId: string, accessToken: string) {
  const url = new URL(`https://graph.threads.net/v1.0/${postId}/insights`);
  url.searchParams.set("metric", "views,likes,replies,reposts,quotes,shares");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as ThreadsInsightsResponse;

  if (!res.ok) {
    return {
      views: null,
      likes: null,
      replies: null,
      reposts: null,
      quotes: null,
      shares: null,
      message: getThreadsErrorMessage(json, "Threads post insights were not returned."),
    };
  }

  return {
    views: getInsightValue(json, "views"),
    likes: getInsightValue(json, "likes"),
    replies: getInsightValue(json, "replies"),
    reposts: getInsightValue(json, "reposts"),
    quotes: getInsightValue(json, "quotes"),
    shares: getInsightValue(json, "shares"),
    message: null,
  };
}

async function fetchThreadsPosts(accessToken: string) {
  const url = new URL("https://graph.threads.net/v1.0/me/threads");
  url.searchParams.set(
    "fields",
    "id,media_type,media_url,permalink,text,timestamp,shortcode,thumbnail_url,is_quote_post"
  );
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as ThreadsMediaResponse;

  if (!res.ok) {
    return {
      posts: [],
      message: getThreadsErrorMessage(json, "Threads posts were not returned."),
    };
  }

  const posts = await Promise.all(
    (json.data ?? []).map(async (post) => {
      const postId = post.id ?? crypto.randomUUID();
      const insights = await fetchThreadsPostInsights(postId, accessToken);
      const engagementCount =
        (insights.likes ?? 0) +
        (insights.replies ?? 0) +
        (insights.reposts ?? 0) +
        (insights.quotes ?? 0) +
        (insights.shares ?? 0);

      return {
        id: postId,
        message: post.text ?? null,
        createdTime: post.timestamp ?? null,
        permalinkUrl: post.permalink ?? null,
        pictureUrl: post.thumbnail_url ?? post.media_url ?? null,
        mediaType: post.media_type ?? null,
        isQuotePost: post.is_quote_post ?? null,
        viewCount: insights.views,
        likeCount: insights.likes,
        replyCount: insights.replies,
        repostCount: insights.reposts,
        quoteCount: insights.quotes,
        shareCount: insights.shares,
        engagementCount,
        messageFromInsights: insights.message,
      };
    })
  );

  return {
    posts,
    message:
      posts.find((post) => post.messageFromInsights)?.messageFromInsights ?? null,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const account = parseThreadsAccount(cookieStore.get("threads_account")?.value);

  if (!account) {
    return NextResponse.json(
      { ok: false, message: "No connected Threads account found. Connect first." },
      { status: 400 }
    );
  }

  const [profileResult, postsResult] = await Promise.all([
    fetchThreadsProfile(account.accessToken as string),
    fetchThreadsPosts(account.accessToken as string),
  ]);
  const profile = profileResult.profile ?? account.profile ?? null;
  const userId = profile?.id ?? account.userId ?? null;
  const accountInsightsResult = userId
    ? await fetchThreadsAccountInsights(userId, account.accessToken as string)
    : { insights: null, message: "Threads user ID is missing. Reconnect Threads." };

  return NextResponse.json({
    ok: true,
    profile,
    insights: accountInsightsResult.insights,
    posts: postsResult.posts,
    profileMessage: profileResult.message,
    insightsMessage: accountInsightsResult.message,
    postsMessage: postsResult.message,
  });
}
