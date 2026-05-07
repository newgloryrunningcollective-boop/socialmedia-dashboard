import { NextRequest, NextResponse } from "next/server";

const INSTAGRAM_OAUTH_STATE_COOKIE = "instagram_oauth_state";
const INSTAGRAM_OAUTH_PROFILE_COOKIE = "instagram_oauth_profile";
const TEN_MINUTES = 60 * 10;
const REQUIRED_INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "instagram_content_publish",
  "instagram_manage_upcoming_events",
  "instagram_shopping_tag_products",
  "instagram_branded_content_brand",
  "instagram_branded_content_ads_brand",
  "instagram_public_content_access",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_read_user_content",
  "business_management",
  "business_asset_user_profile_access",
  "ads_read",
  "ads_management",
  "catalog_management",
  "human_agent",
  "public_profile",
  "email",
  "instagram_business_basic",
  "instagram_business_manage_insights",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
  "instagram_business_content_publish",
];
const profileGroups = ["personal", "newglory"] as const;

type InstagramProfileGroup = (typeof profileGroups)[number];

function getInstagramClientId() {
  return process.env.INSTAGRAM_CLIENT_ID;
}

function getInstagramRedirectUri() {
  return (
    process.env.INSTAGRAM_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/connect/instagram/callback`
  );
}

function getInstagramScopes() {
  const configuredScopes =
    process.env.INSTAGRAM_SCOPES?.split(/[,\s]+/).map((scope) => scope.trim()).filter(Boolean) ??
    [];

  return Array.from(new Set([...configuredScopes, ...REQUIRED_INSTAGRAM_SCOPES])).join(",");
}

function getProfileGroup(value: string | null): InstagramProfileGroup {
  return profileGroups.includes(value as InstagramProfileGroup)
    ? (value as InstagramProfileGroup)
    : "personal";
}

export async function GET(req: NextRequest) {
  const clientId = getInstagramClientId();
  const redirectUri = getInstagramRedirectUri();
  const scopes = getInstagramScopes();
  const profileGroup = getProfileGroup(req.nextUrl.searchParams.get("profile"));

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing INSTAGRAM_CLIENT_ID or INSTAGRAM_REDIRECT_URI. Use the Instagram App ID from Instagram API > API setup with Instagram login.",
      },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });

  const response = NextResponse.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`
  );

  response.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  response.cookies.set(INSTAGRAM_OAUTH_PROFILE_COOKIE, profileGroup, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });

  return response;
}
