import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type StoredPage = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igBusinessId: string | null;
  igUsername: string | null;
};

async function fetchPageFanCount(pageId: string, pageAccessToken: string) {
  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}`);
  url.searchParams.set("fields", "fan_count,followers_count,name");
  url.searchParams.set("access_token", pageAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json();
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
  const json = await res.json();
  if (!res.ok) return { username: null, followers_count: null, media_count: null };

  return {
    username: json.username ?? null,
    followers_count:
      typeof json.followers_count === "number" ? json.followers_count : null,
    media_count: typeof json.media_count === "number" ? json.media_count : null,
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
      const fb = await fetchPageFanCount(p.pageId, p.pageAccessToken);
      const ig = p.igBusinessId
        ? await fetchIgAccount(p.igBusinessId, p.pageAccessToken)
        : null;

      return {
        pageId: p.pageId,
        pageName: p.pageName,
        fbFanCount: fb.fan_count,
        fbFollowersCount: fb.followers_count,
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