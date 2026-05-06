import { NextRequest, NextResponse } from "next/server";

const SIXTY_DAYS = 60 * 60 * 24 * 60;

type LinkedInIdentity = {
  personalProfile: {
    sub: string | null;
    personId: string | null;
    name: string | null;
    email: string | null;
  };
  organizations: Array<{ id: string; name: string }>;
};

type LinkedInProfileResponse = {
  id?: string | number;
};

type LinkedInOrganizationAclElement = {
  "organizationalTarget~"?: {
    id?: string | number;
    localizedName?: string | null;
  };
};

type LinkedInOrganizationAclsResponse = {
  elements?: LinkedInOrganizationAclElement[];
};

type LinkedInTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function isLinkedInOrganization(
  value: { id: string; name: string } | null
): value is { id: string; name: string } {
  return Boolean(value);
}

function redirectWithLinkedInStatus(
  appBaseUrl: string,
  params: Record<string, string>
) {
  const url = new URL(appBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(url);
  response.cookies.set("linkedin_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

async function fetchLinkedInIdentity(accessToken: string): Promise<LinkedInIdentity> {
  const meResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meJson = await meResponse.json();

  const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profileJson = profileResponse.ok
    ? ((await profileResponse.json()) as LinkedInProfileResponse)
    : {};

  const orgsRes = await fetch(
    "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(id,localizedName)))",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const orgsJson = (await orgsRes.json()) as LinkedInOrganizationAclsResponse;

  const organizations = Array.isArray(orgsJson?.elements)
    ? orgsJson.elements
        .map((element) => {
          const org = element?.["organizationalTarget~"];
          if (!org?.id) return null;
          return {
            id: String(org.id),
            name: String(org.localizedName ?? `Organization ${org.id}`),
          };
        })
        .filter(isLinkedInOrganization)
    : [];

  return {
    personalProfile: {
      sub: meJson?.sub ? String(meJson.sub) : null,
      personId: profileJson?.id ? String(profileJson.id) : null,
      name: meJson?.name ? String(meJson.name) : null,
      email: meJson?.email ? String(meJson.email) : null,
    },
    organizations,
  };
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const stateCookie = req.cookies.get("linkedin_oauth_state")?.value;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error) {
    return redirectWithLinkedInStatus(appBaseUrl, {
      linkedin_connected: "0",
      linkedin_error: errorDescription || error,
    });
  }

  if (!code) {
    return redirectWithLinkedInStatus(appBaseUrl, {
      linkedin_connected: "0",
      linkedin_error: "Missing code in callback",
    });
  }

  if (!state || !stateCookie || state !== stateCookie) {
    return redirectWithLinkedInStatus(appBaseUrl, {
      linkedin_connected: "0",
      linkedin_error: "Invalid OAuth state",
    });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return redirectWithLinkedInStatus(appBaseUrl, {
      linkedin_connected: "0",
      linkedin_error: "Missing LinkedIn env vars",
    });
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenJson = (await tokenRes.json()) as LinkedInTokenResponse;

  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectWithLinkedInStatus(appBaseUrl, {
      linkedin_connected: "0",
      linkedin_error:
        tokenJson.error_description || tokenJson.error || "Token exchange failed",
    });
  }

  const accessToken = String(tokenJson.access_token);
  const identity = await fetchLinkedInIdentity(accessToken);
  const expiresIn =
    typeof tokenJson.expires_in === "number" && tokenJson.expires_in > 0
      ? tokenJson.expires_in
      : SIXTY_DAYS;

  const response = redirectWithLinkedInStatus(appBaseUrl, {
    linkedin_connected: "1",
  });
  response.cookies.set("linkedin_identity", JSON.stringify(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIXTY_DAYS,
  });

  response.cookies.set(
    "linkedin_access",
    JSON.stringify({
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: tokenJson.scope ?? null,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.min(expiresIn, SIXTY_DAYS),
    }
  );

  return response;
}
