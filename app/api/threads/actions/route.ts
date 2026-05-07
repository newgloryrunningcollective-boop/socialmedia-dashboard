import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const THREADS_ACCOUNT_COOKIE = "threads_account";
const THREADS_GRAPH_ORIGIN = "https://graph.threads.net/v1.0";
const THREADS_MEDIA_FIELDS = [
  "id",
  "media_product_type",
  "media_type",
  "media_url",
  "gif_url",
  "permalink",
  "owner",
  "username",
  "text",
  "timestamp",
  "shortcode",
  "thumbnail_url",
  "children",
  "is_quote_post",
  "quoted_post",
  "reposted_post",
  "has_replies",
  "alt_text",
  "link_attachment_url",
  "location_id",
  "topic_tag",
].join(",");
const THREADS_REPLY_FIELDS = [
  THREADS_MEDIA_FIELDS,
  "is_reply",
  "is_reply_owned_by_me",
  "root_post",
  "replied_to",
  "hide_status",
  "reply_audience",
  "is_verified",
  "profile_picture_url",
  "reply_approval_status",
].join(",");
const THREADS_PROFILE_FIELDS = [
  "id",
  "username",
  "name",
  "is_verified",
  "threads_profile_picture_url",
  "threads_biography",
  "recently_searched_keywords",
  "is_eligible_for_geo_gating",
].join(",");
const THREADS_LOCATION_FIELDS = [
  "id",
  "address",
  "city",
  "country",
  "name",
  "latitude",
  "longitude",
  "postal_code",
].join(",");

type ThreadsStoredAccount = {
  accessToken?: string;
  expiresAt?: number;
  userId?: string | null;
};

type ThreadsApiError = {
  error?: {
    message?: string;
  };
};

type ThreadsActionBody = {
  action?: string;
  text?: string;
  mediaType?: string;
  mediaUrl?: string;
  altText?: string;
  replyToId?: string;
  replyControl?: string;
  topicTag?: string;
  locationId?: string;
  shareToInstagram?: boolean;
  publishNow?: boolean;
  threadId?: string;
  replyThreadId?: string;
  query?: string;
  username?: string;
  searchType?: string;
  limit?: number;
  hide?: boolean;
  approve?: boolean;
  reverse?: boolean;
  approvalStatus?: string;
  latitude?: string;
  longitude?: string;
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

function getErrorMessage(payload: ThreadsApiError, fallback: string) {
  return payload.error?.message ?? fallback;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function getLimit(value: unknown, fallback = 20) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), 1), 50)
    : fallback;
}

function buildUrl(
  path: string,
  accessToken: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
) {
  const url = new URL(`${THREADS_GRAPH_ORIGIN}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("access_token", accessToken);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function requestThreads(
  path: string,
  accessToken: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    params?: Record<string, string | number | boolean | null | undefined>;
    fallbackMessage: string;
  }
) {
  const url = buildUrl(path, accessToken, options.params);
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as ThreadsApiError & {
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

async function getConnectedThreadsAccount() {
  const cookieStore = await cookies();
  return parseThreadsAccount(cookieStore.get(THREADS_ACCOUNT_COOKIE)?.value);
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function buildPublishParams(body: ThreadsActionBody) {
  const mediaType = (getString(body.mediaType) ?? "TEXT").toUpperCase();
  const text = getString(body.text);
  const mediaUrl = getString(body.mediaUrl);

  if (!["TEXT", "IMAGE", "VIDEO"].includes(mediaType)) {
    return { error: "Threads media type must be TEXT, IMAGE, or VIDEO." };
  }

  if (mediaType === "TEXT" && !text) {
    return { error: "Threads text is required for text posts." };
  }

  if ((mediaType === "IMAGE" || mediaType === "VIDEO") && !mediaUrl) {
    return { error: "A public image or video URL is required for media posts." };
  }

  const params: Record<string, string | boolean> = {
    media_type: mediaType,
  };

  if (text) params.text = text;
  if (mediaType === "IMAGE" && mediaUrl) params.image_url = mediaUrl;
  if (mediaType === "VIDEO" && mediaUrl) params.video_url = mediaUrl;
  if (getString(body.altText)) params.alt_text = getString(body.altText) as string;
  if (getString(body.replyToId)) params.reply_to_id = getString(body.replyToId) as string;
  if (getString(body.replyControl)) params.reply_control = getString(body.replyControl) as string;
  if (getString(body.topicTag)) params.topic_tag = getString(body.topicTag) as string;
  if (getString(body.locationId)) params.location_id = getString(body.locationId) as string;
  if (body.shareToInstagram) params.share_to_instagram = true;

  return { params };
}

async function publishThread(body: ThreadsActionBody, accessToken: string) {
  const publishParams = buildPublishParams(body);
  if (typeof publishParams.error === "string") return badRequest(publishParams.error);

  const container = await requestThreads("me/threads", accessToken, {
    method: "POST",
    params: publishParams.params,
    fallbackMessage: "Threads container creation failed.",
  });

  if (!container.ok || !container.data.id) {
    return NextResponse.json(
      {
        ok: false,
        action: "publish",
        container: container.data,
        message: container.message ?? "Threads container creation failed.",
      },
      { status: container.status || 400 }
    );
  }

  if (body.publishNow === false) {
    return NextResponse.json({
      ok: true,
      action: "publish",
      container: container.data,
      message: "Threads container created.",
    });
  }

  const published = await requestThreads("me/threads_publish", accessToken, {
    method: "POST",
    params: { creation_id: container.data.id },
    fallbackMessage: "Threads publish failed.",
  });

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

async function runReadAction(body: ThreadsActionBody, accessToken: string) {
  const action = getString(body.action);
  const limit = getLimit(body.limit);

  if (action === "search") {
    const query = getString(body.query);
    if (!query) return badRequest("Search query is required.");

    return requestThreads("keyword_search", accessToken, {
      params: {
        q: query,
        search_type: getString(body.searchType)?.toUpperCase() === "RECENT" ? "RECENT" : "TOP",
        fields: THREADS_MEDIA_FIELDS,
        limit,
      },
      fallbackMessage: "Threads keyword search failed.",
    });
  }

  if (action === "profileLookup") {
    const username = getString(body.username)?.replace(/^@/, "");
    if (!username) return badRequest("Threads username is required.");

    return requestThreads("profile_lookup", accessToken, {
      params: { username, fields: THREADS_PROFILE_FIELDS },
      fallbackMessage: "Threads profile lookup failed.",
    });
  }

  if (action === "profilePosts") {
    const username = getString(body.username)?.replace(/^@/, "");
    if (!username) return badRequest("Threads username is required.");

    return requestThreads("profile_posts", accessToken, {
      params: { username, fields: THREADS_MEDIA_FIELDS, limit },
      fallbackMessage: "Threads profile posts lookup failed.",
    });
  }

  if (action === "mentions") {
    return requestThreads("me/mentions", accessToken, {
      params: { fields: THREADS_MEDIA_FIELDS, limit },
      fallbackMessage: "Threads mentions lookup failed.",
    });
  }

  if (action === "replies" || action === "conversation") {
    const threadId = getString(body.threadId);
    if (!threadId) return badRequest("Threads post ID is required.");

    return requestThreads(`${threadId}/${action === "replies" ? "replies" : "conversation"}`, accessToken, {
      params: {
        fields: THREADS_REPLY_FIELDS,
        reverse: getBoolean(body.reverse) ?? false,
        approval_status: getString(body.approvalStatus),
        limit,
      },
      fallbackMessage:
        action === "replies"
          ? "Threads replies lookup failed."
          : "Threads conversation lookup failed.",
    });
  }

  if (action === "locationSearch") {
    const query = getString(body.query);
    if (!query) return badRequest("Location query is required.");

    return requestThreads("location_search", accessToken, {
      params: {
        q: query,
        latitude: getString(body.latitude),
        longitude: getString(body.longitude),
        fields: THREADS_LOCATION_FIELDS,
        limit,
      },
      fallbackMessage: "Threads location search failed.",
    });
  }

  if (action === "location") {
    const locationId = getString(body.locationId);
    if (!locationId) return badRequest("Threads location ID is required.");

    return requestThreads(locationId, accessToken, {
      params: { fields: THREADS_LOCATION_FIELDS },
      fallbackMessage: "Threads location lookup failed.",
    });
  }

  return badRequest("Unknown Threads read action.");
}

export async function POST(req: NextRequest) {
  const account = await getConnectedThreadsAccount();
  if (!account?.accessToken) {
    return NextResponse.json(
      { ok: false, message: "No connected Threads account found. Connect first." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as ThreadsActionBody;
  const action = getString(body.action);

  if (action === "publish") {
    return publishThread(body, account.accessToken);
  }

  if (action === "delete") {
    const threadId = getString(body.threadId);
    if (!threadId) return badRequest("Threads post ID is required.");

    const result = await requestThreads(threadId, account.accessToken, {
      method: "DELETE",
      fallbackMessage: "Threads delete failed.",
    });
    return NextResponse.json(
      { ok: result.ok, action, result: result.data, message: result.message },
      { status: result.ok ? 200 : result.status || 400 }
    );
  }

  if (action === "manageReply") {
    const replyThreadId = getString(body.replyThreadId);
    if (!replyThreadId) return badRequest("Threads reply ID is required.");

    const result = await requestThreads(`${replyThreadId}/manage_reply`, account.accessToken, {
      method: "POST",
      params: { hide: getBoolean(body.hide) ?? true },
      fallbackMessage: "Threads reply moderation failed.",
    });
    return NextResponse.json(
      { ok: result.ok, action, result: result.data, message: result.message },
      { status: result.ok ? 200 : result.status || 400 }
    );
  }

  if (action === "managePendingReply") {
    const replyThreadId = getString(body.replyThreadId);
    if (!replyThreadId) return badRequest("Threads reply ID is required.");

    const result = await requestThreads(`${replyThreadId}/manage_pending_reply`, account.accessToken, {
      method: "POST",
      params: { approve: getBoolean(body.approve) ?? true },
      fallbackMessage: "Threads pending reply moderation failed.",
    });
    return NextResponse.json(
      { ok: result.ok, action, result: result.data, message: result.message },
      { status: result.ok ? 200 : result.status || 400 }
    );
  }

  const result = await runReadAction(body, account.accessToken);
  if (result instanceof NextResponse) return result;

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
