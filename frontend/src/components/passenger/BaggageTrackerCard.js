import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Luggage,
  CircleDot,
  CheckCircle2,
  Clock,
  Check,
  Sparkles,
  Layers
} from "lucide-react";
import { fmtTime, minsFromNow } from "@/lib/format";

const CONVEYOR_BAGS = [
  {
    bodyColor: "#1e3a8a",
    strokeColor: "#3b82f6",
    strapColor: "#172554",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#881337",
    strokeColor: "#be123c",
    strapColor: "#4c0519",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#065f46",
    strokeColor: "#059669",
    strapColor: "#022c22",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#9a3412",
    strokeColor: "#ea580c",
    strapColor: "#431407",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#334155",
    strokeColor: "#64748b",
    strapColor: "#0f172a",
    handleColor: "#020617",
    wheelColor: "#000000",
  },
  {
    bodyColor: "#581c87",
    strokeColor: "#9333ea",
    strapColor: "#2e1065",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#b45309",
    strokeColor: "#f59e0b",
    strapColor: "#78350f",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#0d9488",
    strokeColor: "#14b8a6",
    strapColor: "#0f766e",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#7c3aed",
    strokeColor: "#8b5cf6",
    strapColor: "#5b21b6",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#dc2626",
    strokeColor: "#ef4444",
    strapColor: "#991b1b",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#0891b2",
    strokeColor: "#06b6d4",
    strapColor: "#164e63",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#ca8a04",
    strokeColor: "#eab308",
    strapColor: "#713f12",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#4d7c0f",
    strokeColor: "#65a30d",
    strapColor: "#365314",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#be185d",
    strokeColor: "#ec4899",
    strapColor: "#831843",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#4338ca",
    strokeColor: "#6366f1",
    strapColor: "#312e81",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
  {
    bodyColor: "#047857",
    strokeColor: "#10b981",
    strapColor: "#064e3b",
    handleColor: "#0f172a",
    wheelColor: "#020617",
  },
];

export default function BaggageTrackerCard({ baggage, flight }) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeBags, setActiveBags] = useState([]);
  const prevPctRef = useRef(0);
  const lastSpawnedPctRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const firstMin = baggage?.first_bag_time ? minsFromNow(baggage.first_bag_time) : 0;
  const lastMin = baggage?.last_bag_time ? minsFromNow(baggage.last_bag_time) : 0;
  const firstMs = baggage?.first_bag_time ? new Date(baggage.first_bag_time).getTime() : 0;
  const lastMs = baggage?.last_bag_time ? new Date(baggage.last_bag_time).getTime() : 0;
  const now = currentTime;

  const flightArrived = flight?.ata || flight?.sta;
  const flightArrivedMs = flightArrived ? new Date(flightArrived).getTime() : 0;
  const hasDeparted = flightArrivedMs > 0 && now >= flightArrivedMs;

  const started = Boolean(baggage && hasDeparted && now >= firstMs);
  const cleared = Boolean(baggage && now >= lastMs);

  let calculatedProgress = 0;
  if (started && !cleared && lastMs > firstMs) {
    calculatedProgress = Math.min(100, Math.max(0, ((now - firstMs) / (lastMs - firstMs)) * 100));
  } else if (cleared) {
    calculatedProgress = 100;
  }

  const lastColorIndexRef = useRef(-1);

  useEffect(() => {
    if (!baggage || !started || cleared) {
      setActiveBags([]);
      lastColorIndexRef.current = -1;
      return;
    }

    const interval = setInterval(() => {

      let colorIndex;
      do {
        colorIndex = Math.floor(Math.random() * CONVEYOR_BAGS.length);
      } while (colorIndex === lastColorIndexRef.current && CONVEYOR_BAGS.length > 1);

      lastColorIndexRef.current = colorIndex;
      const bagStyle = CONVEYOR_BAGS[colorIndex];

      const newBag = {
        id: `bag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pct: Math.floor(Math.random() * 100),
        ...bagStyle,
      };
      setActiveBags((prev) => {
        const combined = [...prev, newBag];
        return combined.length > 15 ? combined.slice(combined.length - 15) : combined;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [started, cleared, baggage]);

  const handleBagComplete = (bagId) => {
    setActiveBags((prev) => prev.filter((b) => b.id !== bagId));
  };

  if (!baggage) {
    return (
      <div className="aero-card p-6" data-testid="baggage-tracker-card">
        <div className="overline text-aero-t3 mb-2">Baggage Reclaim</div>
        <p className="text-sm text-aero-t2">
          Baggage prediction becomes available once your flight has landed and bags are inducted.
        </p>
      </div>
    );
  }

  const totalBags = baggage.bag_count || 185;
  const roundedPct = Math.round(calculatedProgress);
  const deliveredBags = Math.round((roundedPct / 100) * totalBags);
  const carouselNum = flight?.carousel_number || "T3-06";

  return (
    <div className="aero-card p-6 relative overflow-hidden" data-testid="baggage-tracker-card">
      {}
      <div className="flex items-center justify-between mb-6 relative flex-wrap gap-3">
        <div>
          <div className="overline text-aero-t3 flex items-center gap-2">
            <span>Baggage Reclaim Console</span>
            <span>·</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold whitespace-nowrap">Carousel {carouselNum}</span>
          </div>
          <h3 className="font-display text-2xl font-bold mt-0.5 flex items-center gap-2 flex-wrap">
            {flight?.flight_number} · <span className="text-aero-t2 font-normal">{flight?.airline_name}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {started && !cleared && (
            <span
              className="text-xs font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-400/40 rounded-full px-3 py-1 flex items-center gap-2 whitespace-nowrap"
              data-testid="belt-active-badge"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" /> BELT ACTIVE
            </span>
          )}
          {cleared && (
            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-400/40 rounded-full px-3 py-1 flex items-center gap-2 whitespace-nowrap">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> ALL DELIVERED (100%)
            </span>
          )}
          {baggage.staff_added_delay_minutes > 0 && (
            <span className="text-xs font-mono font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-400/40 rounded-full px-3 py-1 whitespace-nowrap">
              +{baggage.staff_added_delay_minutes}m DELAY
            </span>
          )}
        </div>
      </div>

      {}
      <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-[#07101d] p-5 mb-6 shadow-md relative overflow-hidden">
        {}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center text-cyan-600 dark:text-cyan-400 shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide whitespace-nowrap">
                  Belt Conveyor System · Carousel {carouselNum}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 whitespace-nowrap shrink-0">
                  LIVE TRACK
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-aero-t3 font-mono flex items-center gap-2 mt-0.5 whitespace-nowrap">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{started ? "Motor: Continuous Unload · 0.5 m/s" : "Standby · Ready for Unload"}</span>
              </div>
            </div>
          </div>

          {}
          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
            <div className="text-right">
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-aero-t3">Induction Level</div>
              <div className="font-display text-3xl sm:text-4xl font-black text-cyan-700 dark:text-cyan-300 tabular-nums">
                {roundedPct}%
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-300 dark:bg-slate-700" />
            <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm flex flex-col items-center justify-center">
              <span>{deliveredBags} / {totalBags}</span>
              <span className="text-[9px] font-medium text-slate-500 dark:text-aero-t3">bags claimed</span>
            </div>
          </div>
        </div>

        {}
        <div className="relative h-20 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-[#030712] p-2 shadow-inner">
          {}
          <div className="absolute inset-x-0 top-0 h-2 bg-slate-300 dark:bg-slate-800 border-b border-slate-400 dark:border-slate-700 z-20" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-slate-300 dark:bg-slate-800 border-t border-slate-400 dark:border-slate-700 z-20" />

          {}
          <div className="absolute inset-x-0 top-2 bottom-2 bg-[repeating-linear-gradient(90deg,#cbd5e1_0px,#cbd5e1_16px,#94a3b8_16px,#94a3b8_18px)] dark:bg-[repeating-linear-gradient(90deg,#0f172a_0px,#0f172a_18px,#1e293b_18px,#1e293b_20px)] opacity-60 pointer-events-none" />

          {}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-6 pointer-events-none flex flex-col items-center justify-between py-1 z-20">
            <div className="w-3.5 h-1 rounded-full bg-cyan-600 dark:bg-cyan-400 opacity-80" />
            <div className="w-[1px] h-full bg-cyan-500/40 dark:bg-cyan-400/40" />
            <div className="w-3.5 h-1 rounded-full bg-cyan-600 dark:bg-cyan-400 opacity-80" />
          </div>

          {}
          {!started && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-4">
              <div className="flex items-center gap-2.5 bg-slate-900/90 dark:bg-[#071322]/90 backdrop-blur-md border border-cyan-500/30 text-cyan-300 px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/10">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </div>
                <span className="text-xs font-mono font-medium tracking-wide text-slate-200">
                  Ramp Offload Active · First bag arrives at <b className="text-cyan-400 font-bold">{fmtTime(baggage.first_bag_time)}</b> (~{Math.max(1, firstMin)}m)
                </span>
              </div>
            </div>
          )}

          {}
          {cleared && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-4">
              <div className="flex items-center gap-2.5 bg-emerald-950/90 dark:bg-[#041d17]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/10">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold tracking-wide">
                  All {totalBags} bags delivered to Carousel {carouselNum}
                </span>
              </div>
            </div>
          )}

          {}
          {started && !cleared && activeBags.map((bag) => (
            <motion.div
              key={bag.id}
              initial={{ left: "-60px" }}
              animate={{ left: "calc(100% + 60px)" }}
              transition={{
                duration: 12,
                ease: "linear",
              }}
              onAnimationComplete={() => handleBagComplete(bag.id)}
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 shrink-0"
              style={{
                width: "44px",
                height: "30px",
                minWidth: "44px",
                maxWidth: "44px",
                minHeight: "30px",
                maxHeight: "30px",
                flexShrink: 0,
              }}
            >
              <svg
                viewBox="0 0 44 30"
                className="w-full h-full block shrink-0"
                style={{ overflow: "visible" }}
              >
                <ellipse cx="22" cy="27" rx="16" ry="2.5" fill="#000000" opacity="0.45" />
                <path
                  d="M 17 6 L 17 3 A 2 2 0 0 1 19 1 L 25 1 A 2 2 0 0 1 27 3 L 27 6"
                  fill="none"
                  stroke={bag.handleColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="26" r="2" fill={bag.wheelColor} stroke="#475569" strokeWidth="0.5" />
                <circle cx="32" cy="26" r="2" fill={bag.wheelColor} stroke="#475569" strokeWidth="0.5" />
                <rect
                  x="6"
                  y="6"
                  width="32"
                  height="19"
                  rx="4"
                  fill={bag.bodyColor}
                  stroke={bag.strokeColor}
                  strokeWidth="1.2"
                />
                <line
                  x1="6"
                  y1="15.5"
                  x2="38"
                  y2="15.5"
                  stroke={bag.strapColor}
                  strokeWidth="2"
                />
                <path d="M 6 10 L 10 6" stroke={bag.strapColor} strokeWidth="1.5" />
                <path d="M 38 10 L 34 6" stroke={bag.strapColor} strokeWidth="1.5" />
                <path d="M 6 21 L 10 25" stroke={bag.strapColor} strokeWidth="1.5" />
                <path d="M 38 21 L 34 25" stroke={bag.strapColor} strokeWidth="1.5" />
              </svg>
            </motion.div>
          ))}
        </div>

        {}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2 font-mono">
            <span className="text-slate-800 dark:text-aero-t2 flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Baggage Stream Clearance
            </span>
            <span className="text-cyan-800 dark:text-cyan-300 font-bold">
              {roundedPct}% Completed ({deliveredBags} of {totalBags} bags)
            </span>
          </div>

          <div className="relative h-3.5 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, Math.min(100, roundedPct))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          {}
          <div className="flex justify-between text-[9px] font-mono font-medium text-slate-500 dark:text-aero-t3 mt-2 px-1">
            <span>0% Gate Induct</span>
            <span>25% First Bag</span>
            <span>50% Bulk Stream</span>
            <span>75% Final Cart</span>
            <span>100% Cleared</span>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 p-3.5 bg-emerald-50/80 dark:bg-emerald-500/[0.08]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-400">
            <CircleDot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> First bag ETA
          </div>
          <div className="font-display text-2xl font-black tabular text-emerald-800 dark:text-emerald-300 mt-0.5">
            {fmtTime(baggage.first_bag_time)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-slate-400 font-mono mt-0.5">
            {firstMin > 0 ? `in ~${firstMin} min` : "arrived on belt"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3.5 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-aero-t2">
            <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-aero-t3" /> Last bag ETA
          </div>
          <div className="font-display text-2xl font-black tabular text-slate-900 dark:text-white mt-0.5">
            {fmtTime(baggage.last_bag_time)}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
            {lastMin > 0 ? `in ~${lastMin} min` : "all bags delivered"}
          </div>
        </div>
      </div>
    </div>
  );
}
