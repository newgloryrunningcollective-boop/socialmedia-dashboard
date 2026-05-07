import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_AUTH_COOKIE = "instagram_profiles";
const META_PAGES_COOKIE = "meta_pages";
const INSTAGRAM_GRAPH_ORIGIN = "https://graph.instagram.com";
const FACEBOOK_GRAPH_ORIGIN = "https://graph.facebook.com/v20.0";
const profileGroups = ["personal", "newglory"] as const;

type InstagramProfileGroup = (typeof profileGroups)[number];

type StoredInstagramProfile = {
  profileGroup: InstagramProfileGroup;
  instagramUserId: string;
  accessToken: string;
  accessTokenExpiresAt: number | null;
  username: string | null;
};

type StoredPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string | null;
  igUsername: string | null;
};

type GraphError = {
  error?: {
    message?: string;
  };
};

type InstagramActionBody = {
  action?: string;
  profileGroup?: InstagramProfileGroup;
  mediaId?: string;
  commentId?: string;
  conversationId?: string;
  recipientId?: string;
  text?: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaUrls?: string;
  altText?: string;
  locationId?: string;
  productTags?: string;
  userTags?: string;
  collaborators?: string;
  brandedContentSponsorId?: string;
  query?: string;
  hide?: boolean;
  limit?: number;
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
            typeof page.pageAccessToken === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getLimit(value: unknown, fallback = 20) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1), 50)
    : fallback;
}

function getErrorMessage(payload: GraphError, fallback: string) {
  return payload.error?.message ?? fallback;
}

function selectProfile(profiles: StoredInstagramProfile[], group: unknown) {
  const profileGroup = profileGroups.includes(group as InstagramProfileGroup)
    ? (group as InstagramProfileGroup)
    : "personal";

  return (
    profiles.find((profile) => profile.profileGroup === profileGroup) ??
    profiles[0] ??
    null
  );
}

function findPageForProfile(pages: StoredPage[], profile: StoredInstagramProfile) {
  const username = profile.username?.toLowerCase();
  return (
    pages.find((page) => page.igBusinessId === profile.instagramUserId) ??
    pages.find((page) => username && page.igUsername?.toLowerCase() === username) ??
    null
  );
}

function buildUrl(
  origin: string,
  path: string,
  accessToken: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
) {
  const url = new URL(`${origin}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("access_token", accessToken);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function graphRequest(
  origin: string,
  path: string,
  accessToken: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    params?: Record<string, string | number | boolean | null | undefined>;
    fallbackMessage: string;
  }
) {
  const url = buildUrl(origin, path, accessToken, options.params);
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as GraphError & {
    id?: string;
    data?: unknown;
  };

  return {
    ok: res.ok,
    status: res.status,
    data,
    message: res.ok ? null : getErrorMessage(data, options.fallbackMessage),
  };
}

function jsonResult(result: Awaited<ReturnType<typeof graphRequest>>, action: string) {
  return NextResponse.json(
    {
      ok: result.ok,
      action,
      result: result.data,
      message: result.message,
    },
    { status: result.ok ? 200 : result.status || 400 }
  );
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function addOptionalJsonParam(
  params: Record<string, string | number | boolean>,
  key: string,
  raw: string | null
) {
  if (!raw) return;
  try {
    JSON.parse(raw);
    params[key] = raw;
  } catch {
    params[key] = raw;
  }
}

function parseMediaUrls(body: InstagramActionBody) {
  const raw = getString(body.mediaUrls) ?? getString(body.mediaUrl);
  if (!raw) return [];

  return raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isLikelyVideoUrl(url: string) {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

async function createMediaContainer(
  profile: StoredInstagramProfile,
  params: Record<string, string | number | boolean>,
  fallbackMessage = "Instagram media container creation failed."
) {
  return graphRequest(
    INSTAGRAM_GRAPH_ORIGIN,
    `${profile.instagramUserId}/media`,
    profile.accessToken,
    {
      method: "POST",
      params,
      fallbackMessage,
    }
  );
}

async function publishInstagram(profile: StoredInstagramProfile, body: InstagramActionBody) {
  const mediaType = (getString(body.mediaType) ?? "IMAGE").toUpperCase();
  const mediaUrls = parseMediaUrls(body);
  const mediaUrl = mediaUrls[0];
  const caption = getString(body.caption) ?? "";

  if (!["IMAGE", "VIDEO", "REELS", "STORIES", "CAROUSEL"].includes(mediaType)) {
    return badRequest("Instagram media type must be IMAGE, VIDEO, REELS, STORIES, or CAROUSEL.");
  }

  if (!mediaUrl) {
    return badRequest("A public image or video URL is required for Instagram publishing.");
  }

  if (mediaType === "CAROUSEL") {
    if (mediaUrls.length < 2) {
      return badRequest("Carousel publishing requires at least two public media URLs.");
    }

    const childContainers = await Promise.all(
      mediaUrls.slice(0, 10).map((url) =>
        createMediaContainer(profile, {
          is_carousel_item: true,
          ...(isLikelyVideoUrl(url) ? { video_url: url } : { image_url: url }),
        })
      )
    );
    const failedChild = childContainers.find((container) => !container.ok || !container.data.id);
    if (failedChild) return jsonResult(failedChild, "publish");

    const params: Record<string, string | number | boolean> = {
      caption,
      media_type: "CAROUSEL",
      children: childContainers.map((container) => container.data.id).join(","),
    };
    if (getString(body.locationId)) params.location_id = getString(body.locationId) as string;
    addOptionalJsonParam(params, "product_tags", getString(body.productTags));
    addOptionalJsonParam(params, "user_tags", getString(body.userTags));
    addOptionalJsonParam(params, "collaborators", getString(body.collaborators));

    const container = await createMediaContainer(profile, params);
    if (!container.ok || !container.data.id) return jsonResult(container, "publish");

    const published = await graphRequest(
      INSTAGRAM_GRAPH_ORIGIN,
      `${profile.instagramUserId}/media_publish`,
      profile.accessToken,
      {
        method: "POST",
        params: { creation_id: container.data.id },
        fallbackMessage: "Instagram carousel publish failed.",
      }
    );

    return NextResponse.json(
      {
        ok: published.ok,
        action: "publish",
        children: childContainers.map((container) => container.data),
        container: container.data,
        published: published.data,
        postId: published.data.id ?? null,
        message: published.message,
      },
      { status: published.ok ? 200 : published.status || 400 }
    );
  }

  const params: Record<string, string | number | boolean> = { caption };
  if (mediaType === "IMAGE") params.image_url = mediaUrl;
  if (mediaType === "VIDEO") params.video_url = mediaUrl;
  if (mediaType === "REELS") {
    params.video_url = mediaUrl;
    params.media_type = "REELS";
  }
  if (mediaType === "STORIES") {
    if (isLikelyVideoUrl(mediaUrl)) {
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }
    params.media_type = "STORIES";
  }
  if (getString(body.altText)) params.alt_text = getString(body.altText) as string;
  if (getString(body.locationId)) params.location_id = getString(body.locationId) as string;
  if (getString(body.brandedContentSponsorId)) {
    params.sponsor_id = getString(body.brandedContentSponsorId) as string;
  }
  addOptionalJsonParam(params, "product_tags", getString(body.productTags));
  addOptionalJsonParam(params, "user_tags", getString(body.userTags));
  addOptionalJsonParam(params, "collaborators", getString(body.collaborators));

  const container = await createMediaContainer(profile, params);

  if (!container.ok || !container.data.id) {
    return jsonResult(container, "publish");
  }

  const published = await graphRequest(
    INSTAGRAM_GRAPH_ORIGIN,
    `${profile.instagramUserId}/media_publish`,
    profile.accessToken,
    {
      method: "POST",
      params: { creation_id: container.data.id },
      fallbackMessage: "Instagram publish failed.",
    }
  );

  return NextResponse.json(
    {
      ok: published.ok,
      action: "publish",
      container: container.data,
      published: published.data,
      postId: published.data.id ?? null,
      message: published.message,
    },
    { status: published.ok ? 200 : published.status || 400 }
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const profiles = parseStoredProfiles(cookieStore.get(INSTAGRAM_AUTH_COOKIE)?.value);
  const pages = parseStoredPages(cookieStore.get(META_PAGES_COOKIE)?.value);
  const body = (await req.json().catch(() => ({}))) as InstagramActionBody;
  const profile = selectProfile(profiles, body.profileGroup);
  const action = getString(body.action);

  if (!profile) {
    return NextResponse.json(
      { ok: false, message: "No connected Instagram account found. Connect first." },
      { status: 400 }
    );
  }

  const page = findPageForProfile(pages, profile);
  const pageToken = page?.pageAccessToken ?? profile.accessToken;
  const limit = getLimit(body.limit);

  if (action === "publish") return publishInstagram(profile, body);

  if (action === "comments") {
    const mediaId = getString(body.mediaId);
    if (!mediaId) return badRequest("Instagram media ID is required.");
    const result = await graphRequest(INSTAGRAM_GRAPH_ORIGIN, `${mediaId}/comments`, profile.accessToken, {
      params: {
        fields: "id,text,username,timestamp,like_count,replies{id,text,username,timestamp}",
        limit,
      },
      fallbackMessage: "Instagram comments were not returned.",
    });
    return jsonResult(result, action);
  }

  if (action === "replyComment") {
    const commentId = getString(body.commentId);
    const text = getString(body.text);
    if (!commentId || !text) return badRequest("Comment ID and reply text are required.");
    const result = await graphRequest(INSTAGRAM_GRAPH_ORIGIN, `${commentId}/replies`, profile.accessToken, {
      method: "POST",
      params: { message: text },
      fallbackMessage: "Instagram comment reply failed.",
    });
    return jsonResult(result, action);
  }

  if (action === "manageComment") {
    const commentId = getString(body.commentId);
    if (!commentId) return badRequest("Instagram comment ID is required.");
    const result = await graphRequest(INSTAGRAM_GRAPH_ORIGIN, commentId, profile.accessToken, {
      method: "POST",
      params: { hide: body.hide ?? true },
      fallbackMessage: "Instagram comment moderation failed.",
    });
    return jsonResult(result, action);
  }

  if (action === "deleteComment") {
    const commentId = getString(body.commentId);
    if (!commentId) return badRequest("Instagram comment ID is required.");
    const result = await graphRequest(INSTAGRAM_GRAPH_ORIGIN, commentId, profile.accessToken, {
      method: "DELETE",
      fallbackMessage: "Instagram comment delete failed.",
    });
    return jsonResult(result, action);
  }

  if (action === "conversations") {
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, `${profile.instagramUserId}/conversations`, pageToken, {
      params: {
        platform: "instagram",
        fields: "id,updated_time,participants,messages.limit(3){id,message,created_time,from,to}",
        limit,
      },
      fallbackMessage: "Instagram conversations were not returned.",
    });
    return jsonResult(result, action);
  }

  if (action === "sendMessage") {
    const text = getString(body.text);
    const recipientId = getString(body.recipientId);
    if (!text || !recipientId) return badRequest("Recipient ID and message text are required.");
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, `${profile.instagramUserId}/messages`, pageToken, {
      method: "POST",
      params: {
        recipient: JSON.stringify({ id: recipientId }),
        message: JSON.stringify({ text }),
        messaging_type: "RESPONSE",
      },
      fallbackMessage: "Instagram message send failed.",
    });
    return jsonResult(result, action);
  }

  if (action === "mentions") {
    const result = await graphRequest(INSTAGRAM_GRAPH_ORIGIN, `${profile.instagramUserId}/tags`, profile.accessToken, {
      params: {
        fields: "id,caption,media_type,media_url,permalink,timestamp,username,owner",
        limit,
      },
      fallbackMessage: "Instagram mentions/tagged media were not returned.",
    });
    return jsonResult(result, action);
  }

  if (action === "publicSearch") {
    const query = getString(body.query);
    if (!query) return badRequest("Search query is required.");
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, "ig_hashtag_search", pageToken, {
      params: {
        user_id: profile.instagramUserId,
        q: query.replace(/^#/, ""),
      },
      fallbackMessage: "Instagram public hashtag search failed.",
    });
    return jsonResult(result, action);
  }

  if (action === "upcomingEvents") {
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, `${profile.instagramUserId}/upcoming_events`, pageToken, {
      params: { limit },
      fallbackMessage: "Instagram upcoming events were not returned.",
    });
    return jsonResult(result, action);
  }

  if (action === "catalogProducts") {
    const query = getString(body.query);
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, "me/product_catalogs", pageToken, {
      params: {
        fields: query
          ? `id,name,products.limit(${limit}){id,name,retailer_id,availability}`
          : "id,name",
        limit,
      },
      fallbackMessage: "Meta catalog products were not returned.",
    });
    return jsonResult(result, action);
  }

  if (action === "adAccounts") {
    const result = await graphRequest(FACEBOOK_GRAPH_ORIGIN, "me/adaccounts", pageToken, {
      params: {
        fields: "id,name,account_status,currency,amount_spent,balance",
        limit,
      },
      fallbackMessage: "Meta ad accounts were not returned.",
    });
    return jsonResult(result, action);
  }

  return badRequest("Unknown Instagram action.");
}
