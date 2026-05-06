import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type MetaDebugPayload = {
  ok: boolean;
  hasMetaPagesCookie: boolean;
  message?: string;
  permissions?: unknown;
  accounts?: unknown;
};

function redactGraphTokens(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactGraphTokens);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        key.toLowerCase().includes("token") ? "<redacted>" : redactGraphTokens(child),
      ])
    );
  }

  return value;
}

async function fetchUserPermissions(userAccessToken: string) {
  const url = new URL("https://graph.facebook.com/v20.0/me/permissions");
  url.searchParams.set("access_token", userAccessToken);
  const res = await fetch(url.toString());
  return { ok: res.ok, data: redactGraphTokens(await res.json()) };
}

async function fetchRawAccounts(userAccessToken: string) {
  const url = new URL("https://graph.facebook.com/v20.0/me/accounts");
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}"
  );
  url.searchParams.set("access_token", userAccessToken);
  const res = await fetch(url.toString());
  return { ok: res.ok, data: redactGraphTokens(await res.json()) };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const hasMetaPagesCookie = Boolean(cookieStore.get("meta_pages")?.value);
  const userToken = req.nextUrl.searchParams.get("user_token");
  const debugToken = req.nextUrl.searchParams.get("debug_token");
  const requiredDebugToken = process.env.META_DEBUG_TOKEN;
  const debugAllowed =
    process.env.NODE_ENV !== "production" ||
    (requiredDebugToken && debugToken === requiredDebugToken);

  if (!debugAllowed) {
    return NextResponse.json(
      { ok: false, hasMetaPagesCookie, message: "Meta debug endpoint is disabled." },
      { status: 404 }
    );
  }

  if (!userToken) {
    const payload: MetaDebugPayload = {
      ok: false,
      hasMetaPagesCookie,
      message: "Missing ?user_token=... in URL",
    };
    return NextResponse.json(payload);
  }

  const permissions = await fetchUserPermissions(userToken);
  const accounts = await fetchRawAccounts(userToken);

  const payload: MetaDebugPayload = {
    ok: true,
    hasMetaPagesCookie,
    permissions,
    accounts,
  };

  return NextResponse.json(payload);
}
