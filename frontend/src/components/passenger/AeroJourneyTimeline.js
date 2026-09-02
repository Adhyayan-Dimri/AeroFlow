import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, Luggage, ShieldCheck, FileCheck, PlaneTakeoff, PlaneLanding } from "lucide-react";

const ICONS = {
  entry: DoorOpen,
  checkin: Luggage,
  security: ShieldCheck,
  immigration: FileCheck,
  gate: PlaneTakeoff,
  arrival: PlaneLanding,
  baggage: Luggage,
};

const LEVEL = {
  normal: {
    c: "#10B981",
    label: "Normal",
    ring: "rgba(16,185,129,0.35)",
    glow: "rgba(16,185,129,0.18)",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.3)",
  },
  medium: {
    c: "#F59E0B",
    label: "Moderate",
    ring: "rgba(245,158,11,0.4)",
    glow: "rgba(245,158,11,0.18)",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.35)",
  },
  heavy: {
    c: "#F43F5E",
    label: "Heavy",
    ring: "rgba(244,63,94,0.45)",
    glow: "rgba(244,63,94,0.22)",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.4)",
  },
};

function fmtClock(d) {
  if (!d) return "--:--";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function buildNodes(forecast) {
  if (!forecast) return [];
  if (forecast.direction === "arrival") {
    const nodes = [
      {
        id: "landed",
        type: "arrival",
        name: "Aircraft Arrival",
        sub: "On-block at stand",
        estimatedMinutes: 3,
        walkMinutes: 0,
        level: "normal",
      },
    ];
    (forecast.steps || []).forEach((s) => {
      nodes.push({
        id: s.zone_id,
        type: s.zone_type,
        name: s.name.split("·")[0].trim(),
        sub: "Immigration & document check",
        estimatedMinutes: s.wait_minutes,
        walkMinutes: s.walk_minutes || 6,
        level: s.crowd_level || "normal",
      });
    });
    if (forecast.baggage) {
      const first = new Date(forecast.baggage.first_bag_time).getTime();
      const last = new Date(forecast.baggage.last_bag_time).getTime();
      const beltMin = first && last ? Math.max(6, Math.round((last - first) / 60000)) : 8;
      nodes.push({
        id: "baggage",
        type: "baggage",
        name: "Baggage Reclaim",
        sub: `~${forecast.baggage.bag_count ?? "—"} bags on belt`,
        estimatedMinutes: beltMin,
        walkMinutes: 4,
        level: "normal",
      });
    }
    return nodes;
  }
  const nodes = [
    {
      id: "entry",
      type: "entry",
      name: "Terminal Entry",
      sub: "ID & DigiYatra check",
      estimatedMinutes: forecast.entry_wait_minutes ?? 4,
      walkMinutes: 0,
      level: "normal",
    },
  ];
  (forecast.steps || []).forEach((s) => {
    nodes.push({
      id: s.zone_id,
      type: s.zone_type,
      name: s.name.split("·")[0].trim(),
      sub: s.name.includes("·") ? s.name.split("·")[1].trim() : "",
      estimatedMinutes: s.wait_minutes,
      walkMinutes: s.walk || s.walk_minutes || 0,
      level: s.crowd_level || "normal",
      counters: s.counters_open,
      rec: s.recommended_counters,
    });
  });
  return nodes;
}

export default function AeroJourneyTimeline({ forecast }) {
  const [active, setActive] = useState(null);
  const nodes = buildNodes(forecast);
  const n = nodes.length;

  const anchor =
    forecast?.direction === "arrival"
      ? forecast?.ata || forecast?.sta
        ? new Date(forecast.ata || forecast.sta)
        : null
      : forecast?.etd || forecast?.std
      ? new Date(forecast.etd || forecast.std)
      : null;

  let cumulative = [];
  if (anchor && forecast?.direction === "arrival") {
    let t = new Date(anchor);
    nodes.forEach((node) => {
      t = new Date(t.getTime() + (node.walkMinutes || 0) * 60000);
      const arrive = new Date(t);
      t = new Date(t.getTime() + (node.estimatedMinutes || 0) * 60000);
      cumulative.push({ arrive: fmtClock(arrive), done: fmtClock(t) });
    });
  } else if (anchor) {
    const std = anchor;
    const totalToGate = nodes.reduce((a, x) => a + (x.estimatedMinutes || 0) + (x.walkMinutes || 0), 0);
    let t = new Date(std.getTime() - (totalToGate + (forecast?.boarding_buffer_minutes || 25)) * 60000);
    nodes.forEach((node) => {
      t = new Date(t.getTime() + (node.walkMinutes || 0) * 60000);
      const arrive = new Date(t);
      t = new Date(t.getTime() + (node.estimatedMinutes || 0) * 60000);
      cumulative.push({ arrive: fmtClock(arrive), done: fmtClock(t) });
    });
  }

  const worst = nodes.reduce(
    (m, x) => (x.level === "heavy" ? "heavy" : m === "heavy" ? "heavy" : x.level === "medium" ? "medium" : m),
    "normal"
  );
  const totalMin = Math.round(
    nodes.reduce((a, x) => a + (x.estimatedMinutes || 0) + (x.walkMinutes || 0), 0)
  );

  return (
    <div
      className="aero-card p-6 sm:p-8 relative overflow-hidden transition-all duration-300"
      data-testid="aero-journey-timeline"
    >
      {}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none transition-colors duration-500"
        style={{ background: LEVEL[worst].c }}
      />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none bg-aero-cyan" />

      {}
      <div className="flex items-center justify-between mb-8 relative flex-wrap gap-3">
        <div>
          <div className="overline text-aero-t3">Journey Forecast · {forecast?.flight?.terminal || "T3"}</div>
          <h3 className="font-display text-2xl font-bold mt-1">Your path through the terminal</h3>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-display text-3xl font-black tabular" style={{ color: LEVEL[worst].c }}>
              {totalMin}
              <span className="text-sm text-aero-t3 ml-1 font-sans">min</span>
            </div>
            <div className="text-[10px] text-aero-t3 uppercase tracking-wider font-semibold">est. in-terminal</div>
          </div>
        </div>
      </div>

      {}
      <div className="hidden md:block relative">
        {}
        <div className="absolute left-0 right-0 z-0 pointer-events-none" style={{ top: 37 }}>
          <div className="h-[3px] mx-[6%] rounded-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500/60 via-amber-500/60 to-cyan-500/60" />
          </div>
        </div>

        <div className="grid relative z-10" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {nodes.map((node, i) => {
            const Icon = ICONS[node.type] || DoorOpen;
            const L = LEVEL[node.level];
            const isActive = active === i;

            return (
              <div key={node.id} className="flex flex-col items-center px-1 relative">
                {}
                <motion.button
                  data-testid={`journey-step-${node.type}`}
                  onClick={() => setActive(isActive ? null : i)}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative w-[74px] h-[74px] rounded-full grid place-items-center transition-all duration-300 cursor-pointer z-10 ${
                    isActive
                      ? "ring-4 ring-offset-2 ring-aero-cyan/70 dark:ring-offset-slate-900 shadow-xl"
                      : "hover:shadow-lg"
                  }`}
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${L.c}22, transparent), var(--aero-surface)`,
                    border: `2px solid ${L.c}`,
                    boxShadow: isActive ? `0 0 20px ${L.glow}` : `0 4px 14px -2px ${L.glow}`,
                  }}
                >
                  {node.level === "heavy" && (
                    <span className="absolute inset-0 rounded-full ping-ring" style={{ background: L.ring }} />
                  )}

                  <Icon className="w-7 h-7 transition-transform duration-200" style={{ color: L.c }} />

                  {}
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-aero-surface border border-aero-border grid place-items-center text-[10px] font-mono font-bold text-aero-t2 shadow-sm z-20">
                    {i + 1}
                  </span>
                </motion.button>

                {}
                <div className="mt-4 text-center">
                  <div
                    className={`font-semibold text-sm leading-tight transition-colors ${
                      isActive ? "text-aero-cyan" : "text-aero-text"
                    }`}
                  >
                    {node.name}
                  </div>
                  {cumulative[i] && (
                    <div className="font-mono text-[11px] text-aero-t3 mt-0.5">
                      {cumulative[i].arrive} → {cumulative[i].done}
                    </div>
                  )}
                </div>

                {}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="font-display text-2xl font-black tabular" style={{ color: L.c }}>
                    {node.estimatedMinutes}
                    <span className="text-[11px] text-aero-t3 ml-0.5 font-sans">min</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all border"
                    style={{
                      color: L.c,
                      background: L.bg,
                      borderColor: L.border,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: L.c }} />
                    {L.label}
                  </span>
                </div>

                {}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="mt-3 text-[11px] text-aero-t2 glass rounded-xl p-3 w-full text-center border border-aero-border shadow-md"
                    >
                      {node.sub && <div className="text-aero-t1 font-medium">{node.sub}</div>}
                      {node.walkMinutes ? (
                        <div className="text-aero-t3 mt-1 font-mono text-[10px]">
                          ~{node.walkMinutes} min walk to reach
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {}
      <div className="md:hidden relative">
        <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-aero-emerald/50 to-aero-cyan/50 z-0 pointer-events-none" />
        <div className="space-y-3 relative z-10">
          {nodes.map((node, i) => {
            const Icon = ICONS[node.type] || DoorOpen;
            const L = LEVEL[node.level];
            const isActive = active === i;

            return (
              <div
                key={node.id}
                className="relative flex items-center gap-4"
                data-testid={`journey-step-m-${node.type}`}
              >
                <div
                  onClick={() => setActive(isActive ? null : i)}
                  className="relative w-14 h-14 rounded-full grid place-items-center shrink-0 z-10 cursor-pointer transition-transform active:scale-95 shadow-md"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${L.c}22, transparent), var(--aero-surface)`,
                    border: `2px solid ${L.c}`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: L.c }} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-aero-surface border border-aero-border grid place-items-center text-[9px] font-mono font-bold text-aero-t2 z-20">
                    {i + 1}
                  </span>
                </div>
                <div
                  onClick={() => setActive(isActive ? null : i)}
                  className={`flex-1 aero-card p-3 flex items-center justify-between cursor-pointer transition-all ${
                    isActive ? "ring-2 ring-aero-cyan/50" : ""
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-aero-text">{node.name}</div>
                    {cumulative[i] && (
                      <div className="font-mono text-[10px] text-aero-t3">
                        {cumulative[i].arrive} → {cumulative[i].done}
                      </div>
                    )}
                    <span
                      className="inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                      style={{
                        color: L.c,
                        background: L.bg,
                        borderColor: L.border,
                      }}
                    >
                      {L.label}
                    </span>
                  </div>
                  <div className="font-display text-xl font-black tabular" style={{ color: L.c }}>
                    {node.estimatedMinutes}
                    <span className="text-[10px] text-aero-t3 font-sans ml-0.5">m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
