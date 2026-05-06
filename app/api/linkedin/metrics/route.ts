import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202604";

type LinkedInIdentity = {
  personalProfile: {
    sub: string | null;
    personId?: string | null;
    name: string | null;
    email: string | null;
    followersCount?: number | null;
    connectionsCount?: number | null;
    message?: string | null;
  };
  organizations: LinkedInOrganizationMetric[];
};

type LinkedInOrganizationMetric = {
  id: string;
  name: string;
  followersCount?: number | null;
  organicFollowersCount?: number | null;
  paidFollowersCount?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  engagementRate?: number | null;
  message?: string | null;
};

type LinkedInAccessCookie = {
  accessToken?: string;
  expiresAt?: number;
  scope?: string | null;
};

type LinkedInApiError = {
  message?: string;
  serviceErrorCode?: number;
  status?: number;
};

type LinkedInNetworkSizeResponse = LinkedInApiError & {
  firstDegreeSize?: number;
};

type LinkedInMemberFollowersResponse = LinkedInApiError & {
  elements?: Array<{
    memberFollowersCount?: number;
  }>;
};

type LinkedInFollowerStatisticsResponse = LinkedInApiError & {
  elements?: Array<{
    followerCounts?: {
      organicFollowerCount?: number;
      paidFollowerCount?: number;
    };
  }>;
};

type LinkedInShareStatisticsResponse = LinkedInApiError & {
  elements?: Array<{
    totalShareStatistics?: {
      clickCount?: number;
      commentCount?: number;
      engagement?: number;
      impressionCount?: number;
      likeCount?: number;
      shareCount?: number;
    };
  }>;
};

function getLinkedInErrorMessage(payload: LinkedInApiError, fallback: string) {
  return payload.message ?? fallback;
}

function parseLinkedInAccessCookie(raw: string | undefined) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LinkedInAccessCookie;
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      scope: parsed.scope ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchLinkedInJson<T extends LinkedInApiError>(
  url: string,
  accessToken: string
) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Linkedin-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  const json = (await res.json()) as T;
  return { ok: res.ok, json };
}

async function fetchPersonalFollowers(accessToken: string) {
  const { ok, json } = await fetchLinkedInJson<LinkedInMemberFollowersResponse>(
    "https://api.linkedin.com/rest/memberFollowersCount?q=me",
    accessToken
  );

  if (!ok) {
    return {
      followersCount: null,
      message: getLinkedInErrorMessage(
        json,
        "LinkedIn personal follower count was not returned."
      ),
    };
  }

  return {
    followersCount:
      typeof json.elements?.[0]?.memberFollowersCount === "number"
        ? json.elements[0].memberFollowersCount
        : null,
    message: null,
  };
}

async function fetchPersonalConnections(
  personId: string | null | undefined,
  accessToken: string
) {
  if (!personId) {
    return {
      connectionsCount: null,
      message:
        "Reconnect LinkedIn after the latest update so the app can store your LinkedIn member ID for connection count.",
    };
  }

  const { ok, json } = await fetchLinkedInJson<LinkedInNetworkSizeResponse>(
    `https://api.linkedin.com/v2/connections/urn:li:person:${personId}`,
    accessToken
  );

  if (!ok) {
    return {
      connectionsCount: null,
      message: getLinkedInErrorMessage(
        json,
        "LinkedIn personal connection count was not returned."
      ),
    };
  }

  return {
    connectionsCount:
      typeof json.firstDegreeSize === "number" ? json.firstDegreeSize : null,
    message: null,
  };
}

async function enrichPersonalProfile(
  personalProfile: LinkedInIdentity["personalProfile"],
  accessToken: string
): Promise<LinkedInIdentity["personalProfile"]> {
  const [followers, connections] = await Promise.all([
    fetchPersonalFollowers(accessToken),
    fetchPersonalConnections(personalProfile.personId, accessToken),
  ]);
  const messages = [followers.message, connections.message].filter(
    (message): message is string => Boolean(message)
  );

  return {
    ...personalProfile,
    followersCount: followers.followersCount,
    connectionsCount: connections.connectionsCount,
    message: messages[0] ?? null,
  };
}

async function fetchOrganizationFollowers(orgId: string, accessToken: string) {
  const url = `https://api.linkedin.com/v2/networkSizes/urn:li:organization:${orgId}?edgeType=CompanyFollowedByMember`;
  const { ok, json } = await fetchLinkedInJson<LinkedInNetworkSizeResponse>(
    url,
    accessToken
  );

  if (!ok) {
    return {
      followersCount: null,
      message: getLinkedInErrorMessage(json, "LinkedIn follower count was not returned."),
    };
  }

  return {
    followersCount:
      typeof json.firstDegreeSize === "number" ? json.firstDegreeSize : null,
    message: null,
  };
}

async function fetchOrganizationFollowerBreakdown(
  orgId: string,
  accessToken: string
) {
  const encodedUrn = encodeURIComponent(`urn:li:organization:${orgId}`);
  const url = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`;
  const { ok, json } = await fetchLinkedInJson<LinkedInFollowerStatisticsResponse>(
    url,
    accessToken
  );

  if (!ok) {
    return {
      organicFollowersCount: null,
      paidFollowersCount: null,
      message: getLinkedInErrorMessage(
        json,
        "LinkedIn follower statistics were not returned."
      ),
    };
  }

  const followerCounts = json.elements?.[0]?.followerCounts;

  return {
    organicFollowersCount:
      typeof followerCounts?.organicFollowerCount === "number"
        ? followerCounts.organicFollowerCount
        : null,
    paidFollowersCount:
      typeof followerCounts?.paidFollowerCount === "number"
        ? followerCounts.paidFollowerCount
        : null,
    message: null,
  };
}

async function fetchOrganizationShareStatistics(
  orgId: string,
  accessToken: string
) {
  const encodedUrn = encodeURIComponent(`urn:li:organization:${orgId}`);
  const url = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`;
  const { ok, json } = await fetchLinkedInJson<LinkedInShareStatisticsResponse>(
    url,
    accessToken
  );

  if (!ok) {
    return {
      impressions: null,
      clicks: null,
      likes: null,
      comments: null,
      shares: null,
      engagementRate: null,
      message: getLinkedInErrorMessage(
        json,
        "LinkedIn share statistics were not returned."
      ),
    };
  }

  const stats = json.elements?.[0]?.totalShareStatistics;

  return {
    impressions: typeof stats?.impressionCount === "number" ? stats.impressionCount : null,
    clicks: typeof stats?.clickCount === "number" ? stats.clickCount : null,
    likes: typeof stats?.likeCount === "number" ? stats.likeCount : null,
    comments: typeof stats?.commentCount === "number" ? stats.commentCount : null,
    shares: typeof stats?.shareCount === "number" ? stats.shareCount : null,
    engagementRate: typeof stats?.engagement === "number" ? stats.engagement : null,
    message: null,
  };
}

async function enrichOrganizationMetrics(
  organization: LinkedInOrganizationMetric,
  accessToken: string
): Promise<LinkedInOrganizationMetric> {
  const [followers, followerBreakdown, shareStatistics] = await Promise.all([
    fetchOrganizationFollowers(organization.id, accessToken),
    fetchOrganizationFollowerBreakdown(organization.id, accessToken),
    fetchOrganizationShareStatistics(organization.id, accessToken),
  ]);
  const messages = [
    followers.message,
    followerBreakdown.message,
    shareStatistics.message,
  ].filter((message): message is string => Boolean(message));

  return {
    ...organization,
    followersCount: followers.followersCount,
    organicFollowersCount: followerBreakdown.organicFollowersCount,
    paidFollowersCount: followerBreakdown.paidFollowersCount,
    impressions: shareStatistics.impressions,
    clicks: shareStatistics.clicks,
    likes: shareStatistics.likes,
    comments: shareStatistics.comments,
    shares: shareStatistics.shares,
    engagementRate: shareStatistics.engagementRate,
    message: messages[0] ?? null,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("linkedin_identity")?.value;
  const accessCookie = parseLinkedInAccessCookie(
    cookieStore.get("linkedin_access")?.value
  );

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "No connected LinkedIn account found. Connect first." },
      { status: 400 }
    );
  }

  try {
    const identity: LinkedInIdentity = JSON.parse(raw);
    const personalProfile = accessCookie
      ? await enrichPersonalProfile(identity.personalProfile, accessCookie.accessToken)
      : {
          ...identity.personalProfile,
          message:
            "Reconnect LinkedIn once to activate live personal follower and connection statistics.",
        };
    const organizations = accessCookie
      ? await Promise.all(
          identity.organizations.map((organization) =>
            enrichOrganizationMetrics(organization, accessCookie.accessToken)
          )
        )
      : identity.organizations.map((organization) => ({
          ...organization,
          message:
            "Reconnect LinkedIn once to activate live organization statistics.",
        }));

    return NextResponse.json({
      ok: true,
      identity: {
        ...identity,
        personalProfile,
        organizations,
      },
      accessScope: accessCookie?.scope ?? null,
      message: accessCookie
        ? null
        : "LinkedIn is connected, but the access token for live statistics is missing or expired. Reconnect LinkedIn.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid LinkedIn identity cookie." },
      { status: 400 }
    );
  }
}
