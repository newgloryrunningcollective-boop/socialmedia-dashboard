import { NextRequest, NextResponse } from "next/server";

const META_OAUTH_STATE_COOKIE = "meta_oauth_state";
const ONE_HOUR = 60 * 60;

type StoredPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string | null;
  igUsername: string | null;
};

type ConnectedPage = {
  id: string;
  name: string;
  ig: { id: string; username: string | null } | null;
  fan_count: number | null;
};

type MetaGraphInstagramBusinessAccount = {
  id?: string | number;
  username?: string | null;
};

type MetaGraphPage = {
  id?: string | number;
  name?: string | null;
  access_token?: string | null;
  instagram_business_account?: MetaGraphInstagramBusinessAccount | null;
};

type MetaApiError = {
  error?: {
    message?: string;
  };
};

type MetaTokenResponse = MetaApiError & {
  access_token?: string;
};

type MetaAccountsResponse = MetaApiError & {
  data?: MetaGraphPage[];
};

type MetaFanCountResponse = MetaApiError & {
  fan_count?: number;
};

function redirectWithMetaStatus(
  appBaseUrl: string,
  params: Record<string, string>
) {
  const url = new URL(appBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getMetaErrorMessage(fallback: string, payload: MetaApiError) {
  return payload.error?.message ?? fallback;
}

function stringId(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return null;
}

async function fetchMetaJson<T extends MetaApiError>(url: URL) {
  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as T;
  return { ok: res.ok, json };
}

async function getPageFanCount(pageId: string, pageAccessToken: string) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}`);
  url.searchParams.set("fields", "fan_count");
  url.searchParams.set("access_token", pageAccessToken);

  const { ok, json } = await fetchMetaJson<MetaFanCountResponse>(url);
  if (!ok) return null;
  return typeof json.fan_count === "number" ? json.fan_count : null;
}

function normalizeStoredPage(page: MetaGraphPage): StoredPage | null {
  const pageId = stringId(page.id);
  if (!pageId) return null;

  const igBusinessId = stringId(page.instagram_business_account?.id);
  const pageAccessToken =
    typeof page.access_token === "string" ? page.access_token : "";

  return {
    pageId,
    pageName: page.name ?? "Unknown page",
    pageAccessToken,
    igBusinessId,
    igUsername: page.instagram_business_account?.username ?? null,
  };
}

async function normalizeConnectedPage(page: MetaGraphPage): Promise<ConnectedPage | null> {
  const pageId = stringId(page.id);
  if (!pageId) return null;

  const pageAccessToken =
    typeof page.access_token === "string" ? page.access_token : "";
  const fanCount = pageAccessToken
    ? await getPageFanCount(pageId, pageAccessToken)
    : null;
  const igBusinessId = stringId(page.instagram_business_account?.id);

  return {
    id: pageId,
    name: page.name ?? "Unknown page",
    ig: igBusinessId
      ? {
          id: igBusinessId,
          username: page.instagram_business_account?.username ?? null,
        }
      : null,
    fan_count: fanCount,
  };
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorReason = req.nextUrl.searchParams.get("error_reason");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const expectedState = req.cookies.get(META_OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: errorDescription || errorReason || error,
    });
  }

  if (!code) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: "Missing code in callback",
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: "Invalid OAuth state",
    });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: "Missing META env vars",
    });
  }

  const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenResult = await fetchMetaJson<MetaTokenResponse>(tokenUrl);
  const userAccessToken = tokenResult.json.access_token;

  if (!tokenResult.ok || !userAccessToken) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: getMetaErrorMessage("Token exchange failed", tokenResult.json),
    });
  }

  const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");
  pagesUrl.searchParams.set("access_token", userAccessToken);
  pagesUrl.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}"
  );

  const pagesResult = await fetchMetaJson<MetaAccountsResponse>(pagesUrl);

  if (!pagesResult.ok) {
    return redirectWithMetaStatus(appBaseUrl, {
      meta_connected: "0",
      meta_error: getMetaErrorMessage("Fetching pages failed", pagesResult.json),
    });
  }

  const rawPages = Array.isArray(pagesResult.json.data)
    ? pagesResult.json.data
    : [];
  const storedPages = rawPages
    .map(normalizeStoredPage)
    .filter((page): page is StoredPage => Boolean(page));
  const connectedPages = (
    await Promise.all(rawPages.map(normalizeConnectedPage))
  ).filter((page): page is ConnectedPage => Boolean(page));

  const response = redirectWithMetaStatus(appBaseUrl, {
    meta_connected: "1",
    pages: JSON.stringify(connectedPages),
  });

  response.cookies.set("meta_pages", JSON.stringify(storedPages), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_HOUR,
  });

  return response;
}
