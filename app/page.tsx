"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Tab = "Home" | "Statistics" | "Planning";
type Range = "Day" | "Week" | "Month" | "Year";

type Task = {
  id: string;
  text: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  source: "Manual" | "Auto";
};

type CalendarItem = {
  id: string;
  title: string;
  platform: string;
  date: string;
  time: string;
  status: "Draft" | "Scheduled" | "Posted";
};

type ConnectedPage = {
  id: string;
  name: string;
  ig: { id: string; username: string | null } | null;
  fan_count: number | null;
};

type MetaMetric = {
  pageId: string;
  pageName: string;
  fbFanCount: number | null;
  fbFollowersCount: number | null;
  fbViews?: number | null;
  fbImpressions?: number | null;
  fbPostEngagements?: number | null;
  fbFollowerSnapshot?: number | null;
  fbNewFollowers?: number | null;
  fbRecentPostCount?: number | null;
  fbRecentPostEngagements?: number | null;
  fbPosts?: ExternalContentMetric[];
  fbInsightsMessage?: string | null;
  fbPostsMessage?: string | null;
  igBusinessId: string | null;
  igUsername: string | null;
  igFollowersCount: number | null;
  igMediaCount: number | null;
};

type MetaMetricsResponse = {
  ok: boolean;
  message?: string;
  metrics?: MetaMetric[];
};

type InstagramProfileGroup = "personal" | "newglory";
type InstagramContentSource = "owned" | "owned_with_collaborators" | "collaborator" | "tagged" | "story";

type InstagramContentSummary = {
  rangeStart: string | null;
  rangeEnd: string | null;
  contentShared: number | null;
  feedMedia: number;
  taggedMedia: number;
  collaboratorMedia: number;
  activeStories: number;
};

type InstagramProfileInsights = {
  rangeStart: string;
  rangeEnd: string;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  accountsEngaged: number | null;
  profileViews: number | null;
  follows: number | null;
};

type InstagramCollaboratorMetric = {
  id: string | null;
  username: string | null;
  status: string | null;
};

type InstagramProfileMetric = {
  ok?: boolean;
  message?: string;
  profileGroup: InstagramProfileGroup;
  instagramUserId: string;
  username: string | null;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  connectedAt: number;
  media?: InstagramMediaMetric[];
  stories?: InstagramMediaMetric[];
  contentSummary?: InstagramContentSummary;
  insights?: InstagramProfileInsights | null;
  mediaMessage?: string | null;
  contributorMessage?: string | null;
  insightsMessage?: string | null;
};

type InstagramMediaMetric = {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  timestamp: string | null;
  username: string | null;
  ownerId: string | null;
  ownerUsername: string | null;
  sourceType: InstagramContentSource;
  isSharedToFeed: boolean | null;
  likeCount: number | null;
  commentsCount: number | null;
  viewCount: number | null;
  insightViews: number | null;
  insightReach: number | null;
  insightInteractions: number | null;
  insightShares: number | null;
  insightSaves: number | null;
  insightPlays: number | null;
  insightImpressions: number | null;
  collaborators: InstagramCollaboratorMetric[];
};

type InstagramMetricsResponse = {
  ok: boolean;
  message?: string;
  profiles?: InstagramProfileMetric[];
};

type LinkedInMetricsResponse = {
  ok: boolean;
  message?: string;
  identity?: {
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

type ExternalContentMetric = {
  id: string;
  message: string | null;
  createdTime: string | null;
  permalinkUrl: string | null;
  pictureUrl: string | null;
  reactionCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  viewCount?: number | null;
  likeCount?: number | null;
  replyCount?: number | null;
  repostCount?: number | null;
  quoteCount?: number | null;
  engagementCount?: number | null;
};

type ThreadsMetricsResponse = {
  ok: boolean;
  message?: string;
  profile?: {
    id: string | null;
    username: string | null;
    profilePictureUrl: string | null;
    biography: string | null;
  } | null;
  insights?: {
    views: number | null;
    likes: number | null;
    replies: number | null;
    reposts: number | null;
    quotes: number | null;
    followersCount: number | null;
  } | null;
  posts?: ExternalContentMetric[];
  profileMessage?: string | null;
  insightsMessage?: string | null;
  postsMessage?: string | null;
};

type TikTokMetricsResponse = {
  ok: boolean;
  message?: string;
  scope?: string;
  profile?: {
    data?: {
      user?: {
        open_id?: string;
        union_id?: string;
        avatar_url?: string;
        display_name?: string;
      };
    };
  };
  videos?: {
    videos?: Array<{ id?: string }>;
  } | null;
  videosMessage?: string | null;
};

type LiveMetricsState = {
  meta: MetaMetricsResponse | null;
  instagram: InstagramMetricsResponse | null;
  linkedin: LinkedInMetricsResponse | null;
  threads: ThreadsMetricsResponse | null;
  tiktok: TikTokMetricsResponse | null;
  loading: boolean;
};

type DashboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

type ConnectionSummary = {
  metaConnected: boolean;
  metaError: string | null;
  connectedPages: ConnectedPage[];
  instagramConnected: boolean;
  instagramProfile: string | null;
  instagramError: string | null;
  linkedInConnected: boolean;
  linkedInError: boolean;
  linkedInErrorMessage: string | null;
  threadsConnected: boolean;
  threadsError: string | null;
  tikTokConnected: boolean;
  tikTokError: string | null;
};

const tabs: Tab[] = ["Home", "Statistics", "Planning"];
const ranges: Range[] = ["Day", "Week", "Month", "Year"];
const connectedProfiles = {
  personal: {
    instagram: "@thijs.wijma",
    facebook: "Personal Facebook Page",
    linkedin: "https://www.linkedin.com/in/thijs-w-74b309192",
    threads: "Personal Threads",
    tiktok: "Personal TikTok",
  },
  newGlory: {
    instagram: "@new_glory_runningcollective",
    facebook: "https://www.facebook.com/people/New-Glory-Running-Collective/61572088179385/",
    linkedin: "https://www.linkedin.com/company/new-glory-running-collective/",
  },
};

const initialLiveMetrics: LiveMetricsState = {
  meta: null,
  instagram: null,
  linkedin: null,
  threads: null,
  tiktok: null,
  loading: true,
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isConnectedPage(value: unknown): value is ConnectedPage {
  if (!value || typeof value !== "object") return false;

  const page = value as Partial<ConnectedPage>;
  const ig = page.ig as Partial<ConnectedPage["ig"]> | null | undefined;

  return (
    typeof page.id === "string" &&
    typeof page.name === "string" &&
    (page.fan_count === null || typeof page.fan_count === "number") &&
    (page.ig === null ||
      (Boolean(ig) &&
        typeof ig?.id === "string" &&
        (ig.username === null || typeof ig?.username === "string")))
  );
}

function parseConnectedPages(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isConnectedPage) : [];
  } catch {
    return [];
  }
}

function parseConnectionSummary(params: Record<string, string | string[] | undefined>): ConnectionSummary {
  const instagramStatus = firstParam(params.instagram_connected);
  const linkedInStatus = firstParam(params.linkedin_connected);
  const threadsStatus = firstParam(params.threads_connected);
  const tikTokStatus = firstParam(params.tiktok_connected);

  return {
    metaConnected: firstParam(params.meta_connected) === "1",
    metaError: firstParam(params.meta_error) ?? null,
    connectedPages: parseConnectedPages(params.pages),
    instagramConnected: instagramStatus === "1",
    instagramProfile: firstParam(params.instagram_profile) ?? null,
    instagramError:
      instagramStatus === "0"
        ? firstParam(params.instagram_error) ?? "Instagram connection failed."
        : null,
    linkedInConnected: linkedInStatus === "1",
    linkedInError: linkedInStatus === "0",
    linkedInErrorMessage:
      linkedInStatus === "0"
        ? firstParam(params.linkedin_error) ?? "LinkedIn connection failed."
        : null,
    threadsConnected: threadsStatus === "1",
    threadsError:
      threadsStatus === "0"
        ? firstParam(params.threads_error) ?? "Threads connection failed."
        : null,
    tikTokConnected: tikTokStatus === "1",
    tikTokError:
      tikTokStatus === "0" ? firstParam(params.tiktok_error) ?? "TikTok connection failed." : null,
  };
}

function formatStat(value: number | null | undefined) {
  return typeof value === "number" ? new Intl.NumberFormat("en").format(value) : "n/a";
}

function formatCompactStat(value: number | null | undefined) {
  return typeof value === "number"
    ? new Intl.NumberFormat("en", { notation: "compact" }).format(value)
    : "n/a";
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number") return "n/a";
  const normalized = value > 1 ? value / 100 : value;
  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(normalized);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "Last 30 full days";
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function normalizeHandle(value: string | null | undefined) {
  return value?.replace(/^@/, "").toLowerCase() ?? "";
}

function getMediaPreviewUrl(media: InstagramMediaMetric) {
  return media.thumbnailUrl ?? media.mediaUrl;
}

function getProfileLabel(profile: InstagramProfileMetric) {
  return profile.profileGroup === "personal" ? "Personal" : "New Glory";
}

function getProfileDisplayName(profile: InstagramProfileMetric | undefined, fallback: string) {
  return profile?.username ? `@${profile.username}` : fallback;
}

function getInitials(value: string) {
  return value
    .replace("@", "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getPostEngagement(media: InstagramMediaMetric) {
  return (
    media.insightInteractions ??
    (media.likeCount ?? 0) +
      (media.commentsCount ?? 0) +
      (media.insightShares ?? 0) +
      (media.insightSaves ?? 0)
  );
}

function getPostViews(media: InstagramMediaMetric) {
  return (
    media.insightViews ??
    media.viewCount ??
    media.insightPlays ??
    media.insightImpressions ??
    null
  );
}

function getContentSourceLabel(sourceType: InstagramContentSource) {
  if (sourceType === "collaborator" || sourceType === "tagged") return "Contributor";
  if (sourceType === "owned_with_collaborators") return "Owned + collaborators";
  if (sourceType === "story") return "Story";
  return "Owned";
}

function getContentSourceClasses(sourceType: InstagramContentSource) {
  if (sourceType === "collaborator" || sourceType === "tagged") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  if (sourceType === "story") {
    return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-white/10 bg-white/10 text-slate-200";
}

function getProfileContent(profile: InstagramProfileMetric) {
  const seen = new Set<string>();

  return [...(profile.media ?? []), ...(profile.stories ?? [])]
    .filter((item) => {
      if (!item.id) return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
}

function getRegularPosts(profile: InstagramProfileMetric | undefined) {
  return (profile?.media ?? []).filter(
    (item) => item.sourceType !== "story" && item.sourceType !== "collaborator" && item.sourceType !== "tagged"
  );
}

function getContributorPosts(profile: InstagramProfileMetric | undefined) {
  return (profile?.media ?? []).filter(
    (item) => item.sourceType === "collaborator" || item.sourceType === "tagged"
  );
}

function getStories(profile: InstagramProfileMetric | undefined) {
  return profile?.stories ?? [];
}

function sumProfileInsights(
  profiles: InstagramProfileMetric[],
  field: keyof Pick<
    InstagramProfileInsights,
    "views" | "reach" | "interactions" | "accountsEngaged" | "profileViews" | "follows"
  >
) {
  return profiles.reduce((sum, profile) => sum + (profile.insights?.[field] ?? 0), 0);
}

function sumProfileContent(profiles: InstagramProfileMetric[]) {
  return profiles.reduce(
    (sum, profile) => sum + (profile.contentSummary?.contentShared ?? 0),
    0
  );
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const json = (await res.json()) as T;
  return json;
}

function useLiveMetrics(): LiveMetricsState {
  const [metrics, setMetrics] = useState<LiveMetricsState>(initialLiveMetrics);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      const [meta, instagram, linkedin, threads, tiktok] = await Promise.all([
        fetchJson<MetaMetricsResponse>("/api/meta/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
        fetchJson<InstagramMetricsResponse>("/api/instagram/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
        fetchJson<LinkedInMetricsResponse>("/api/linkedin/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
        fetchJson<ThreadsMetricsResponse>("/api/threads/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
        fetchJson<TikTokMetricsResponse>("/api/tiktok/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      ]);

      if (!cancelled) {
        setMetrics({ meta, instagram, linkedin, threads, tiktok, loading: false });
      }
    }

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  return metrics;
}

function findNewGloryMeta(metrics: MetaMetric[] | undefined) {
  return metrics?.find((item) => {
    const pageName = item.pageName.toLowerCase();
    const igUsername = normalizeHandle(item.igUsername);
    return (
      pageName.includes("new glory") ||
      igUsername === normalizeHandle(connectedProfiles.newGlory.instagram)
    );
  });
}

function findPersonalMeta(metrics: MetaMetric[] | undefined) {
  const newGloryMeta = findNewGloryMeta(metrics);
  return metrics?.find((item) => item.pageId !== newGloryMeta?.pageId);
}

function findInstagramProfile(
  profiles: InstagramProfileMetric[] | undefined,
  profileGroup: InstagramProfileGroup
) {
  return profiles?.find((profile) => profile.profileGroup === profileGroup);
}

function findLinkedInOrganization(
  organizations: LinkedInOrganizationMetric[] | undefined
) {
  return organizations?.find((organization) =>
    organization.name.toLowerCase().includes("new glory")
  );
}

const initialTasks: Task[] = [
  { id: "t1", text: "Review weekly content pillars", priority: "High", done: false, source: "Manual" },
  { id: "t2", text: "Post running club update at peak hour", priority: "Medium", done: false, source: "Auto" },
  { id: "t3", text: "Refine CTA on latest carousel", priority: "Low", done: true, source: "Manual" },
];

const initialPlan: CalendarItem[] = [
  { id: "p1", title: "Interval training reel", platform: "Instagram", date: "2026-05-07", time: "19:00", status: "Scheduled" },
  { id: "p2", title: "Community progress post", platform: "LinkedIn", date: "2026-05-08", time: "08:30", status: "Draft" },
];

export default function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const connectionSummary = parseConnectionSummary(use(searchParams));
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#312e81_0%,#0b1020_35%,#070b16_70%)] p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Social Analytics Suite</h1>
          <p className="mt-1 text-slate-300">Premium multi-account command center · Desktop-first</p>
          <div className="mt-3 flex gap-3 text-xs text-slate-300">
            <a href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </a>
            <a href="/terms" className="underline hover:text-white">
              Terms of Service
            </a>
            <a href="/data-deletion" className="underline hover:text-white">
              Data Deletion
            </a>
          </div>
        </header>

        <nav className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 ${
                activeTab === tab ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg" : "text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Home" && (
          <HomeTab {...connectionSummary} />
        )}
        {activeTab === "Statistics" && <StatisticsTab />}
        {activeTab === "Planning" && <PlanningTab />}
      </div>
    </main>
  );
}

function PremiumCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_48px_rgba(76,29,149,0.25)] backdrop-blur-xl">
      {children}
    </section>
  );
}

function HomeTab({
  metaConnected,
  metaError,
  connectedPages,
  instagramConnected,
  instagramProfile,
  instagramError,
  linkedInConnected,
  linkedInError,
  linkedInErrorMessage,
  threadsConnected,
  threadsError,
  tikTokConnected,
  tikTokError,
}: {
  metaConnected: boolean;
  metaError: string | null;
  connectedPages: ConnectedPage[];
  instagramConnected: boolean;
  instagramProfile: string | null;
  instagramError: string | null;
  linkedInConnected: boolean;
  linkedInError: boolean;
  linkedInErrorMessage: string | null;
  threadsConnected: boolean;
  threadsError: string | null;
  tikTokConnected: boolean;
  tikTokError: string | null;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const liveMetrics = useLiveMetrics();
  const newGloryMeta = findNewGloryMeta(liveMetrics.meta?.metrics);
  const personalMeta = findPersonalMeta(liveMetrics.meta?.metrics);
  const personalInstagram = findInstagramProfile(
    liveMetrics.instagram?.profiles,
    "personal"
  );
  const newGloryInstagram = findInstagramProfile(
    liveMetrics.instagram?.profiles,
    "newglory"
  );
  const instagramProfiles = [personalInstagram, newGloryInstagram].filter(
    (profile): profile is InstagramProfileMetric => Boolean(profile)
  );
  const recentInstagramPosts = instagramProfiles
    .flatMap((profile) =>
      getProfileContent(profile).map((media) => ({
        ...media,
        profile,
      }))
    )
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6);
  const linkedInOrganization = findLinkedInOrganization(
    liveMetrics.linkedin?.identity?.organizations
  );
  const threadsProfile = liveMetrics.threads?.profile;
  const tikTokUser = liveMetrics.tiktok?.profile?.data?.user;
  const totalKnownFollowers =
    (personalInstagram?.followersCount ?? 0) +
    (personalMeta?.fbFollowersCount ?? personalMeta?.fbFanCount ?? 0) +
    (newGloryInstagram?.followersCount ?? newGloryMeta?.igFollowersCount ?? 0) +
    (newGloryMeta?.fbFollowersCount ?? newGloryMeta?.fbFanCount ?? 0) +
    (liveMetrics.linkedin?.identity?.personalProfile.followersCount ?? 0) +
    (linkedInOrganization?.followersCount ?? 0) +
    (liveMetrics.threads?.insights?.followersCount ?? 0);
  const connectedPlatformCount = [
    Boolean(personalInstagram || newGloryInstagram),
    Boolean(personalMeta || newGloryMeta),
    Boolean(liveMetrics.linkedin?.identity),
    Boolean(threadsProfile),
    Boolean(tikTokUser),
  ].filter(Boolean).length;

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const addManualTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      { id: crypto.randomUUID(), text: newTask.trim(), priority: "Medium", done: false, source: "Manual" },
      ...prev,
    ]);
    setNewTask("");
  };

  const kpis = [
    { label: "Known Live Followers", value: liveMetrics.loading ? "Loading..." : formatStat(totalKnownFollowers) },
    { label: "Connected Sources", value: liveMetrics.loading ? "Loading..." : `${connectedPlatformCount}/5` },
    { label: "Live Data Status", value: liveMetrics.loading ? "Loading..." : "Ready" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <PremiumCard key={kpi.label}>
            <p className="text-sm text-slate-300">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold">{kpi.value}</p>
          </PremiumCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PremiumCard>
          <h2 className="mb-4 text-lg font-medium">Today’s Tasks (Manual + Smart)</h2>
          <div className="mb-3 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add manual task..."
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            />
            <button onClick={addManualTask} className="rounded-lg bg-indigo-500 px-3 py-2 text-sm hover:bg-indigo-400">
              Add
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                  <span className={task.done ? "line-through text-slate-500" : ""}>{task.text}</span>
                </label>
                <span className="text-xs text-slate-300">
                  {task.priority} · {task.source}
                </span>
              </li>
            ))}
          </ul>
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Recent Posts</h2>
          <InstagramRecentPosts posts={recentInstagramPosts} loading={liveMetrics.loading} />
        </PremiumCard>
      </div>

      <PremiumCard>
        <h2 className="mb-3 text-lg font-medium">Profile Groups</h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="mb-1 font-medium">Personal</p>
            <p className="text-slate-300">Instagram: {connectedProfiles.personal.instagram}</p>
            <a
              href={connectedProfiles.personal.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-300 underline"
            >
              LinkedIn profile
            </a>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="mb-1 font-medium">New Glory</p>
            <p className="text-slate-300">Instagram: {connectedProfiles.newGlory.instagram}</p>
            <a
              href={connectedProfiles.newGlory.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-300 underline"
            >
              LinkedIn company page
            </a>
          </div>
        </div>
      </PremiumCard>

      <LiveAccountsPanel
        liveMetrics={liveMetrics}
        personalInstagram={personalInstagram}
        newGloryInstagram={newGloryInstagram}
        personalMeta={personalMeta}
        newGloryMeta={newGloryMeta}
        linkedInOrganization={linkedInOrganization}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Connected Instagram Accounts</h2>
          {instagramConnected && (
            <p className="mb-2 text-sm text-emerald-300">
              Instagram {instagramProfile ?? "account"} connected successfully
            </p>
          )}
          {instagramError && (
            <p className="mb-2 text-sm text-red-300">Instagram connection failed: {instagramError}</p>
          )}
          <div className="space-y-2">
            <a
              href="/api/connect/instagram?profile=personal"
              className="inline-flex w-full justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400"
            >
              Connect Personal Instagram
            </a>
            <a
              href="/api/connect/instagram?profile=newglory"
              className="inline-flex w-full justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              Connect New Glory Instagram
            </a>
          </div>
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Connected Meta Accounts</h2>

          {!metaConnected && !metaError && (
            <div className="space-y-2">
              <p className="text-sm text-slate-300">No Meta accounts connected yet.</p>
              <a href="/api/connect/meta" className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
                Connect Meta (Facebook + Instagram)
              </a>
            </div>
          )}

          {metaError && (
            <div className="space-y-2">
              <p className="text-sm text-red-300">Meta connection failed: {metaError}</p>
              <a href="/api/connect/meta" className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
                Retry Meta Connect
              </a>
            </div>
          )}

          {metaConnected && (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-300">Meta connected successfully</p>
              {connectedPages.length === 0 ? (
                <p className="text-slate-300">No pages returned.</p>
              ) : (
                <ul className="space-y-2">
                  {connectedPages.map((p) => (
                    <li key={p.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-slate-400">
                        Page ID: {p.id}
                        {typeof p.fan_count === "number" ? ` · Followers: ${p.fan_count}` : " · Followers: n/a"}
                        {p.ig ? ` · IG: @${p.ig.username ?? "unknown"} (${p.ig.id})` : " · IG not linked"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Connected LinkedIn Accounts</h2>
          {linkedInConnected ? (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-300">LinkedIn connected successfully</p>
              <a href="/api/linkedin/metrics" className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
                View LinkedIn identity
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedInError && (
                <p className="text-sm text-red-300">
                  LinkedIn connection failed: {linkedInErrorMessage}
                </p>
              )}
              <p className="text-sm text-slate-300">No LinkedIn account connected yet.</p>
              <a href="/api/connect/linkedin" className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
                Connect LinkedIn
              </a>
            </div>
          )}
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Connected TikTok Account</h2>
          {tikTokConnected ? (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-300">TikTok connected successfully</p>
              <a href="/api/tiktok/metrics" className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
                View TikTok metrics
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {tikTokError && <p className="text-sm text-red-300">TikTok connection failed: {tikTokError}</p>}
              <p className="text-sm text-slate-300">No TikTok account connected yet.</p>
              <a href="/api/connect/tiktok" className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
                Connect TikTok
              </a>
            </div>
          )}
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Connected Threads Account</h2>
          {threadsConnected ? (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-300">Threads connected successfully</p>
              <a href="/api/threads/metrics" className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
                View Threads metrics
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {threadsError && <p className="text-sm text-red-300">Threads connection failed: {threadsError}</p>}
              <p className="text-sm text-slate-300">No Threads account connected yet.</p>
              <a href="/api/connect/threads" className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400">
                Connect Threads
              </a>
            </div>
          )}
        </PremiumCard>
      </div>
    </motion.div>
  );
}

function LiveAccountsPanel({
  liveMetrics,
  personalInstagram,
  newGloryInstagram,
  personalMeta,
  newGloryMeta,
  linkedInOrganization,
}: {
  liveMetrics: LiveMetricsState;
  personalInstagram: InstagramProfileMetric | undefined;
  newGloryInstagram: InstagramProfileMetric | undefined;
  personalMeta: MetaMetric | undefined;
  newGloryMeta: MetaMetric | undefined;
  linkedInOrganization: LinkedInOrganizationMetric | undefined;
}) {
  const linkedInProfile = liveMetrics.linkedin?.identity?.personalProfile;
  const threadsProfile = liveMetrics.threads?.profile;
  const tikTokUser = liveMetrics.tiktok?.profile?.data?.user;
  const newGloryInstagramUsername =
    newGloryInstagram?.username ?? newGloryMeta?.igUsername ?? null;

  return (
    <PremiumCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Live Linked Accounts</h2>
          <p className="text-sm text-slate-300">Connected accounts and live stats available from current API permissions.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
          {liveMetrics.loading ? "Refreshing..." : "Live check complete"}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AccountStatCard
          group="Personal"
          platform="Instagram"
          account={
            personalInstagram?.username
              ? `@${personalInstagram.username}`
              : connectedProfiles.personal.instagram
          }
          status={personalInstagram ? "Live" : "Connect Instagram"}
          avatarUrl={personalInstagram?.profilePictureUrl}
          href={
            personalInstagram?.username
              ? `https://www.instagram.com/${personalInstagram.username}/`
              : undefined
          }
          actionHref={personalInstagram ? undefined : "/api/connect/instagram?profile=personal"}
          actionLabel="Connect Personal Instagram"
          stats={[
            ["Followers", formatStat(personalInstagram?.followersCount)],
            ["Following", formatStat(personalInstagram?.followsCount)],
            ["Media", formatStat(personalInstagram?.mediaCount)],
            ["Views", formatStat(personalInstagram?.insights?.views)],
            ["Interactions", formatStat(personalInstagram?.insights?.interactions)],
            ["Shared", formatStat(personalInstagram?.contentSummary?.contentShared)],
            ["Type", personalInstagram?.accountType ?? "Business account required"],
          ]}
          posts={getRegularPosts(personalInstagram)}
          stories={getStories(personalInstagram)}
          contributorPosts={getContributorPosts(personalInstagram)}
          postsMessage={personalInstagram?.mediaMessage}
          contributorMessage={personalInstagram?.contributorMessage}
          insightsMessage={personalInstagram?.insightsMessage}
        />

        <AccountStatCard
          group="New Glory"
          platform="Instagram"
          account={
            newGloryInstagram?.username
              ? `@${newGloryInstagram.username}`
              : newGloryInstagramUsername
                ? `@${newGloryInstagramUsername}`
                : connectedProfiles.newGlory.instagram
          }
          status={
            newGloryInstagram
              ? "Live"
              : newGloryMeta?.igBusinessId
                ? "Live via Meta"
                : "Connect Instagram"
          }
          avatarUrl={newGloryInstagram?.profilePictureUrl}
          href={
            newGloryInstagramUsername
              ? `https://www.instagram.com/${newGloryInstagramUsername}/`
              : undefined
          }
          actionHref={newGloryInstagram ? undefined : "/api/connect/instagram?profile=newglory"}
          actionLabel="Connect New Glory Instagram"
          stats={[
            [
              "Followers",
              formatStat(
                newGloryInstagram?.followersCount ?? newGloryMeta?.igFollowersCount
              ),
            ],
            ["Following", formatStat(newGloryInstagram?.followsCount)],
            [
              "Media",
              formatStat(newGloryInstagram?.mediaCount ?? newGloryMeta?.igMediaCount),
            ],
            ["Views", formatStat(newGloryInstagram?.insights?.views)],
            ["Interactions", formatStat(newGloryInstagram?.insights?.interactions)],
            ["Shared", formatStat(newGloryInstagram?.contentSummary?.contentShared)],
            ["Type", newGloryInstagram?.accountType ?? "Business account required"],
          ]}
          posts={getRegularPosts(newGloryInstagram)}
          stories={getStories(newGloryInstagram)}
          contributorPosts={getContributorPosts(newGloryInstagram)}
          postsMessage={newGloryInstagram?.mediaMessage}
          contributorMessage={newGloryInstagram?.contributorMessage}
          insightsMessage={newGloryInstagram?.insightsMessage}
        />

        <AccountStatCard
          group="Personal"
          platform="Facebook"
          account={personalMeta?.pageName ?? connectedProfiles.personal.facebook}
          status={personalMeta ? "Live" : "Connect personal Facebook Page"}
          stats={[
            [
              "Followers",
              formatStat(
                personalMeta?.fbFollowersCount ??
                  personalMeta?.fbFollowerSnapshot
              ),
            ],
            ["Fans", formatStat(personalMeta?.fbFanCount)],
            ["Views", formatStat(personalMeta?.fbViews)],
            ["Impressions", formatStat(personalMeta?.fbImpressions)],
            ["Post engagements", formatStat(personalMeta?.fbPostEngagements)],
            ["New followers", formatStat(personalMeta?.fbNewFollowers)],
            ["Recent posts", formatStat(personalMeta?.fbRecentPostCount)],
            [
              "Recent post interactions",
              formatStat(personalMeta?.fbRecentPostEngagements),
            ],
          ]}
          externalPosts={personalMeta?.fbPosts}
          externalPostsPlatform="Facebook"
          actionHref={personalMeta ? undefined : "/api/connect/meta"}
          actionLabel="Connect Meta"
          postsMessage={personalMeta?.fbPostsMessage}
          insightsMessage={
            personalMeta?.fbInsightsMessage ??
            (!personalMeta
              ? "Meta only returns Facebook stats for Pages you manage. If this is a private Facebook profile, create or connect a personal/professional Page to show stats."
              : null)
          }
        />

        <AccountStatCard
          group="New Glory"
          platform="Facebook"
          account={newGloryMeta?.pageName ?? "New Glory Running Collective"}
          status={newGloryMeta ? "Live" : "Connect Meta"}
          href={connectedProfiles.newGlory.facebook}
          stats={[
            [
              "Followers",
              formatStat(
                newGloryMeta?.fbFollowersCount ??
                  newGloryMeta?.fbFollowerSnapshot
              ),
            ],
            ["Fans", formatStat(newGloryMeta?.fbFanCount)],
            ["Views", formatStat(newGloryMeta?.fbViews)],
            ["Impressions", formatStat(newGloryMeta?.fbImpressions)],
            ["Post engagements", formatStat(newGloryMeta?.fbPostEngagements)],
            ["New followers", formatStat(newGloryMeta?.fbNewFollowers)],
            ["Recent posts", formatStat(newGloryMeta?.fbRecentPostCount)],
            [
              "Recent post interactions",
              formatStat(newGloryMeta?.fbRecentPostEngagements),
            ],
          ]}
          externalPosts={newGloryMeta?.fbPosts}
          externalPostsPlatform="Facebook"
          postsMessage={newGloryMeta?.fbPostsMessage}
          insightsMessage={newGloryMeta?.fbInsightsMessage}
        />

        <AccountStatCard
          group="Personal"
          platform="LinkedIn"
          account={linkedInProfile?.name ?? "Thijs Wijma"}
          status={linkedInProfile ? "Connected" : "Connect LinkedIn"}
          href={connectedProfiles.personal.linkedin}
          stats={[
            ["Profile ID", linkedInProfile?.sub ?? "n/a"],
            ["Email", linkedInProfile?.email ?? "n/a"],
            ["Followers", formatStat(linkedInProfile?.followersCount)],
            ["Connections", formatStat(linkedInProfile?.connectionsCount)],
          ]}
          insightsMessage={linkedInProfile?.message ?? liveMetrics.linkedin?.message}
        />

        <AccountStatCard
          group="New Glory"
          platform="LinkedIn"
          account={linkedInOrganization?.name ?? "New Glory Running Collective"}
          status={linkedInOrganization ? "Connected" : "Connect LinkedIn admin"}
          href={connectedProfiles.newGlory.linkedin}
          actionHref={linkedInOrganization ? undefined : "/api/connect/linkedin?mode=organization"}
          actionLabel="Connect LinkedIn admin"
          stats={[
            ["Organization ID", linkedInOrganization?.id ?? "n/a"],
            ["Followers", formatStat(linkedInOrganization?.followersCount)],
            ["Organic followers", formatStat(linkedInOrganization?.organicFollowersCount)],
            ["Paid followers", formatStat(linkedInOrganization?.paidFollowersCount)],
            ["Impressions", formatStat(linkedInOrganization?.impressions)],
            ["Clicks", formatStat(linkedInOrganization?.clicks)],
            ["Likes", formatStat(linkedInOrganization?.likes)],
            ["Comments", formatStat(linkedInOrganization?.comments)],
            ["Shares", formatStat(linkedInOrganization?.shares)],
            ["Engagement rate", formatPercent(linkedInOrganization?.engagementRate)],
          ]}
          insightsMessage={linkedInOrganization?.message}
        />

        <AccountStatCard
          group="Personal"
          platform="Threads"
          account={
            threadsProfile?.username
              ? `@${threadsProfile.username}`
              : connectedProfiles.personal.threads
          }
          status={threadsProfile ? "Live" : "Connect Threads"}
          avatarUrl={threadsProfile?.profilePictureUrl}
          href={
            threadsProfile?.username
              ? `https://www.threads.net/@${threadsProfile.username}`
              : undefined
          }
          actionHref={threadsProfile ? undefined : "/api/connect/threads"}
          actionLabel="Connect Threads"
          stats={[
            ["Followers", formatStat(liveMetrics.threads?.insights?.followersCount)],
            ["Views", formatStat(liveMetrics.threads?.insights?.views)],
            ["Likes", formatStat(liveMetrics.threads?.insights?.likes)],
            ["Replies", formatStat(liveMetrics.threads?.insights?.replies)],
            ["Reposts", formatStat(liveMetrics.threads?.insights?.reposts)],
            ["Quotes", formatStat(liveMetrics.threads?.insights?.quotes)],
            ["Recent posts", formatStat(liveMetrics.threads?.posts?.length)],
          ]}
          externalPosts={liveMetrics.threads?.posts}
          externalPostsPlatform="Threads"
          postsMessage={liveMetrics.threads?.postsMessage}
          insightsMessage={liveMetrics.threads?.insightsMessage}
        />

        <AccountStatCard
          group="Personal"
          platform="TikTok"
          account={tikTokUser?.display_name ?? connectedProfiles.personal.tiktok}
          status={tikTokUser ? "Connected" : "Connect TikTok"}
          stats={[
            ["Open ID", tikTokUser?.open_id ?? "n/a"],
            ["Videos", liveMetrics.tiktok?.videos?.videos?.length?.toString() ?? liveMetrics.tiktok?.videosMessage ?? "n/a"],
          ]}
        />
      </div>
    </PremiumCard>
  );
}

function ProfileAvatar({
  imageUrl,
  label,
}: {
  imageUrl?: string | null;
  label: string;
}) {
  return (
    <div
      aria-label={`${label} profile picture`}
      className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-indigo-500/20 bg-cover bg-center text-sm font-semibold text-white"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {!imageUrl && (
        <span className="flex h-full w-full items-center justify-center">
          {getInitials(label) || "IG"}
        </span>
      )}
    </div>
  );
}

function InstagramPostPreview({
  media,
  compact = false,
}: {
  media: InstagramMediaMetric;
  compact?: boolean;
}) {
  const previewUrl = getMediaPreviewUrl(media);
  const sourceLabel = getContentSourceLabel(media.sourceType);
  const ownerLabel =
    media.sourceType === "collaborator" || media.sourceType === "tagged"
      ? media.ownerUsername
        ? `Main poster: @${media.ownerUsername}`
        : "Main poster differs"
      : null;
  const content = (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/5">
      <div className="relative">
        <div
          className={compact ? "aspect-square bg-black/30 bg-cover bg-center" : "aspect-video bg-black/30 bg-cover bg-center"}
          style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
        >
          {!previewUrl && (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
              No preview
            </div>
          )}
        </div>
        <span className={`absolute left-2 top-2 rounded-full border px-2 py-1 text-[10px] font-medium ${getContentSourceClasses(media.sourceType)}`}>
          {sourceLabel}
        </span>
      </div>
      <div className="space-y-1 p-2 text-xs">
        <p className="line-clamp-2 text-slate-200">{media.caption ?? media.mediaType ?? "Instagram post"}</p>
        <p className="text-slate-400">{formatDate(media.timestamp)}</p>
        {ownerLabel && <p className="text-amber-100">{ownerLabel}</p>}
        {media.collaborators.length > 0 && (
          <p className="line-clamp-1 text-slate-400">
            Collaborators: {media.collaborators.map((item) => item.username ? `@${item.username}` : item.id).join(", ")}
          </p>
        )}
        <p className="text-slate-300">
          {formatCompactStat(getPostViews(media))} views · {formatCompactStat(getPostEngagement(media))} interactions
        </p>
        {!compact && (
          <p className="text-slate-400">
            {formatCompactStat(media.likeCount)} likes · {formatCompactStat(media.commentsCount)} comments · {formatCompactStat(media.insightShares)} shares
          </p>
        )}
      </div>
    </div>
  );

  return media.permalink ? (
    <a href={media.permalink} target="_blank" rel="noreferrer" className="block hover:opacity-90">
      {content}
    </a>
  ) : (
    content
  );
}

function InstagramRecentPosts({
  posts,
  loading,
}: {
  posts: Array<InstagramMediaMetric & { profile: InstagramProfileMetric }>;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-slate-300">Loading recent Instagram posts...</p>;
  }

  if (!posts.length) {
    return (
      <p className="text-sm text-slate-300">
        Connect Instagram accounts to display recent post previews here.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {posts.slice(0, 4).map((post) => (
        <div key={`${post.profile.profileGroup}-${post.id}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="mb-2 flex items-center gap-2">
            <ProfileAvatar
              imageUrl={post.profile.profilePictureUrl}
              label={post.profile.username ?? getProfileLabel(post.profile)}
            />
            <div>
              <p className="text-xs text-slate-400">{getProfileLabel(post.profile)}</p>
              <p className="text-sm font-medium">@{post.profile.username}</p>
            </div>
          </div>
          <InstagramPostPreview media={post} compact />
        </div>
      ))}
    </div>
  );
}

function ExternalPostPreview({
  post,
  platform = "Facebook",
}: {
  post: ExternalContentMetric;
  platform?: "Facebook" | "Threads";
}) {
  const secondaryLine =
    platform === "Threads"
      ? `${formatCompactStat(post.viewCount)} views · ${formatCompactStat(post.likeCount)} likes · ${formatCompactStat(post.replyCount)} replies`
      : `${formatCompactStat(post.reactionCount)} reactions · ${formatCompactStat(post.commentCount)} comments · ${formatCompactStat(post.shareCount)} shares`;
  const content = (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/5">
      <div
        className="aspect-video bg-black/30 bg-cover bg-center"
        style={post.pictureUrl ? { backgroundImage: `url(${post.pictureUrl})` } : undefined}
      >
        {!post.pictureUrl && (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-1 p-2 text-xs">
        <p className="line-clamp-2 text-slate-200">{post.message ?? `${platform} post`}</p>
        <p className="text-slate-400">{formatDate(post.createdTime)}</p>
        <p className="text-slate-300">
          {formatCompactStat(post.engagementCount)} interactions
        </p>
        <p className="text-slate-400">{secondaryLine}</p>
      </div>
    </div>
  );

  return post.permalinkUrl ? (
    <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="block hover:opacity-90">
      {content}
    </a>
  ) : (
    content
  );
}

function AccountStatCard({
  group,
  platform,
  account,
  status,
  stats,
  href,
  actionHref,
  actionLabel,
  avatarUrl,
  posts,
  stories,
  contributorPosts,
  externalPosts,
  externalPostsPlatform = "Facebook",
  postsMessage,
  contributorMessage,
  insightsMessage,
}: {
  group: string;
  platform: string;
  account: string;
  status: string;
  stats: Array<[string, string]>;
  href?: string;
  actionHref?: string;
  actionLabel?: string;
  avatarUrl?: string | null;
  posts?: InstagramMediaMetric[];
  stories?: InstagramMediaMetric[];
  contributorPosts?: InstagramMediaMetric[];
  externalPosts?: ExternalContentMetric[];
  externalPostsPlatform?: "Facebook" | "Threads";
  postsMessage?: string | null;
  contributorMessage?: string | null;
  insightsMessage?: string | null;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar imageUrl={avatarUrl} label={account} />
          <div className="min-w-0">
            <p className="text-xs uppercase text-slate-400">{group} · {platform}</p>
            <h3 className="mt-1 truncate text-base font-medium">{account}</h3>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{status}</span>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-md bg-white/5 p-2">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1 break-words text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap gap-3">
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 underline">
            Open profile
          </a>
        )}
        {actionHref && actionLabel && (
          <a href={actionHref} className="text-sm text-indigo-300 underline">
            {actionLabel}
          </a>
        )}
      </div>

      {posts && posts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase text-slate-400">Latest posts</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <InstagramPostPreview key={post.id} media={post} compact />
            ))}
          </div>
        </div>
      )}

      {stories && stories.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase text-cyan-100">Active stories</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {stories.slice(0, 3).map((story) => (
              <InstagramPostPreview key={story.id} media={story} compact />
            ))}
          </div>
        </div>
      )}

      {contributorPosts && contributorPosts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase text-amber-100">Contributor posts</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {contributorPosts.slice(0, 3).map((post) => (
              <InstagramPostPreview key={post.id} media={post} compact />
            ))}
          </div>
        </div>
      )}

      {externalPosts && externalPosts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase text-slate-400">Latest {externalPostsPlatform} posts</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {externalPosts.slice(0, 3).map((post) => (
              <ExternalPostPreview key={post.id} post={post} platform={externalPostsPlatform} />
            ))}
          </div>
        </div>
      )}

      {postsMessage && (
        <p className="mt-3 text-xs text-amber-200">{postsMessage}</p>
      )}

      {contributorMessage && (
        <p className="mt-2 text-xs text-amber-200">{contributorMessage}</p>
      )}

      {insightsMessage && (
        <p className="mt-2 text-xs text-amber-200">{insightsMessage}</p>
      )}
    </article>
  );
}

function StatisticsTab() {
  const [range, setRange] = useState<Range>("Month");
  const liveMetrics = useLiveMetrics();
  const instagramProfiles = liveMetrics.instagram?.profiles ?? [];
  const metaPages = liveMetrics.meta?.metrics ?? [];
  const personalMeta = findPersonalMeta(metaPages);
  const newGloryMeta = findNewGloryMeta(metaPages);
  const linkedInProfile = liveMetrics.linkedin?.identity?.personalProfile;
  const linkedInOrganizations = liveMetrics.linkedin?.identity?.organizations ?? [];
  const linkedInOrganization = findLinkedInOrganization(linkedInOrganizations);
  const threadsProfile = liveMetrics.threads?.profile;
  const contentItems = instagramProfiles
    .flatMap((profile) =>
      getProfileContent(profile).map((media) => ({
        ...media,
        profile,
      }))
    )
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  const posts = contentItems.filter((post) => post.sourceType !== "story");
  const storyPosts = contentItems.filter((post) => post.sourceType === "story");
  const contributorPosts = contentItems.filter(
    (post) => post.sourceType === "collaborator" || post.sourceType === "tagged"
  );
  const contributorMessages = Array.from(
    new Set(
      instagramProfiles
        .map((profile) => profile.contributorMessage)
        .filter((message): message is string => Boolean(message))
    )
  );
  const chartData = instagramProfiles.map((profile) => ({
    name: getProfileLabel(profile),
    Followers: profile.followersCount ?? 0,
    Views: profile.insights?.views ?? 0,
    Interactions: profile.insights?.interactions ?? 0,
    Shared: profile.contentSummary?.contentShared ?? 0,
  }));
  const totalFollowers = instagramProfiles.reduce(
    (sum, profile) => sum + (profile.followersCount ?? 0),
    0
  );
  const insightViews = sumProfileInsights(instagramProfiles, "views");
  const postViews = posts.reduce(
    (sum, post) => sum + (getPostViews(post) ?? 0),
    0
  );
  const insightInteractions = sumProfileInsights(instagramProfiles, "interactions");
  const postInteractions = posts.reduce(
    (sum, post) => sum + getPostEngagement(post),
    0
  );
  const totalViews = insightViews || postViews;
  const totalInteractions = insightInteractions || postInteractions;
  const totalNewFollowers = sumProfileInsights(instagramProfiles, "follows");
  const totalSharedContent = sumProfileContent(instagramProfiles) || contentItems.length;
  const totalStories = instagramProfiles.reduce(
    (sum, profile) => sum + (profile.contentSummary?.activeStories ?? 0),
    0
  );
  const totalContributorContent =
    instagramProfiles.reduce(
      (sum, profile) => sum + (profile.contentSummary?.collaboratorMedia ?? 0),
      0
    ) || contributorPosts.length;
  const rangeLabel = formatRange(
    instagramProfiles[0]?.insights?.rangeStart ??
      instagramProfiles[0]?.contentSummary?.rangeStart,
    instagramProfiles[0]?.insights?.rangeEnd ??
      instagramProfiles[0]?.contentSummary?.rangeEnd
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PremiumCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Statistics</h2>
          <div className="flex gap-2">
            {ranges.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1 text-xs ${range === r ? "bg-violet-500" : "bg-white/10"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-300">
          {liveMetrics.loading
            ? "Loading live Instagram statistics..."
            : `${range} view · ${rangeLabel} · live Instagram snapshot`}
        </p>
      </PremiumCard>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Followers", formatStat(totalFollowers)],
          ["Views", formatStat(totalViews)],
          ["Interactions", formatStat(totalInteractions)],
          ["New followers", formatStat(totalNewFollowers)],
          ["Shared content", formatStat(totalSharedContent)],
          ["Stories + contributor", `${formatStat(totalStories)} / ${formatStat(totalContributorContent)}`],
        ].map(([label, value]) => (
          <PremiumCard key={label}>
            <p className="text-sm text-slate-300">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </PremiumCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Personal Facebook Statistics</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {personalMeta ? "Live" : "Connect personal Page"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              [
                "Followers",
                formatStat(personalMeta?.fbFollowersCount ?? personalMeta?.fbFollowerSnapshot),
              ],
              ["Fans", formatStat(personalMeta?.fbFanCount)],
              ["Views", formatStat(personalMeta?.fbViews)],
              ["Impressions", formatStat(personalMeta?.fbImpressions)],
              ["Engagements", formatStat(personalMeta?.fbPostEngagements)],
              ["New followers", formatStat(personalMeta?.fbNewFollowers)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/5 p-2">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {personalMeta?.fbPosts?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {personalMeta.fbPosts.slice(0, 3).map((post) => (
                <ExternalPostPreview key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">
              Connect a personal/professional Facebook Page through Meta to show personal Facebook stats.
            </p>
          )}
          {personalMeta?.fbInsightsMessage && (
            <p className="mt-3 text-xs text-amber-200">{personalMeta.fbInsightsMessage}</p>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">New Glory Facebook Statistics</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {newGloryMeta ? "Live" : "Connect Meta"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {[
              [
                "Followers",
                formatStat(newGloryMeta?.fbFollowersCount ?? newGloryMeta?.fbFollowerSnapshot),
              ],
              ["Fans", formatStat(newGloryMeta?.fbFanCount)],
              ["Views", formatStat(newGloryMeta?.fbViews)],
              ["Impressions", formatStat(newGloryMeta?.fbImpressions)],
              ["Engagements", formatStat(newGloryMeta?.fbPostEngagements)],
              ["New followers", formatStat(newGloryMeta?.fbNewFollowers)],
              ["Recent posts", formatStat(newGloryMeta?.fbRecentPostCount)],
              ["Post interactions", formatStat(newGloryMeta?.fbRecentPostEngagements)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/5 p-2">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {newGloryMeta?.fbPosts?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {newGloryMeta.fbPosts.slice(0, 3).map((post) => (
                <ExternalPostPreview key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">
              Connect Meta with the New Glory Facebook Page to show page and post statistics.
            </p>
          )}
          {newGloryMeta?.fbInsightsMessage && (
            <p className="mt-3 text-xs text-amber-200">{newGloryMeta.fbInsightsMessage}</p>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Personal LinkedIn Statistics</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {linkedInProfile ? "Live" : "Connect LinkedIn"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Followers", formatStat(linkedInProfile?.followersCount)],
              ["Connections", formatStat(linkedInProfile?.connectionsCount)],
              ["Profile ID", linkedInProfile?.sub ?? "n/a"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/5 p-2">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {(linkedInProfile?.message || liveMetrics.linkedin?.message) && (
            <p className="mt-3 text-xs text-amber-200">
              {linkedInProfile?.message ?? liveMetrics.linkedin?.message}
            </p>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">New Glory LinkedIn Statistics</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {linkedInOrganization ? "Live" : "Connect LinkedIn admin"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {[
              ["Followers", formatStat(linkedInOrganization?.followersCount)],
              ["Organic followers", formatStat(linkedInOrganization?.organicFollowersCount)],
              ["Paid followers", formatStat(linkedInOrganization?.paidFollowersCount)],
              ["Impressions", formatStat(linkedInOrganization?.impressions)],
              ["Clicks", formatStat(linkedInOrganization?.clicks)],
              ["Likes", formatStat(linkedInOrganization?.likes)],
              ["Comments", formatStat(linkedInOrganization?.comments)],
              ["Shares", formatStat(linkedInOrganization?.shares)],
              ["Engagement rate", formatPercent(linkedInOrganization?.engagementRate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/5 p-2">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            Company-page statistics appear here when the connected LinkedIn user is an admin and the app has the needed LinkedIn analytics access.
          </p>
          {(linkedInOrganization?.message || liveMetrics.linkedin?.message) && (
            <p className="mt-3 text-xs text-amber-200">
              {linkedInOrganization?.message ?? liveMetrics.linkedin?.message}
            </p>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Personal Threads Statistics</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {threadsProfile ? "Live" : "Connect Threads"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Followers", formatStat(liveMetrics.threads?.insights?.followersCount)],
              ["Views", formatStat(liveMetrics.threads?.insights?.views)],
              ["Likes", formatStat(liveMetrics.threads?.insights?.likes)],
              ["Replies", formatStat(liveMetrics.threads?.insights?.replies)],
              ["Reposts", formatStat(liveMetrics.threads?.insights?.reposts)],
              ["Quotes", formatStat(liveMetrics.threads?.insights?.quotes)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white/5 p-2">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {liveMetrics.threads?.posts?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {liveMetrics.threads.posts.slice(0, 3).map((post) => (
                <ExternalPostPreview key={post.id} post={post} platform="Threads" />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">
              Connect Threads to show account and post statistics.
            </p>
          )}
          {liveMetrics.threads?.insightsMessage && (
            <p className="mt-3 text-xs text-amber-200">{liveMetrics.threads.insightsMessage}</p>
          )}
        </PremiumCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Instagram Account Comparison</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {instagramProfiles.length} accounts
            </span>
          </div>

          {chartData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#cbd5e1" tickLine={false} axisLine={false} />
                  <YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.06)" }}
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Followers" fill="#818cf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Views" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Interactions" fill="#f472b6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Shared" fill="#34d399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Connect Instagram accounts to display account statistics.
            </p>
          )}
        </PremiumCard>

        <PremiumCard>
          <h2 className="mb-4 text-lg font-medium">Connected Profiles</h2>
          <div className="space-y-3">
            {instagramProfiles.length ? (
              instagramProfiles.map((profile) => (
                <div key={profile.profileGroup} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      imageUrl={profile.profilePictureUrl}
                      label={profile.username ?? getProfileLabel(profile)}
                    />
                    <div>
                      <p className="text-xs uppercase text-slate-400">{getProfileLabel(profile)}</p>
                      <p className="font-medium">{getProfileDisplayName(profile, "Instagram account")}</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Followers</dt>
                      <dd>{formatCompactStat(profile.followersCount)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Following</dt>
                      <dd>{formatCompactStat(profile.followsCount)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Media</dt>
                      <dd>{formatCompactStat(profile.mediaCount)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Views</dt>
                      <dd>{formatCompactStat(profile.insights?.views)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Interactions</dt>
                      <dd>{formatCompactStat(profile.insights?.interactions)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">New followers</dt>
                      <dd>{formatCompactStat(profile.insights?.follows)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Shared</dt>
                      <dd>{formatCompactStat(profile.contentSummary?.contentShared)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Stories</dt>
                      <dd>{formatCompactStat(profile.contentSummary?.activeStories)}</dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Contributor</dt>
                      <dd>{formatCompactStat(profile.contentSummary?.collaboratorMedia)}</dd>
                    </div>
                  </dl>
                  {profile.insightsMessage && (
                    <p className="mt-3 text-xs text-amber-200">{profile.insightsMessage}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">No Instagram profiles connected yet.</p>
            )}
          </div>
        </PremiumCard>
      </div>

      <PremiumCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Latest Instagram Post Performance</h2>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {posts.length} posts
          </span>
        </div>

        {posts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <div key={`${post.profile.profileGroup}-${post.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <ProfileAvatar
                    imageUrl={post.profile.profilePictureUrl}
                    label={post.profile.username ?? getProfileLabel(post.profile)}
                  />
                  <div>
                    <p className="text-xs text-slate-400">{getProfileLabel(post.profile)}</p>
                    <p className="text-sm font-medium">{getProfileDisplayName(post.profile, "Instagram account")}</p>
                  </div>
                </div>
                <InstagramPostPreview media={post} />
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Views</dt>
                    <dd>{formatCompactStat(getPostViews(post))}</dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Interactions</dt>
                    <dd>{formatCompactStat(getPostEngagement(post))}</dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Reach</dt>
                    <dd>{formatCompactStat(post.insightReach)}</dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Saves + shares</dt>
                    <dd>{formatCompactStat((post.insightSaves ?? 0) + (post.insightShares ?? 0))}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">
            Recent Instagram posts will appear here after the connected account token can read media.
          </p>
        )}
      </PremiumCard>

      <PremiumCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Active Instagram Stories</h2>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {storyPosts.length} stories
          </span>
        </div>

        {storyPosts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {storyPosts.map((story) => (
              <div key={`story-${story.profile.profileGroup}-${story.id}`} className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <ProfileAvatar
                    imageUrl={story.profile.profilePictureUrl}
                    label={story.profile.username ?? getProfileLabel(story.profile)}
                  />
                  <div>
                    <p className="text-xs text-cyan-100">Story on {getProfileLabel(story.profile)}</p>
                    <p className="text-sm font-medium">{getProfileDisplayName(story.profile, "Instagram account")}</p>
                  </div>
                </div>
                <InstagramPostPreview media={story} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">
            Active Instagram stories will appear here separately from regular posts.
          </p>
        )}
      </PremiumCard>

      <PremiumCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Contributor Content</h2>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {contributorPosts.length} items
          </span>
        </div>

        {contributorPosts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contributorPosts.map((post) => (
              <div key={`contributor-${post.profile.profileGroup}-${post.id}`} className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <ProfileAvatar
                    imageUrl={post.profile.profilePictureUrl}
                    label={post.profile.username ?? getProfileLabel(post.profile)}
                  />
                  <div>
                    <p className="text-xs text-amber-100">Contributor on {getProfileLabel(post.profile)}</p>
                    <p className="text-sm font-medium">{getProfileDisplayName(post.profile, "Instagram account")}</p>
                  </div>
                </div>
                <InstagramPostPreview media={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 text-sm text-slate-300">
            <p>Contributor posts will appear here when Instagram returns tagged or collaborator media for the connected account.</p>
            {contributorMessages.map((message) => (
              <p key={message} className="text-amber-200">{message}</p>
            ))}
          </div>
        )}
      </PremiumCard>
    </motion.div>
  );
}

function PlanningTab() {
  const [items, setItems] = useState(initialPlan);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`), []);

  const onDropDay = (date: string) => {
    if (!draggingId) return;
    setItems((prev) => prev.map((item) => (item.id === draggingId ? { ...item, date } : item)));
    setDraggingId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <PremiumCard>
        <h2 className="mb-3 text-lg font-medium">Scheduled List</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} draggable onDragStart={() => setDraggingId(item.id)} className="cursor-move rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {item.date} · {item.time} · {item.platform} · {item.title} · {item.status}
            </li>
          ))}
        </ul>
      </PremiumCard>

      <PremiumCard>
        <h2 className="mb-3 text-lg font-medium">Monthly Calendar (Drag & Drop)</h2>
        <div className="grid grid-cols-5 gap-2 text-xs lg:grid-cols-10">
          {days.map((day) => (
            <div key={day} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropDay(day)} className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-400">{day.slice(-2)}</p>
              {items
                .filter((i) => i.date === day)
                .map((i) => (
                  <p key={i.id} className="mt-1 rounded bg-violet-500/30 px-1">
                    {i.platform}
                  </p>
                ))}
            </div>
          ))}
        </div>
      </PremiumCard>
    </motion.div>
  );
}
