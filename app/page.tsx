"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
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

type Tab = "Home" | "Statistics" | "Planning" | "Instagram" | "Threads" | "Facebook" | "LinkedIn" | "TikTok" | "WhatsApp";
type Range = "Day" | "Week" | "Month" | "Year";
type WorkflowMode = "Post" | "Inbox" | "Discovery" | "Settings";

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
  sourceTaskId?: string;
  notes?: string;
};

type PlannerDragItem = {
  type: "task" | "scheduled";
  id: string;
};

type PlannerState = {
  tasks: Task[];
  items: CalendarItem[];
};

type LocalMediaPreview = {
  id: string;
  url: string;
  type: "image" | "video" | "file";
  name: string;
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

type InstagramContentWithProfile = InstagramMediaMetric & {
  profile: InstagramProfileMetric;
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

type ThreadsActionResponse = {
  ok: boolean;
  action?: string | null;
  message?: string | null;
  postId?: string | null;
  result?: unknown;
  container?: unknown;
  published?: unknown;
};

type InstagramActionResponse = ThreadsActionResponse;

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

type WhatsAppMessageMetric = {
  id: string;
  direction: "inbound" | "outbound" | "status";
  from: string | null;
  to: string | null;
  text: string | null;
  mediaType?: string | null;
  mediaId?: string | null;
  timestamp: string;
  status?: string | null;
};

type WhatsAppMetricsResponse = {
  ok: boolean;
  configured: boolean;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  messages: WhatsAppMessageMetric[];
  message?: string | null;
  webhookPath?: string;
};

type WhatsAppActionResponse = {
  ok: boolean;
  message?: string | null;
  result?: unknown;
  mediaId?: string | null;
};

type LiveMetricsState = {
  meta: MetaMetricsResponse | null;
  instagram: InstagramMetricsResponse | null;
  linkedin: LinkedInMetricsResponse | null;
  threads: ThreadsMetricsResponse | null;
  tiktok: TikTokMetricsResponse | null;
  whatsapp: WhatsAppMetricsResponse | null;
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

const tabs: Tab[] = ["Home", "Statistics", "Planning", "Instagram", "Threads", "Facebook", "LinkedIn", "TikTok", "WhatsApp"];
const workflowModes: WorkflowMode[] = ["Post", "Inbox", "Discovery", "Settings"];
const ranges: Range[] = ["Day", "Week", "Month", "Year"];
const PLANNER_STORAGE_KEY = "socialmedia-dashboard-planner-v2";
const connectedProfiles = {
  personal: {
    instagram: "@thijs.wijma",
    linkedin: "https://www.linkedin.com/in/thijs-w-74b309192",
    threads: "Personal Threads",
    tiktok: "Personal TikTok",
    whatsapp: "WhatsApp Business",
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
  whatsapp: null,
  loading: true,
};
const LIVE_METRICS_CACHE_TTL = 45_000;
let liveMetricsCache: LiveMetricsState | null = null;
let liveMetricsCacheAt = 0;

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

const nonSensitiveMetricLabels = new Set([
  "live data status",
  "open id",
  "profile id",
  "type",
]);

function isSensitiveMetricLabel(label: string) {
  return !nonSensitiveMetricLabels.has(label.toLowerCase());
}

function SensitiveMetricValue({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const sensitiveClass = isSensitiveMetricLabel(label)
    ? "privacy-sensitive inline-block min-w-8"
    : "";

  return (
    <span className={[sensitiveClass, className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

function PrivacySensitive({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={["privacy-sensitive inline-block min-w-8", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
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

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function getRangeStart(range: Range) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (range === "Day") return start;
  if (range === "Week") start.setDate(start.getDate() - 6);
  if (range === "Month") start.setDate(start.getDate() - 29);
  if (range === "Year") start.setDate(start.getDate() - 364);
  return start;
}

function isInRange(timestamp: string | null, range: Range) {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  return Number.isFinite(time) && time >= getRangeStart(range).getTime() && time <= Date.now();
}

function getRangeWindowLabel(range: Range) {
  if (range === "Day") return "Today";
  if (range === "Week") return "Last 7 days";
  if (range === "Month") return "Last 30 days";
  return "Last 365 days";
}

function getActivityBucketLabel(timestamp: string | null, range: Range) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  if (range === "Day") {
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }
  if (range === "Year") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

function buildActivityBuckets(items: InstagramContentWithProfile[], range: Range) {
  const buckets = new Map<
    string,
    {
      name: string;
      Posts: number;
      Stories: number;
      Contributor: number;
      Views: number;
      Interactions: number;
    }
  >();

  items.forEach((item) => {
    const name = getActivityBucketLabel(item.timestamp, range);
    const current =
      buckets.get(name) ??
      {
        name,
        Posts: 0,
        Stories: 0,
        Contributor: 0,
        Views: 0,
        Interactions: 0,
      };

    if (item.sourceType === "story") current.Stories += 1;
    else if (item.sourceType === "collaborator" || item.sourceType === "tagged") current.Contributor += 1;
    else current.Posts += 1;

    current.Views += getPostViews(item) ?? 0;
    current.Interactions += getPostEngagement(item);
    buckets.set(name, current);
  });

  return Array.from(buckets.values());
}

function pickPeak<T>(items: T[], readValue: (item: T) => number) {
  return items.reduce<T | null>((best, item) => {
    if (!best) return item;
    return readValue(item) > readValue(best) ? item : best;
  }, null);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const json = (await res.json()) as T;
  return json;
}

async function postThreadsAction(payload: Record<string, unknown>) {
  const res = await fetch("/api/threads/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as ThreadsActionResponse;

  if (!res.ok && !json.message) {
    return { ...json, ok: false, message: "Threads action failed." };
  }

  return json;
}

async function postInstagramAction(payload: Record<string, unknown>) {
  const res = await fetch("/api/instagram/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as InstagramActionResponse;

  if (!res.ok && !json.message) {
    return { ...json, ok: false, message: "Instagram action failed." };
  }

  return json;
}

async function postWhatsAppAction(payload: Record<string, unknown>) {
  const res = await fetch("/api/whatsapp/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as WhatsAppActionResponse;

  if (!res.ok && !json.message) {
    return { ...json, ok: false, message: "WhatsApp action failed." };
  }

  return json;
}

async function uploadWhatsAppMedia(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  const res = await fetch("/api/whatsapp/media", {
    method: "POST",
    body: formData,
  });
  const json = (await res.json()) as WhatsAppActionResponse;

  if (!res.ok && !json.message) {
    return { ...json, ok: false, message: "WhatsApp media upload failed." };
  }

  return json;
}

function useLiveMetrics(): LiveMetricsState {
  const [metrics, setMetrics] = useState<LiveMetricsState>(() => liveMetricsCache ?? initialLiveMetrics);

  useEffect(() => {
    let cancelled = false;
    const bypassCache =
      typeof window !== "undefined" &&
      /(?:meta|instagram|threads|linkedin|tiktok)_connected=1/.test(window.location.search);
    if (liveMetricsCache && !bypassCache && Date.now() - liveMetricsCacheAt < LIVE_METRICS_CACHE_TTL) {
      return () => {
        cancelled = true;
      };
    }

    const loaders = {
      meta: () =>
        fetchJson<MetaMetricsResponse>("/api/meta/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      instagram: () =>
        fetchJson<InstagramMetricsResponse>("/api/instagram/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      linkedin: () =>
        fetchJson<LinkedInMetricsResponse>("/api/linkedin/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      threads: () =>
        fetchJson<ThreadsMetricsResponse>("/api/threads/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      tiktok: () =>
        fetchJson<TikTokMetricsResponse>("/api/tiktok/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      whatsapp: () =>
        fetchJson<WhatsAppMetricsResponse>("/api/whatsapp/messages").catch((error: Error) => ({
          ok: false,
          configured: false,
          messages: [],
          message: error.message,
        })),
    };
    type LoaderKey = keyof typeof loaders;
    const keys = Object.keys(loaders) as LoaderKey[];
    let remaining = keys.length;
    let partial: LiveMetricsState = {
      ...(liveMetricsCache ?? initialLiveMetrics),
      loading: true,
    };

    keys.forEach((key) => {
      void loaders[key]().then((value) => {
        if (cancelled) return;
        remaining -= 1;
        partial = {
          ...partial,
          [key]: value,
          loading: remaining > 0,
        };
        liveMetricsCache = partial;
        liveMetricsCacheAt = Date.now();
        setMetrics(partial);
      });
    });

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
  const [showcaseLocked, setShowcaseLocked] = useState(false);
  const [plannerState, setPlannerState] = useState<PlannerState>({
    tasks: initialTasks,
    items: initialPlan,
  });

  return (
    <main className={`min-h-screen bg-[radial-gradient(circle_at_top_right,#312e81_0%,#0b1020_35%,#070b16_70%)] p-6 text-slate-100 ${showcaseLocked ? "showcase-locked" : ""}`}>
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

        <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur">
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
          <button
            type="button"
            aria-pressed={showcaseLocked}
            aria-label={showcaseLocked ? "Unlock dashboard numbers" : "Lock dashboard numbers"}
            title={showcaseLocked ? "Show metrics" : "Lock metrics for showcase"}
            onClick={() => setShowcaseLocked((locked) => !locked)}
            className={`ml-auto flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-300 hover:-translate-y-0.5 ${
              showcaseLocked
                ? "border-amber-200/40 bg-amber-300/15 text-amber-100 shadow-lg shadow-amber-950/20"
                : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <PrivacyLockIcon locked={showcaseLocked} />
          </button>
        </nav>

        {activeTab === "Home" && (
          <HomeTab {...connectionSummary} onOpenTab={setActiveTab} />
        )}
        {activeTab === "Statistics" && <StatisticsTab />}
        {activeTab === "Planning" && (
          <PlanningTab plannerState={plannerState} setPlannerState={setPlannerState} />
        )}
        {activeTab === "Instagram" && <InstagramTab />}
        {activeTab === "Threads" && <ThreadsTab />}
        {activeTab === "Facebook" && <FacebookTab />}
        {activeTab === "LinkedIn" && <LinkedInTab />}
        {activeTab === "TikTok" && <TikTokTab />}
        {activeTab === "WhatsApp" && <WhatsAppTab />}
      </div>
    </main>
  );
}

function PrivacyLockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d={locked ? "M8 10V7a4 4 0 0 1 8 0v3" : "M8 10V7a4 4 0 0 1 7.2-2.4"} />
      {!locked && <path d="M15.2 4.6 18 7.1" />}
      <path d="M12 14v2" />
    </svg>
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
  onOpenTab,
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
  onOpenTab: (tab: Tab) => void;
}) {
  const liveMetrics = useLiveMetrics();
  const newGloryMeta = findNewGloryMeta(liveMetrics.meta?.metrics);
  const personalInstagram = findInstagramProfile(
    liveMetrics.instagram?.profiles,
    "personal"
  );
  const newGloryInstagram = findInstagramProfile(
    liveMetrics.instagram?.profiles,
    "newglory"
  );
  const linkedInOrganization = findLinkedInOrganization(
    liveMetrics.linkedin?.identity?.organizations
  );
  const threadsProfile = liveMetrics.threads?.profile;
  const tikTokUser = liveMetrics.tiktok?.profile?.data?.user;
  const instagramIsLive = Boolean(personalInstagram || newGloryInstagram);
  const facebookIsLive = Boolean(newGloryMeta);
  const whatsappConnected = Boolean(liveMetrics.whatsapp?.configured);
  const totalKnownFollowers =
    (personalInstagram?.followersCount ?? 0) +
    (newGloryInstagram?.followersCount ?? newGloryMeta?.igFollowersCount ?? 0) +
    (newGloryMeta?.fbFollowersCount ?? newGloryMeta?.fbFanCount ?? 0) +
    (liveMetrics.linkedin?.identity?.personalProfile.followersCount ?? 0) +
    (linkedInOrganization?.followersCount ?? 0) +
    (liveMetrics.threads?.insights?.followersCount ?? 0);
  const connectedPlatformCount = [
    Boolean(personalInstagram || newGloryInstagram),
    facebookIsLive,
    Boolean(liveMetrics.linkedin?.identity),
    Boolean(threadsProfile),
    Boolean(tikTokUser),
    whatsappConnected,
  ].filter(Boolean).length;

  const kpis = [
    { label: "Known Live Followers", value: liveMetrics.loading ? "Loading..." : formatStat(totalKnownFollowers) },
    { label: "Connected Sources", value: liveMetrics.loading ? "Loading..." : `${connectedPlatformCount}/6` },
    { label: "Live Data Status", value: liveMetrics.loading ? "Loading..." : "Ready" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <PremiumCard key={kpi.label}>
            <p className="text-sm text-slate-300">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold">
              <SensitiveMetricValue label={kpi.label}>{kpi.value}</SensitiveMetricValue>
            </p>
          </PremiumCard>
        ))}
      </div>

      <CompactConnectionPanel
        metaConnected={metaConnected || facebookIsLive}
        metaError={facebookIsLive ? null : metaError}
        connectedPages={connectedPages}
        instagramConnected={instagramConnected || instagramIsLive}
        instagramProfile={instagramProfile}
        instagramError={instagramIsLive ? null : instagramError}
        linkedInConnected={linkedInConnected}
        linkedInError={linkedInError}
        linkedInErrorMessage={linkedInErrorMessage}
        threadsConnected={threadsConnected || Boolean(threadsProfile)}
        threadsError={threadsError}
        tikTokConnected={tikTokConnected || Boolean(tikTokUser)}
        tikTokError={tikTokError}
        whatsAppConnected={whatsappConnected}
        whatsAppMessage={liveMetrics.whatsapp?.message ?? null}
        onOpenTab={onOpenTab}
      />

      <LiveAccountsPanel
        liveMetrics={liveMetrics}
        personalInstagram={personalInstagram}
        newGloryInstagram={newGloryInstagram}
        newGloryMeta={newGloryMeta}
        linkedInOrganization={linkedInOrganization}
      />
    </motion.div>
  );
}

function CompactConnectionPanel({
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
  whatsAppConnected,
  whatsAppMessage,
  onOpenTab,
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
  whatsAppConnected: boolean;
  whatsAppMessage: string | null;
  onOpenTab: (tab: Tab) => void;
}) {
  const items = [
    {
      label: "Threads",
      connected: threadsConnected,
      message: threadsError,
      href: "/api/connect/threads",
      tab: "Threads" as Tab,
      detail: threadsConnected ? "Connected" : "Connect",
    },
    {
      label: "Instagram",
      connected: instagramConnected,
      message: instagramError,
      href: "/api/connect/instagram?profile=personal",
      tab: "Instagram" as Tab,
      detail: instagramConnected ? `${instagramProfile ?? "Account"} connected` : "Connect",
    },
    {
      label: "Facebook",
      connected: metaConnected,
      message: metaError,
      href: "/api/connect/meta",
      tab: "Facebook" as Tab,
      detail: metaConnected
        ? connectedPages.length
          ? `${connectedPages.length} page${connectedPages.length === 1 ? "" : "s"}`
          : "New Glory connected"
        : "Connect",
    },
    {
      label: "LinkedIn",
      connected: linkedInConnected,
      message: linkedInError ? linkedInErrorMessage : null,
      href: "/api/connect/linkedin",
      tab: "LinkedIn" as Tab,
      detail: linkedInConnected ? "Connected" : "Connect",
    },
    {
      label: "TikTok",
      connected: tikTokConnected,
      message: tikTokError,
      href: "/api/connect/tiktok",
      tab: "TikTok" as Tab,
      detail: tikTokConnected ? "Connected" : "Connect",
    },
    {
      label: "WhatsApp",
      connected: whatsAppConnected,
      message: whatsAppMessage,
      href: "#",
      tab: "WhatsApp" as Tab,
      detail: whatsAppConnected ? "Cloud API ready" : "Configure API",
    },
  ].sort((a, b) => Number(b.connected) - Number(a.connected));

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-200">Connections</h2>
        <span className="text-xs text-slate-400">
          {items.filter((item) => item.connected).length}/{items.length} live
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => (item.connected || item.label === "WhatsApp" ? onOpenTab(item.tab) : window.location.assign(item.href))}
            className={`rounded-lg border px-3 py-2 text-sm transition hover:bg-white/10 ${
              item.connected
                ? "border-emerald-300/20 bg-emerald-400/10"
                : "border-white/10 bg-black/20"
            } text-left`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.label}</span>
              <span className={item.connected ? "text-emerald-200" : "text-slate-400"}>
                {item.connected ? "Live" : "Off"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">{item.message ?? item.detail}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function LiveAccountsPanel({
  liveMetrics,
  personalInstagram,
  newGloryInstagram,
  newGloryMeta,
  linkedInOrganization,
}: {
  liveMetrics: LiveMetricsState;
  personalInstagram: InstagramProfileMetric | undefined;
  newGloryInstagram: InstagramProfileMetric | undefined;
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
          <PrivacySensitive>
            {formatCompactStat(getPostViews(media))} views · {formatCompactStat(getPostEngagement(media))} interactions
          </PrivacySensitive>
        </p>
        {!compact && (
          <p className="text-slate-400">
            <PrivacySensitive>
              {formatCompactStat(media.likeCount)} likes · {formatCompactStat(media.commentsCount)} comments · {formatCompactStat(media.insightShares)} shares
            </PrivacySensitive>
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

function InstagramDraftPreview({
  profile,
  previews,
  caption,
  shareType,
  recentPosts,
}: {
  profile: InstagramProfileMetric | null;
  previews: LocalMediaPreview[];
  caption: string;
  shareType: string;
  recentPosts: InstagramMediaMetric[];
}) {
  const primaryPreview = previews[0];
  const isStory = shareType === "STORIES";
  const isReel = shareType === "REELS";
  const username = profile?.username ? `@${profile.username}` : "Instagram account";

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProfileAvatar imageUrl={profile?.profilePictureUrl} label={profile?.username ?? "Instagram"} />
          <div>
            <p className="text-sm font-medium">{username}</p>
            <p className="text-xs text-slate-400">{shareType === "IMAGE" ? "Post preview" : `${shareType.toLowerCase()} preview`}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
          {isStory ? "Story" : isReel ? "Reel" : shareType === "CAROUSEL" ? "Carousel" : "Feed"}
        </span>
      </div>

      <div className={isStory || isReel ? "mx-auto max-w-64" : ""}>
        <div
          className={`overflow-hidden rounded-xl border border-white/10 bg-neutral-950 ${
            isStory || isReel ? "aspect-[9/16]" : "aspect-square"
          }`}
        >
          {primaryPreview?.type === "image" && (
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${primaryPreview.url})` }} />
          )}
          {primaryPreview?.type === "video" && (
            <video src={primaryPreview.url} className="h-full w-full object-cover" controls muted />
          )}
          {!primaryPreview && (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
              Select media to see the Instagram preview.
            </div>
          )}
        </div>
      </div>

      {previews.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {previews.slice(0, 10).map((preview) => (
            <div key={preview.id} className="aspect-square overflow-hidden rounded-md bg-neutral-950">
              {preview.type === "image" ? (
                <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${preview.url})` }} />
              ) : (
                <video src={preview.url} className="h-full w-full object-cover" muted />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="mb-3 flex items-center gap-3">
          <ProfileAvatar imageUrl={profile?.profilePictureUrl} label={profile?.username ?? "Instagram"} />
          <div>
            <p className="font-medium">{profile?.name ?? profile?.username ?? "Profile preview"}</p>
            <p className="text-xs text-slate-400">
              <PrivacySensitive>
                {formatCompactStat(profile?.followersCount)} followers · {formatCompactStat(profile?.mediaCount)} posts
              </PrivacySensitive>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {primaryPreview && (
            <div className="aspect-square overflow-hidden rounded-sm bg-neutral-950 ring-2 ring-violet-300">
              {primaryPreview.type === "image" ? (
                <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${primaryPreview.url})` }} />
              ) : (
                <video src={primaryPreview.url} className="h-full w-full object-cover" muted />
              )}
            </div>
          )}
          {recentPosts.slice(0, primaryPreview ? 8 : 9).map((post) => {
            const url = getMediaPreviewUrl(post);
            return (
              <div key={post.id} className="aspect-square overflow-hidden rounded-sm bg-neutral-950">
                {url ? (
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-slate-500">
                    Post
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {caption && (
        <p className="line-clamp-4 rounded-lg bg-white/5 p-3 text-sm text-slate-200">
          <span className="font-medium">{username}</span> {caption}
        </p>
      )}
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
  const isTextOnlyThreadsPost = platform === "Threads" && !post.pictureUrl;
  const content = (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/5">
      <div
        className={
          isTextOnlyThreadsPost
            ? "flex min-h-36 items-center bg-neutral-950 p-4"
            : "aspect-video bg-black/30 bg-cover bg-center"
        }
        style={post.pictureUrl ? { backgroundImage: `url(${post.pictureUrl})` } : undefined}
      >
        {isTextOnlyThreadsPost && (
          <p className="line-clamp-5 text-sm leading-relaxed text-slate-100">
            {post.message ?? "Threads text post"}
          </p>
        )}
        {!post.pictureUrl && !isTextOnlyThreadsPost && (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
            Text post
          </div>
        )}
      </div>
      <div className="space-y-1 p-2 text-xs">
        <p className="line-clamp-2 text-slate-200">{post.message ?? `${platform} post`}</p>
        <p className="text-slate-400">{formatDate(post.createdTime)}</p>
        <p className="text-slate-300">
          <PrivacySensitive>{formatCompactStat(post.engagementCount)} interactions</PrivacySensitive>
        </p>
        <p className="text-slate-400">
          <PrivacySensitive>{secondaryLine}</PrivacySensitive>
        </p>
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
            <dd className="mt-1 break-words text-slate-100">
              <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
            </dd>
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

function SocialWorkflowPanel({
  platform,
  connected,
  instagramProfiles = [],
}: {
  platform: "Instagram" | "Threads";
  connected: boolean;
  instagramProfiles?: InstagramProfileMetric[];
}) {
  const [mode, setMode] = useState<WorkflowMode>("Post");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [result, setResult] = useState<InstagramActionResponse | ThreadsActionResponse | null>(null);
  const [profileGroup, setProfileGroup] = useState<InstagramProfileGroup>("personal");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState(platform === "Threads" ? "TEXT" : "IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [targetId, setTargetId] = useState("");
  const [secondaryId, setSecondaryId] = useState("");
  const [query, setQuery] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [localMediaPreviews, setLocalMediaPreviews] = useState<LocalMediaPreview[]>([]);
  const selectedInstagramProfile =
    instagramProfiles.find((profile) => profile.profileGroup === profileGroup) ??
    instagramProfiles[0] ??
    null;

  useEffect(() => {
    return () => {
      localMediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [localMediaPreviews]);

  const inputClass =
    "w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-300";
  const buttonClass =
    "rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryButtonClass =
    "rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50";

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusyAction(action);
    const request = platform === "Threads" ? postThreadsAction : postInstagramAction;
    const response = await request({
      action,
      profileGroup,
      ...payload,
    }).catch((error: Error) => ({
      ok: false,
      action,
      message: error.message,
    }));
    setResult(response);
    setBusyAction(null);
  };

  const handleLocalMediaFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setLocalMediaPreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview.url));
      return files.slice(0, mediaType === "CAROUSEL" ? 10 : 1).map((file) => ({
        id: createClientId("media"),
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : "file",
        name: file.name,
      }));
    });

    const firstFile = files[0];
    if (platform === "Instagram" && mediaType !== "STORIES" && mediaType !== "REELS" && mediaType !== "CAROUSEL") {
      setMediaType(firstFile.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    }
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (platform === "Threads") {
      void runAction("publish", {
        text,
        mediaType,
        mediaUrl,
        altText,
        replyToId: targetId,
        topicTag: tagValue,
        locationId: secondaryId,
        shareToInstagram,
      });
      return;
    }

    void runAction("publish", {
      caption,
      mediaType,
      mediaUrl,
      mediaUrls: mediaUrl,
      altText,
      locationId: secondaryId,
      userTags: tagValue,
      productTags: tagValue,
      collaborators: tagValue,
    });
  };

  return (
    <PremiumCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{platform} Workspace</h2>
          <p className="mt-1 text-sm text-slate-300">
            {connected ? "Post, respond, discover, and manage from one focused panel." : `Connect ${platform} to enable live actions.`}
          </p>
        </div>
        <a
          href={platform === "Threads" ? "/api/connect/threads" : "/api/connect/instagram?profile=personal"}
          className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
        >
          {connected ? "Reconnect" : "Connect"}
        </a>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-black/20 p-1">
        {workflowModes.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-md px-3 py-2 text-sm transition ${
              mode === item ? "bg-violet-500 text-white" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {platform === "Instagram" && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <select value={profileGroup} onChange={(event) => setProfileGroup(event.target.value as InstagramProfileGroup)} className={inputClass}>
            <option value="personal">Personal Instagram</option>
            <option value="newglory">New Glory Instagram</option>
          </select>
          <p className="rounded-md bg-white/5 px-3 py-2 text-sm text-slate-300">
            {instagramProfiles.find((profile) => profile.profileGroup === profileGroup)?.username
              ? `@${instagramProfiles.find((profile) => profile.profileGroup === profileGroup)?.username}`
              : "Selected account"}
          </p>
        </div>
      )}

      {mode === "Post" && platform === "Instagram" && (
        <form onSubmit={submitPost} className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
              {[
                ["IMAGE", "Post"],
                ["STORIES", "Story"],
                ["REELS", "Reel"],
                ["CAROUSEL", "Carousel"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMediaType(value)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    mediaType === value ? "bg-violet-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block cursor-pointer rounded-xl border border-dashed border-white/20 bg-black/20 p-4 text-center hover:bg-white/5">
              <input
                type="file"
                accept="image/*,video/*"
                multiple={mediaType === "CAROUSEL"}
                onChange={handleLocalMediaFiles}
                className="hidden"
              />
              <span className="text-sm font-medium">Select photo or video from files</span>
              <span className="mt-1 block text-xs text-slate-400">
                {localMediaPreviews.length
                  ? localMediaPreviews.map((preview) => preview.name).join(", ")
                  : "Use this for preview. Add a public URL below for live publishing."}
              </span>
            </label>

            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 2200))}
              className={`${inputClass} min-h-32 resize-y`}
              placeholder="Write a caption..."
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <textarea
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                className={`${inputClass} min-h-20 resize-y sm:col-span-2`}
                placeholder="Public media URL(s) for live publishing, one per line for carousel"
              />
              <input value={altText} onChange={(event) => setAltText(event.target.value)} className={inputClass} placeholder="Alt text" />
              <input value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} className={inputClass} placeholder="Location ID" />
              <input
                value={tagValue}
                onChange={(event) => setTagValue(event.target.value)}
                className={`${inputClass} sm:col-span-2`}
                placeholder="User/product/collab tags JSON"
              />
            </div>

            <button disabled={!connected || busyAction === "publish"} className={buttonClass}>
              {busyAction === "publish" ? "Publishing..." : "Publish to Instagram"}
            </button>
          </div>

          <InstagramDraftPreview
            profile={selectedInstagramProfile}
            previews={localMediaPreviews}
            caption={caption}
            shareType={mediaType}
            recentPosts={selectedInstagramProfile ? getRegularPosts(selectedInstagramProfile) : []}
          />
        </form>
      )}

      {mode === "Post" && platform === "Threads" && (
        <form onSubmit={submitPost} className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <textarea
              value={platform === "Threads" ? text : caption}
              onChange={(event) =>
                platform === "Threads"
                  ? setText(event.target.value.slice(0, 500))
                  : setCaption(event.target.value.slice(0, 2200))
              }
              className={`${inputClass} min-h-40 resize-y`}
              placeholder={platform === "Threads" ? "Write a Threads post..." : "Write an Instagram caption..."}
            />
            <button disabled={!connected || busyAction === "publish"} className={buttonClass}>
              {busyAction === "publish" ? "Publishing..." : `Publish to ${platform}`}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={mediaType} onChange={(event) => setMediaType(event.target.value)} className={inputClass}>
              {platform === "Threads" ? (
                <>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </>
              ) : null}
            </select>
            <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} className={inputClass} placeholder="Public media URL" />
            <input value={altText} onChange={(event) => setAltText(event.target.value)} className={inputClass} placeholder="Alt text" />
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className={inputClass}
              placeholder={platform === "Threads" ? "Reply to post ID" : "Media/comment ID"}
            />
            <input value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} className={inputClass} placeholder="Location ID" />
            <input
              value={tagValue}
              onChange={(event) => setTagValue(event.target.value)}
              className={inputClass}
              placeholder={platform === "Threads" ? "Topic tag" : "User/product/collab tags JSON"}
            />
            {platform === "Threads" && (
              <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={shareToInstagram}
                  onChange={(event) => setShareToInstagram(event.target.checked)}
                />
                Share to Instagram
              </label>
            )}
          </div>
        </form>
      )}

      {mode === "Inbox" && (
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <input value={targetId} onChange={(event) => setTargetId(event.target.value)} className={inputClass} placeholder={platform === "Threads" ? "Post ID" : "Media ID"} />
            <input value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} className={inputClass} placeholder={platform === "Threads" ? "Reply ID" : "Comment or recipient ID"} />
            <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 1000))} className={`${inputClass} min-h-24 resize-y`} placeholder="Reply or message..." />
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {platform === "Threads" ? (
              <>
                <button disabled={!connected || busyAction === "replies"} onClick={() => void runAction("replies", { threadId: targetId })} className={secondaryButtonClass}>Load replies</button>
                <button disabled={!connected || busyAction === "conversation"} onClick={() => void runAction("conversation", { threadId: targetId })} className={secondaryButtonClass}>Conversation</button>
                <button disabled={!connected || busyAction === "publish"} onClick={() => void runAction("publish", { text, mediaType: "TEXT", replyToId: secondaryId || targetId })} className={secondaryButtonClass}>Reply</button>
                <button disabled={!connected || busyAction === "mentions"} onClick={() => void runAction("mentions")} className={secondaryButtonClass}>Mentions</button>
                <button disabled={!connected || busyAction === "manageReply"} onClick={() => void runAction("manageReply", { replyThreadId: secondaryId, hide: true })} className={secondaryButtonClass}>Hide</button>
                <button disabled={!connected || busyAction === "manageReply"} onClick={() => void runAction("manageReply", { replyThreadId: secondaryId, hide: false })} className={secondaryButtonClass}>Unhide</button>
                <button disabled={!connected || busyAction === "delete"} onClick={() => void runAction("delete", { threadId: targetId })} className="rounded-md bg-red-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50">Delete</button>
              </>
            ) : (
              <>
                <button disabled={!connected || busyAction === "comments"} onClick={() => void runAction("comments", { mediaId: targetId })} className={secondaryButtonClass}>Load comments</button>
                <button disabled={!connected || busyAction === "replyComment"} onClick={() => void runAction("replyComment", { commentId: secondaryId, text })} className={secondaryButtonClass}>Reply comment</button>
                <button disabled={!connected || busyAction === "manageComment"} onClick={() => void runAction("manageComment", { commentId: secondaryId, hide: true })} className={secondaryButtonClass}>Hide</button>
                <button disabled={!connected || busyAction === "manageComment"} onClick={() => void runAction("manageComment", { commentId: secondaryId, hide: false })} className={secondaryButtonClass}>Unhide</button>
                <button disabled={!connected || busyAction === "deleteComment"} onClick={() => void runAction("deleteComment", { commentId: secondaryId })} className="rounded-md bg-red-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50">Delete comment</button>
                <button disabled={!connected || busyAction === "conversations"} onClick={() => void runAction("conversations")} className={secondaryButtonClass}>Messages</button>
                <button disabled={!connected || busyAction === "sendMessage"} onClick={() => void runAction("sendMessage", { recipientId: secondaryId, text })} className={secondaryButtonClass}>Send DM</button>
                <button disabled={!connected || busyAction === "mentions"} onClick={() => void runAction("mentions")} className={secondaryButtonClass}>Mentions</button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "Discovery" && (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder={platform === "Threads" ? "Keyword, username, or location" : "Hashtag, catalog, or account query"} />
          <div className="flex flex-wrap gap-2">
            {platform === "Threads" ? (
              <>
                <button disabled={!connected || busyAction === "search"} onClick={() => void runAction("search", { query, searchType: "TOP" })} className={secondaryButtonClass}>Search</button>
                <button disabled={!connected || busyAction === "profileLookup"} onClick={() => void runAction("profileLookup", { username: query })} className={secondaryButtonClass}>Profile</button>
                <button disabled={!connected || busyAction === "profilePosts"} onClick={() => void runAction("profilePosts", { username: query })} className={secondaryButtonClass}>Posts</button>
                <button disabled={!connected || busyAction === "locationSearch"} onClick={() => void runAction("locationSearch", { query })} className={secondaryButtonClass}>Locations</button>
              </>
            ) : (
              <>
                <button disabled={!connected || busyAction === "publicSearch"} onClick={() => void runAction("publicSearch", { query })} className={secondaryButtonClass}>Hashtag search</button>
                <button disabled={!connected || busyAction === "upcomingEvents"} onClick={() => void runAction("upcomingEvents")} className={secondaryButtonClass}>Upcoming events</button>
                <button disabled={!connected || busyAction === "catalogProducts"} onClick={() => void runAction("catalogProducts", { query })} className={secondaryButtonClass}>Catalogs</button>
                <button disabled={!connected || busyAction === "adAccounts"} onClick={() => void runAction("adAccounts")} className={secondaryButtonClass}>Ads</button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "Settings" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
            {platform === "Instagram"
              ? "Enabled scopes include insights, comments, messages, content publishing, events, shopping tags, branded content, public content access, Pages, business, ads, catalog, human agent, public profile, and email."
              : "Enabled scopes include basic profile, insights, content publishing, delete, keyword search, location tags, mentions, replies, discovery, and sharing to Instagram."}
          </div>
          <a
            href={platform === "Threads" ? "/api/connect/threads" : "/api/connect/instagram?profile=personal"}
            className="flex items-center justify-center rounded-lg bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/15"
          >
            Reconnect {platform}
          </a>
        </div>
      )}

      {result && (
        <div className="mt-5">
          <div className={`mb-2 rounded-md px-3 py-2 text-sm ${result.ok ? "bg-emerald-500/15 text-emerald-100" : "bg-red-500/15 text-red-100"}`}>
            {result.ok ? `${platform} action complete.` : result.message ?? `${platform} action failed.`}
          </div>
          <pre className="max-h-72 overflow-auto rounded-md bg-black/40 p-3 text-xs text-slate-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </PremiumCard>
  );
}

function StatisticsTab() {
  const [range, setRange] = useState<Range>("Month");
  const liveMetrics = useLiveMetrics();
  const instagramProfiles = liveMetrics.instagram?.profiles ?? [];
  const metaPages = liveMetrics.meta?.metrics ?? [];
  const newGloryMeta = findNewGloryMeta(metaPages);
  const linkedInProfile = liveMetrics.linkedin?.identity?.personalProfile;
  const linkedInOrganizations = liveMetrics.linkedin?.identity?.organizations ?? [];
  const linkedInOrganization = findLinkedInOrganization(linkedInOrganizations);
  const threadsProfile = liveMetrics.threads?.profile;
  const contentItems: InstagramContentWithProfile[] = instagramProfiles
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
  const filteredContentItems = contentItems.filter((item) => isInRange(item.timestamp, range));
  const posts = filteredContentItems.filter((post) => post.sourceType !== "story");
  const storyPosts = filteredContentItems.filter((post) => post.sourceType === "story");
  const contributorPosts = filteredContentItems.filter(
    (post) => post.sourceType === "collaborator" || post.sourceType === "tagged"
  );
  const contributorMessages = Array.from(
    new Set(
      instagramProfiles
        .map((profile) => profile.contributorMessage)
        .filter((message): message is string => Boolean(message))
    )
  );
  const chartData = instagramProfiles.map((profile) => {
    const profileItems = filteredContentItems.filter(
      (item) => item.profile.profileGroup === profile.profileGroup
    );
    return {
      name: getProfileLabel(profile),
      Followers: profile.followersCount ?? 0,
      Views: profileItems.reduce((sum, post) => sum + (getPostViews(post) ?? 0), 0),
      Interactions: profileItems.reduce((sum, post) => sum + getPostEngagement(post), 0),
      Shared: profileItems.length,
    };
  });
  const activityChartData = buildActivityBuckets(filteredContentItems, range);
  const peakActivity = pickPeak(
    activityChartData,
    (item) => item.Posts + item.Stories + item.Contributor
  );
  const peakInteractions = pickPeak(activityChartData, (item) => item.Interactions);
  const topPost = pickPeak(posts, (post) => getPostViews(post) ?? getPostEngagement(post));
  const topFollowerProfile = pickPeak(
    instagramProfiles,
    (profile) => profile.insights?.follows ?? 0
  );
  const topFollowerCount = topFollowerProfile?.insights?.follows ?? null;
  const totalFollowers = instagramProfiles.reduce(
    (sum, profile) => sum + (profile.followersCount ?? 0),
    0
  ) + (liveMetrics.threads?.insights?.followersCount ?? 0);
  const postViews = posts.reduce(
    (sum, post) => sum + (getPostViews(post) ?? 0),
    0
  );
  const postInteractions = posts.reduce(
    (sum, post) => sum + getPostEngagement(post),
    0
  );
  const totalViews = postViews || (range === "Month" ? sumProfileInsights(instagramProfiles, "views") : 0);
  const totalInteractions =
    postInteractions || (range === "Month" ? sumProfileInsights(instagramProfiles, "interactions") : 0);
  const totalNewFollowers = sumProfileInsights(instagramProfiles, "follows");
  const totalSharedContent = filteredContentItems.length;
  const totalStories = storyPosts.length;
  const totalContributorContent = contributorPosts.length;
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
            ? "Loading live statistics..."
            : `${getRangeWindowLabel(range)} · content filtered by publish date · insights ${rangeLabel}`}
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
            <p className="mt-3 text-2xl font-semibold">
              <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
            </p>
          </PremiumCard>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Most posted",
            value: peakActivity
              ? `${peakActivity.name} · ${peakActivity.Posts + peakActivity.Stories + peakActivity.Contributor} items`
              : "n/a",
          },
          {
            label: "Most interactions",
            value: peakInteractions
              ? `${peakInteractions.name} · ${formatStat(peakInteractions.Interactions)}`
              : "n/a",
          },
          {
            label: "New follower lift",
            value: topFollowerProfile && topFollowerCount !== null
              ? `${getProfileLabel(topFollowerProfile)} · +${formatStat(topFollowerCount)}`
              : "n/a",
          },
          {
            label: "Top content",
            value: topPost
              ? `${getProfileLabel(topPost.profile)} · ${formatStat(getPostViews(topPost) ?? getPostEngagement(topPost))}`
              : "n/a",
          },
        ].map((item) => (
          <PremiumCard key={item.label}>
            <p className="text-sm text-slate-300">{item.label}</p>
            <p className="mt-3 text-xl font-semibold">
              <SensitiveMetricValue label={item.label}>{item.value}</SensitiveMetricValue>
            </p>
          </PremiumCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
                <dd>
                  <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
                </dd>
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
                <dd>
                  <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
                </dd>
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
                <dd>
                  <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
                </dd>
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
                <dd>
                  <SensitiveMetricValue label={label}>{value}</SensitiveMetricValue>
                </dd>
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

      <PremiumCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Activity Timeline</h2>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            {getRangeWindowLabel(range)}
          </span>
        </div>
        {activityChartData.length ? (
          <div className="privacy-sensitive-chart h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityChartData}>
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
                <Bar dataKey="Posts" fill="#818cf8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Stories" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Contributor" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Interactions" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-300">
            No Instagram activity was returned for this selected range.
          </p>
        )}
      </PremiumCard>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Instagram Account Comparison</h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              <PrivacySensitive>{instagramProfiles.length} accounts</PrivacySensitive>
            </span>
          </div>

          {chartData.length ? (
            <div className="privacy-sensitive-chart h-80">
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
                      <dd>
                        <SensitiveMetricValue label="Followers">{formatCompactStat(profile.followersCount)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Following</dt>
                      <dd>
                        <SensitiveMetricValue label="Following">{formatCompactStat(profile.followsCount)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Media</dt>
                      <dd>
                        <SensitiveMetricValue label="Media">{formatCompactStat(profile.mediaCount)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Views</dt>
                      <dd>
                        <SensitiveMetricValue label="Views">{formatCompactStat(profile.insights?.views)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Interactions</dt>
                      <dd>
                        <SensitiveMetricValue label="Interactions">{formatCompactStat(profile.insights?.interactions)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">New followers</dt>
                      <dd>
                        <SensitiveMetricValue label="New followers">{formatCompactStat(profile.insights?.follows)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Shared</dt>
                      <dd>
                        <SensitiveMetricValue label="Shared">{formatCompactStat(profile.contentSummary?.contentShared)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Stories</dt>
                      <dd>
                        <SensitiveMetricValue label="Stories">{formatCompactStat(profile.contentSummary?.activeStories)}</SensitiveMetricValue>
                      </dd>
                    </div>
                    <div className="rounded-md bg-white/5 p-2">
                      <dt className="text-xs text-slate-400">Contributor</dt>
                      <dd>
                        <SensitiveMetricValue label="Contributor">{formatCompactStat(profile.contentSummary?.collaboratorMedia)}</SensitiveMetricValue>
                      </dd>
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
            <PrivacySensitive>{posts.length} posts</PrivacySensitive>
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
                    <dd>
                      <SensitiveMetricValue label="Views">{formatCompactStat(getPostViews(post))}</SensitiveMetricValue>
                    </dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Interactions</dt>
                    <dd>
                      <SensitiveMetricValue label="Interactions">{formatCompactStat(getPostEngagement(post))}</SensitiveMetricValue>
                    </dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Reach</dt>
                    <dd>
                      <SensitiveMetricValue label="Reach">{formatCompactStat(post.insightReach)}</SensitiveMetricValue>
                    </dd>
                  </div>
                  <div className="rounded-md bg-white/5 p-2">
                    <dt className="text-xs text-slate-400">Saves + shares</dt>
                    <dd>
                      <SensitiveMetricValue label="Saves + shares">
                        {formatCompactStat((post.insightSaves ?? 0) + (post.insightShares ?? 0))}
                      </SensitiveMetricValue>
                    </dd>
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
            <PrivacySensitive>{storyPosts.length} stories</PrivacySensitive>
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
            <PrivacySensitive>{contributorPosts.length} items</PrivacySensitive>
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

function InstagramTab() {
  const liveMetrics = useLiveMetrics();
  const profiles = liveMetrics.instagram?.profiles ?? [];
  const contentItems = profiles
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SocialWorkflowPanel platform="Instagram" connected={profiles.length > 0} instagramProfiles={profiles} />

      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map((profile) => (
          <AccountStatCard
            key={profile.profileGroup}
            group={getProfileLabel(profile)}
            platform="Instagram"
            account={getProfileDisplayName(profile, "Instagram account")}
            status="Live"
            avatarUrl={profile.profilePictureUrl}
            href={profile.username ? `https://www.instagram.com/${profile.username}/` : undefined}
            stats={[
              ["Followers", formatStat(profile.followersCount)],
              ["Following", formatStat(profile.followsCount)],
              ["Media", formatStat(profile.mediaCount)],
              ["Views", formatStat(profile.insights?.views)],
              ["Reach", formatStat(profile.insights?.reach)],
              ["Interactions", formatStat(profile.insights?.interactions)],
              ["New followers", formatStat(profile.insights?.follows)],
              ["Stories", formatStat(profile.contentSummary?.activeStories)],
              ["Contributor", formatStat(profile.contentSummary?.collaboratorMedia)],
            ]}
            posts={getRegularPosts(profile)}
            stories={getStories(profile)}
            contributorPosts={getContributorPosts(profile)}
            postsMessage={profile.mediaMessage}
            contributorMessage={profile.contributorMessage}
            insightsMessage={profile.insightsMessage}
          />
        ))}
      </div>

      <PremiumCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Latest Instagram Activity</h2>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            <PrivacySensitive>{contentItems.length} items</PrivacySensitive>
          </span>
        </div>
        {contentItems.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {contentItems.slice(0, 8).map((item) => (
              <div key={`${item.profile.profileGroup}-${item.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ProfileAvatar imageUrl={item.profile.profilePictureUrl} label={item.profile.username ?? getProfileLabel(item.profile)} />
                  <div>
                    <p className="text-xs text-slate-400">{getProfileLabel(item.profile)}</p>
                    <p className="text-sm font-medium">{getProfileDisplayName(item.profile, "Instagram")}</p>
                  </div>
                </div>
                <InstagramPostPreview media={item} compact />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Connect Instagram accounts to show platform activity.</p>
        )}
      </PremiumCard>
    </motion.div>
  );
}

function ThreadsTab() {
  const liveMetrics = useLiveMetrics();
  const profile = liveMetrics.threads?.profile;
  const posts = liveMetrics.threads?.posts ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <SocialWorkflowPanel platform="Threads" connected={Boolean(profile)} />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <AccountStatCard
          group="Personal"
          platform="Threads"
          account={profile?.username ? `@${profile.username}` : connectedProfiles.personal.threads}
          status={profile ? "Live" : "Connect Threads"}
          avatarUrl={profile?.profilePictureUrl}
          href={profile?.username ? `https://www.threads.net/@${profile.username}` : undefined}
          actionHref={profile ? undefined : "/api/connect/threads"}
          actionLabel="Connect Threads"
          stats={[
            ["Followers", formatStat(liveMetrics.threads?.insights?.followersCount)],
            ["Views", formatStat(liveMetrics.threads?.insights?.views)],
            ["Likes", formatStat(liveMetrics.threads?.insights?.likes)],
            ["Replies", formatStat(liveMetrics.threads?.insights?.replies)],
            ["Reposts", formatStat(liveMetrics.threads?.insights?.reposts)],
            ["Quotes", formatStat(liveMetrics.threads?.insights?.quotes)],
          ]}
          insightsMessage={liveMetrics.threads?.insightsMessage}
        />
        <PremiumCard>
          <h2 className="mb-4 text-lg font-medium">Latest Threads Activity</h2>
          {posts.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {posts.slice(0, 6).map((post) => (
                <ExternalPostPreview key={post.id} post={post} platform="Threads" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-300">Connect Threads to show recent posts and replies.</p>
          )}
          {liveMetrics.threads?.postsMessage && (
            <p className="mt-3 text-xs text-amber-200">{liveMetrics.threads.postsMessage}</p>
          )}
        </PremiumCard>
      </div>
    </motion.div>
  );
}

function FacebookTab() {
  const liveMetrics = useLiveMetrics();
  const newGloryPage = findNewGloryMeta(liveMetrics.meta?.metrics);
  const pages = newGloryPage ? [newGloryPage] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PlatformIntro title="Facebook" connected={pages.length > 0} href="/api/connect/meta" />
      <div className="grid gap-4 lg:grid-cols-2">
        {pages.map((page) => (
          <AccountStatCard
            key={page.pageId}
            group="New Glory"
            platform="Facebook"
            account={page.pageName}
            status="Live"
            stats={[
              ["Followers", formatStat(page.fbFollowersCount ?? page.fbFollowerSnapshot)],
              ["Fans", formatStat(page.fbFanCount)],
              ["Views", formatStat(page.fbViews)],
              ["Impressions", formatStat(page.fbImpressions)],
              ["Engagements", formatStat(page.fbPostEngagements)],
              ["New followers", formatStat(page.fbNewFollowers)],
            ]}
            externalPosts={page.fbPosts}
            externalPostsPlatform="Facebook"
            postsMessage={page.fbPostsMessage}
            insightsMessage={page.fbInsightsMessage}
          />
        ))}
      </div>
    </motion.div>
  );
}

function LinkedInTab() {
  const liveMetrics = useLiveMetrics();
  const profile = liveMetrics.linkedin?.identity?.personalProfile;
  const organization = findLinkedInOrganization(liveMetrics.linkedin?.identity?.organizations);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PlatformIntro title="LinkedIn" connected={Boolean(profile || organization)} href="/api/connect/linkedin" />
      <div className="grid gap-4 lg:grid-cols-2">
        <AccountStatCard
          group="Personal"
          platform="LinkedIn"
          account={profile?.name ?? "Thijs Wijma"}
          status={profile ? "Connected" : "Connect LinkedIn"}
          href={connectedProfiles.personal.linkedin}
          actionHref={profile ? undefined : "/api/connect/linkedin"}
          actionLabel="Connect LinkedIn"
          stats={[
            ["Profile ID", profile?.sub ?? "n/a"],
            ["Email", profile?.email ?? "n/a"],
            ["Followers", formatStat(profile?.followersCount)],
            ["Connections", formatStat(profile?.connectionsCount)],
          ]}
          insightsMessage={profile?.message ?? liveMetrics.linkedin?.message}
        />
        <AccountStatCard
          group="New Glory"
          platform="LinkedIn"
          account={organization?.name ?? "New Glory Running Collective"}
          status={organization ? "Connected" : "Connect LinkedIn admin"}
          href={connectedProfiles.newGlory.linkedin}
          actionHref={organization ? undefined : "/api/connect/linkedin?mode=organization"}
          actionLabel="Connect LinkedIn admin"
          stats={[
            ["Followers", formatStat(organization?.followersCount)],
            ["Impressions", formatStat(organization?.impressions)],
            ["Clicks", formatStat(organization?.clicks)],
            ["Likes", formatStat(organization?.likes)],
            ["Comments", formatStat(organization?.comments)],
            ["Shares", formatStat(organization?.shares)],
            ["Engagement rate", formatPercent(organization?.engagementRate)],
          ]}
          insightsMessage={organization?.message}
        />
      </div>
    </motion.div>
  );
}

function TikTokTab() {
  const liveMetrics = useLiveMetrics();
  const user = liveMetrics.tiktok?.profile?.data?.user;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PlatformIntro title="TikTok" connected={Boolean(user)} href="/api/connect/tiktok" />
      <AccountStatCard
        group="Personal"
        platform="TikTok"
        account={user?.display_name ?? connectedProfiles.personal.tiktok}
        status={user ? "Connected" : "Connect TikTok"}
        actionHref={user ? undefined : "/api/connect/tiktok"}
        actionLabel="Connect TikTok"
        avatarUrl={user?.avatar_url}
        stats={[
          ["Open ID", user?.open_id ?? "n/a"],
          ["Videos", liveMetrics.tiktok?.videos?.videos?.length?.toString() ?? liveMetrics.tiktok?.videosMessage ?? "n/a"],
          ["Scopes", liveMetrics.tiktok?.scope ?? "n/a"],
        ]}
        insightsMessage={liveMetrics.tiktok?.message}
      />
    </motion.div>
  );
}

function WhatsAppTab() {
  const liveMetrics = useLiveMetrics();
  const [messages, setMessages] = useState<WhatsAppMessageMetric[]>([]);
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<LocalMediaPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WhatsAppActionResponse | null>(null);
  const whatsapp = liveMetrics.whatsapp;

  const refreshMessages = async () => {
    const response = await fetchJson<WhatsAppMetricsResponse>("/api/whatsapp/messages").catch((error: Error) => ({
      ok: false,
      configured: false,
      messages: [],
      message: error.message,
    }));
    setMessages(response.messages ?? []);
  };

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview.url);
    };
  }, [filePreview]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      if (!nextFile) return null;
      return {
        id: createClientId("wa-media"),
        url: URL.createObjectURL(nextFile),
        type: nextFile.type.startsWith("image/")
          ? "image"
          : nextFile.type.startsWith("video/")
            ? "video"
            : "file",
        name: nextFile.name,
      };
    });
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    let mediaId: string | null = null;
    let mediaType: string | null = null;
    if (file) {
      const upload = await uploadWhatsAppMedia(file);
      if (!upload.ok || !upload.mediaId) {
        setResult(upload);
        setBusy(false);
        return;
      }
      mediaId = upload.mediaId;
      mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "document";
    }

    const response = await postWhatsAppAction({
      to: recipient,
      text,
      mediaId,
      mediaType,
      filename: file?.name ?? null,
    });
    setResult(response);
    if (response.ok) {
      setText("");
      setFile(null);
      setFilePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return null;
      });
      await refreshMessages();
    }
    setBusy(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <PlatformIntro title="WhatsApp" connected={Boolean(whatsapp?.configured)} href="/api/whatsapp/messages" />

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <PremiumCard>
          <div className="mb-4">
            <h2 className="text-lg font-medium">WhatsApp Mini Interface</h2>
            <p className="mt-1 text-sm text-slate-300">
              Send text, images, videos, and documents through the WhatsApp Business Cloud API.
            </p>
          </div>

          <form onSubmit={sendMessage} className="space-y-3">
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
              placeholder="Recipient phone number, e.g. 316..."
            />
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-28 w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
              placeholder="Write a WhatsApp message..."
            />

            <label className="block cursor-pointer rounded-xl border border-dashed border-white/20 bg-black/20 p-4 text-center hover:bg-white/5">
              <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFile} className="hidden" />
              <span className="text-sm font-medium">Attach image, video, or file</span>
              <span className="mt-1 block text-xs text-slate-400">{file?.name ?? "No file selected"}</span>
            </label>

            {filePreview && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                {filePreview.type === "image" && (
                  <div className="h-64 w-full bg-cover bg-center" style={{ backgroundImage: `url(${filePreview.url})` }} />
                )}
                {filePreview.type === "video" && <video src={filePreview.url} className="max-h-64 w-full" controls />}
                {filePreview.type === "file" && <p className="p-4 text-sm text-slate-300">{filePreview.name}</p>}
              </div>
            )}

            <button
              disabled={!whatsapp?.configured || busy}
              className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send WhatsApp"}
            </button>
          </form>

          {result && (
            <div className={`mt-4 rounded-md px-3 py-2 text-sm ${result.ok ? "bg-emerald-500/15 text-emerald-100" : "bg-red-500/15 text-red-100"}`}>
              {result.ok ? "WhatsApp action complete." : result.message ?? "WhatsApp action failed."}
            </div>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Inbox</h2>
              <p className="mt-1 text-sm text-slate-300">
                Webhook path: <span className="font-mono">{whatsapp?.webhookPath ?? "/api/whatsapp/webhook"}</span>
              </p>
            </div>
            <button type="button" onClick={() => void refreshMessages()} className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
              Refresh
            </button>
          </div>

          {!whatsapp?.configured && (
            <p className="mb-4 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
              {whatsapp?.message ?? "Configure WhatsApp env vars before sending messages."}
            </p>
          )}

          <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
            {(messages.length ? messages : liveMetrics.whatsapp?.messages ?? []).length ? (
              (messages.length ? messages : liveMetrics.whatsapp?.messages ?? []).map((message) => (
                <div
                  key={`${message.id}-${message.timestamp}`}
                  className={`rounded-xl border border-white/10 p-3 text-sm ${
                    message.direction === "outbound" ? "ml-10 bg-violet-500/20" : "mr-10 bg-white/5"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{message.direction === "outbound" ? `To ${message.to}` : `From ${message.from ?? message.to}`}</span>
                    <span>{formatDate(message.timestamp)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-100">{message.text ?? message.status ?? "Media message"}</p>
                  {message.mediaType && message.mediaType !== "text" && (
                    <p className="mt-2 text-xs text-slate-400">
                      {message.mediaType} · {message.mediaId ?? "media"}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-300">
                Messages will appear here after the webhook receives inbound messages or after you send from this dashboard.
              </p>
            )}
          </div>
        </PremiumCard>
      </div>
    </motion.div>
  );
}

function PlatformIntro({
  title,
  connected,
  href,
}: {
  title: string;
  connected: boolean;
  href: string;
}) {
  return (
    <PremiumCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {connected ? "Live platform data is available." : `Connect ${title} to show live data and actions.`}
          </p>
        </div>
        <a href={href} className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium hover:bg-violet-400">
          {connected ? "Reconnect" : "Connect"}
        </a>
      </div>
    </PremiumCard>
  );
}

function PlanningTab({
  plannerState,
  setPlannerState,
}: {
  plannerState: PlannerState;
  setPlannerState: Dispatch<SetStateAction<PlannerState>>;
}) {
  const { tasks, items } = plannerState;
  const [draggingItem, setDraggingItem] = useState<PlannerDragItem | null>(null);
  const [newTask, setNewTask] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [newScheduled, setNewScheduled] = useState({
    title: "",
    platform: "Instagram",
    date: "2026-05-07",
    time: "09:00",
  });
  const days = useMemo(() => {
    const year = 2026;
    const monthIndex = 4;
    const month = String(monthIndex + 1).padStart(2, "0");
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) =>
      `${year}-${month}-${String(index + 1).padStart(2, "0")}`
    );
  }, []);

  const plannedItems = items.filter((item) => item.status !== "Draft");
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const savePlanner = (state: PlannerState = { tasks, items }) => {
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  useEffect(() => {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    let storedState: PlannerState | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PlannerState>;
        if (Array.isArray(parsed.tasks) && Array.isArray(parsed.items)) {
          storedState = { tasks: parsed.tasks as Task[], items: parsed.items as CalendarItem[] };
        }
      } catch {
        localStorage.removeItem(PLANNER_STORAGE_KEY);
      }
    }
    queueMicrotask(() => {
      if (storedState) setPlannerState(storedState);
      setPlannerLoaded(true);
    });
  }, [setPlannerState]);

  useEffect(() => {
    if (!plannerLoaded) return;
    const state = { tasks, items };
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state));
    queueMicrotask(() => {
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    });
  }, [tasks, items, plannerLoaded]);

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;

    setPlannerState((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: createClientId("task"),
          text,
          priority: "Medium",
          done: false,
          source: "Manual",
        },
      ],
    }));
    setNewTask("");
  };

  const addScheduled = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newScheduled.title.trim();
    if (!title) return;

    setPlannerState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: createClientId("plan"),
          title,
          platform: newScheduled.platform,
          date: newScheduled.date,
          time: newScheduled.time,
          status: "Draft",
        },
      ],
    }));
    setNewScheduled((prev) => ({ ...prev, title: "" }));
  };

  const deleteTask = (id: string) => {
    setPlannerState((prev) => ({
      tasks: prev.tasks.filter((task) => task.id !== id),
      items: prev.items.filter((item) => item.sourceTaskId !== id),
    }));
    if (selectedItem?.sourceTaskId === id) setSelectedItemId(null);
  };

  const deleteScheduled = (id: string) => {
    setPlannerState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const onDropDay = (date: string) => {
    if (!draggingItem) return;

    if (draggingItem.type === "scheduled") {
      setPlannerState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === draggingItem.id ? { ...item, date, status: "Scheduled" } : item
        ),
      }));
    }

    if (draggingItem.type === "task") {
      const task = tasks.find((item) => item.id === draggingItem.id);
      if (task) {
        setPlannerState((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              id: createClientId("plan"),
              title: task.text,
              platform: "Task",
              date,
              time: "09:00",
              status: "Scheduled",
              sourceTaskId: task.id,
            },
          ],
        }));
      }
    }

    setDraggingItem(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-medium">Planning</h2>
          <p className="mt-1 text-sm text-slate-300">
            Planner state is kept when switching tabs and autosaved in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => savePlanner()}
          className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium hover:bg-violet-400"
        >
          {lastSavedAt ? `Saved ${lastSavedAt}` : "Save planner"}
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">To-do List</h2>
              <p className="mt-1 text-sm text-slate-300">Drag tasks onto the calendar to plan them without removing them from this list.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {tasks.length} tasks
            </span>
          </div>

          <form onSubmit={addTask} className="mb-4 flex gap-2">
            <input
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
              placeholder="Add a task..."
            />
            <button className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium hover:bg-violet-400">
              Add
            </button>
          </form>

          <ul className="space-y-2 text-sm">
            {tasks.map((task) => (
              <li
                key={task.id}
                draggable
                onDragStart={() => setDraggingItem({ type: "task", id: task.id })}
                className="cursor-move rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-2">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() =>
                        setPlannerState((prev) => ({
                          ...prev,
                          tasks: prev.tasks.map((item) =>
                            item.id === task.id ? { ...item, done: !item.done } : item
                          ),
                        }))
                      }
                      className="mt-1"
                    />
                    <span className={task.done ? "text-slate-500 line-through" : "text-slate-100"}>
                      {task.text}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-2 flex gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full bg-white/10 px-2 py-1">{task.priority}</span>
                  <span className="rounded-full bg-white/10 px-2 py-1">{task.source}</span>
                </div>
              </li>
            ))}
          </ul>
        </PremiumCard>

        <PremiumCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Scheduled List</h2>
              <p className="mt-1 text-sm text-slate-300">Add draft content, then drag it onto the calendar when it is planned.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
              {items.length} items
            </span>
          </div>

          <form onSubmit={addScheduled} className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={newScheduled.title}
              onChange={(event) => setNewScheduled((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
              placeholder="Content title..."
            />
            <select
              value={newScheduled.platform}
              onChange={(event) => setNewScheduled((prev) => ({ ...prev, platform: event.target.value }))}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
            >
              <option>Instagram</option>
              <option>Threads</option>
              <option>Facebook</option>
              <option>LinkedIn</option>
              <option>TikTok</option>
            </select>
            <input
              type="time"
              value={newScheduled.time}
              onChange={(event) => setNewScheduled((prev) => ({ ...prev, time: event.target.value }))}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300"
            />
            <button className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium hover:bg-violet-400">
              Add
            </button>
          </form>

          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDraggingItem({ type: "scheduled", id: item.id })}
                className="cursor-move rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.platform} · {item.status === "Draft" ? "Not on calendar yet" : `${item.date} at ${item.time}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteScheduled(item.id)}
                    className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </PremiumCard>
      </div>

      <PremiumCard>
        <h2 className="mb-3 text-lg font-medium">Monthly Calendar (Drag & Drop)</h2>
        <div className="grid grid-cols-5 gap-2 text-xs lg:grid-cols-10">
          {days.map((day) => (
            <div key={day} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropDay(day)} className="min-h-16 rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-400">{day.slice(-2)}</p>
              {plannedItems
                .filter((i) => i.date === day)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setSelectedItemId(i.id)}
                    className="mt-1 w-full rounded bg-violet-500/30 px-1 py-1 text-left hover:bg-violet-400/40"
                  >
                    <p className="truncate font-medium">{i.platform}</p>
                    <p className="truncate text-[10px] text-slate-200">{i.title}</p>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </PremiumCard>

      {selectedItem && (
        <PremiumCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400">Calendar details</p>
              <h2 className="mt-1 text-xl font-medium">{selectedItem.title}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {selectedItem.platform} · {selectedItem.date} at {selectedItem.time} · {selectedItem.status}
              </p>
              {selectedItem.sourceTaskId && (
                <p className="mt-2 text-xs text-slate-400">
                  Linked to task: {tasks.find((task) => task.id === selectedItem.sourceTaskId)?.text ?? "Deleted task"}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => deleteScheduled(selectedItem.id)}
                className="rounded-md bg-red-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
              >
                Delete from calendar
              </button>
            </div>
          </div>
        </PremiumCard>
      )}
    </motion.div>
  );
}
