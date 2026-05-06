import { NextRequest, NextResponse } from "next/server";

const SIXTY_DAYS = 60 * 60 * 24 * 60;

type LinkedInIdentity = {
  personalProfile: {
    sub: string | null;
    name: string | null;
    email: string | null;
  };
  organizations: Array<{ id: string; name: string }>;
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

function isLinkedInOrganization(
  value: { id: string; name: string } | null
): value is { id: string; name: string } {
  return Boolean(value);
}

async function fetchLinkedInIdentity(accessToken: string): Promise<LinkedInIdentity> {
  const meResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meJson = await meResponse.json();

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

  const stateCookie = req.cookies.get("linkedin_oauth_state")?.value;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${appBaseUrl}?linkedin_connected=0`);
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${appBaseUrl}?linkedin_connected=0`);
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
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(`${appBaseUrl}?linkedin_connected=0`);
  }

  const accessToken = String(tokenJson.access_token);
  const identity = await fetchLinkedInIdentity(accessToken);

  const response = NextResponse.redirect(`${appBaseUrl}?linkedin_connected=1`);
  response.cookies.set("linkedin_identity", JSON.stringify(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIXTY_DAYS,
  });

  response.cookies.set("linkedin_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
