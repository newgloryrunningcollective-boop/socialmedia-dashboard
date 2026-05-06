"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

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
      name: string | null;
      email: string | null;
    };
    organizations: Array<{ id: string; name: string }>;
  };
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
  tikTokConnected: boolean;
  tikTokError: string | null;
};

const tabs: Tab[] = ["Home", "Statistics", "Planning"];
const ranges: Range[] = ["Day", "Week", "Month", "Year"];
const connectedProfiles = {
  personal: {
    instagram: "@thijs.wijma",
    linkedin: "https://www.linkedin.com/in/thijs-w-74b309192",
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
    tikTokConnected: tikTokStatus === "1",
    tikTokError:
      tikTokStatus === "0" ? firstParam(params.tiktok_error) ?? "TikTok connection failed." : null,
  };
}

function formatStat(value: number | null | undefined) {
  return typeof value === "number" ? new Intl.NumberFormat("en").format(value) : "n/a";
}

function normalizeHandle(value: string | null | undefined) {
  return value?.replace(/^@/, "").toLowerCase() ?? "";
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
      const [meta, instagram, linkedin, tiktok] = await Promise.all([
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
        fetchJson<TikTokMetricsResponse>("/api/tiktok/metrics").catch((error: Error) => ({
          ok: false,
          message: error.message,
        })),
      ]);

      if (!cancelled) {
        setMetrics({ meta, instagram, linkedin, tiktok, loading: false });
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

function findInstagramProfile(
  profiles: InstagramProfileMetric[] | undefined,
  profileGroup: InstagramProfileGroup
) {
  return profiles?.find((profile) => profile.profileGroup === profileGroup);
}

function findLinkedInOrganization(
  organizations: Array<{ id: string; name: string }> | undefined
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
  tikTokConnected: boolean;
  tikTokError: string | null;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
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
  const tikTokUser = liveMetrics.tiktok?.profile?.data?.user;
  const totalKnownFollowers =
    (personalInstagram?.followersCount ?? 0) +
    (newGloryInstagram?.followersCount ?? newGloryMeta?.igFollowersCount ?? 0) +
    (newGloryMeta?.fbFollowersCount ?? newGloryMeta?.fbFanCount ?? 0);
  const connectedPlatformCount = [
    Boolean(personalInstagram || newGloryInstagram),
    Boolean(newGloryMeta),
    Boolean(liveMetrics.linkedin?.identity),
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
    { label: "Connected Sources", value: liveMetrics.loading ? "Loading..." : `${connectedPlatformCount}/4` },
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
          <p className="text-sm text-slate-300">No post metrics shown yet. Connect Instagram / Facebook / LinkedIn to load real data.</p>
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
        newGloryMeta={newGloryMeta}
        linkedInOrganization={linkedInOrganization}
      />

      <div className="grid gap-4 lg:grid-cols-4">
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
              {linkedInError && <p className="text-sm text-red-300">LinkedIn connection failed.</p>}
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
      </div>
    </motion.div>
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
  linkedInOrganization: { id: string; name: string } | undefined;
}) {
  const linkedInProfile = liveMetrics.linkedin?.identity?.personalProfile;
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
            ["Type", personalInstagram?.accountType ?? "Business account required"],
          ]}
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
            ["Type", newGloryInstagram?.accountType ?? "Business account required"],
          ]}
        />

        <AccountStatCard
          group="New Glory"
          platform="Facebook"
          account={newGloryMeta?.pageName ?? "New Glory Running Collective"}
          status={newGloryMeta ? "Live" : "Connect Meta"}
          href={connectedProfiles.newGlory.facebook}
          stats={[
            ["Followers", formatStat(newGloryMeta?.fbFollowersCount)],
            ["Fans", formatStat(newGloryMeta?.fbFanCount)],
          ]}
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
          ]}
        />

        <AccountStatCard
          group="New Glory"
          platform="LinkedIn"
          account={linkedInOrganization?.name ?? "New Glory Running Collective"}
          status={linkedInOrganization ? "Connected" : "Connect LinkedIn admin"}
          href={connectedProfiles.newGlory.linkedin}
          stats={[
            ["Organization ID", linkedInOrganization?.id ?? "n/a"],
            ["Followers", "Requires LinkedIn organization stats permission"],
          ]}
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

function AccountStatCard({
  group,
  platform,
  account,
  status,
  stats,
  href,
  actionHref,
  actionLabel,
}: {
  group: string;
  platform: string;
  account: string;
  status: string;
  stats: Array<[string, string]>;
  href?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-400">{group} · {platform}</p>
          <h3 className="mt-1 text-base font-medium">{account}</h3>
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
    </article>
  );
}

function StatisticsTab() {
  const [range, setRange] = useState<Range>("Month");
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
        <p className="text-sm text-slate-300">{range} view selected. Connect accounts to display real charts.</p>
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
