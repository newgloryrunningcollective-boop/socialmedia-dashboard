"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Tab = "Home" | "Statistics" | "Planning";
type Range = "Day" | "Week" | "Month" | "Year";
type Task = { id: string; text: string; priority: "High" | "Medium" | "Low"; done: boolean; source: "Manual" | "Auto" };
type CalendarItem = { id: string; title: string; platform: string; date: string; time: string; status: "Draft" | "Scheduled" | "Posted" };

const tabs: Tab[] = ["Home", "Statistics", "Planning"];
const ranges: Range[] = ["Day", "Week", "Month", "Year"];

const initialTasks: Task[] = [
  { id: "t1", text: "Review weekly content pillars", priority: "High", done: false, source: "Manual" },
  { id: "t2", text: "Post running club update at peak hour", priority: "Medium", done: false, source: "Auto" },
  { id: "t3", text: "Refine CTA on latest carousel", priority: "Low", done: true, source: "Manual" }
];

const initialPlan: CalendarItem[] = [
  { id: "p1", title: "Interval training reel", platform: "Instagram", date: "2026-05-07", time: "19:00", status: "Scheduled" },
  { id: "p2", title: "Community progress post", platform: "LinkedIn", date: "2026-05-08", time: "08:30", status: "Draft" }
];

export default function DashboardPage() {
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

        {activeTab === "Home" && <HomeTab />}
        {activeTab === "Statistics" && <StatisticsTab />}
        {activeTab === "Planning" && <PlanningTab />}
      </div>
    </main>
  );
}

function PremiumCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_48px_rgba(76,29,149,0.25)] backdrop-blur-xl">{children}</section>;
}

function HomeTab() {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");

  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const addManualTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), text: newTask.trim(), priority: "Medium", done: false, source: "Manual" }, ...prev]);
    setNewTask("");
  };

  const kpis = [
    { label: "Total Followers", value: "Connect accounts" },
    { label: "Monthly Growth", value: "Connect accounts" },
    { label: "Engagement Rate", value: "Connect accounts" }
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
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add manual task..." className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" />
            <button onClick={addManualTask} className="rounded-lg bg-indigo-500 px-3 py-2 text-sm hover:bg-indigo-400">Add</button>
          </div>
          <ul className="space-y-2 text-sm">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                  <span className={task.done ? "line-through text-slate-500" : ""}>{task.text}</span>
                </label>
                <span className="text-xs text-slate-300">{task.priority} · {task.source}</span>
              </li>
            ))}
          </ul>
        </PremiumCard>
        <PremiumCard>
          <h2 className="mb-3 text-lg font-medium">Recent Posts</h2>
          <p className="text-sm text-slate-300">No post metrics shown yet. Connect Instagram / Facebook / LinkedIn to load real data.</p>
        </PremiumCard>
      </div>
    </motion.div>
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
              <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1 text-xs ${range === r ? "bg-violet-500" : "bg-white/10"}`}>{r}</button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-300">{range} view selected. Connect accounts to display real charts (no demo data).</p>
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
            <li key={item.id} draggable onDragStart={() => setDraggingId(item.id)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-move">
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
              {items.filter((i) => i.date === day).map((i) => <p key={i.id} className="mt-1 rounded bg-violet-500/30 px-1">{i.platform}</p>)}
            </div>
          ))}
        </div>
      </PremiumCard>
    </motion.div>
  );
}