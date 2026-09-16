import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Layers,
  AlertTriangle,
  Users,
  Clock,
  ShieldCheck,
  Sparkles,
  Maximize2,
  RefreshCw,
  Play,
  Pause,
  Info,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Flame,
  Plane
} from "lucide-react";
import api from "@/lib/api";

const TERMINAL_ZONES = [
  // Forecourt & Entry
  {
    id: "forecourt_north",
    name: "Forecourt Entry (Gates 1–4)",
    category: "forecourt",
    coords: { x: 40, y: 30, w: 220, h: 55 },
    baseCapacity: 1200,
    baseLoad: 580,
    waitMultiplier: 0.008,
    staffingKey: "Entry Gates (DigiYatra & CISF)",
    recommendedAction: "Activate DigiYatra overflow e-gates at Gate 2.",
  },
  {
    id: "forecourt_south",
    name: "Forecourt Entry (Gates 5–8)",
    category: "forecourt",
    coords: { x: 280, y: 30, w: 220, h: 55 },
    baseCapacity: 1200,
    baseLoad: 690,
    waitMultiplier: 0.009,
    staffingKey: "Entry Gates (Standard Verification)",
    recommendedAction: "Shift 2 manual verification marshals to Gate 6.",
  },

  // Check-in Islands
  {
    id: "checkin_a_b",
    name: "Check-in Islands A & B",
    category: "checkin",
    coords: { x: 40, y: 115, w: 135, h: 80 },
    baseCapacity: 850,
    baseLoad: 540,
    waitMultiplier: 0.018,
    staffingKey: "Domestic Check-in Counters",
    recommendedAction: "Convert 2 standby counters to Express Bag Drop.",
  },
  {
    id: "checkin_c_d",
    name: "Check-in Islands C & D",
    category: "checkin",
    coords: { x: 195, y: 115, w: 145, h: 80 },
    baseCapacity: 950,
    baseLoad: 680,
    waitMultiplier: 0.016,
    staffingKey: "Full Service & Priority Check-in",
    recommendedAction: "Open dedicated Business Class baggage injection belt.",
  },
  {
    id: "checkin_e_k",
    name: "Check-in Islands E–K (Intl / Self Drop)",
    category: "checkin",
    coords: { x: 360, y: 115, w: 140, h: 80 },
    baseCapacity: 1100,
    baseLoad: 720,
    waitMultiplier: 0.015,
    staffingKey: "Self Bag Drop (SBD) Automated Matrix",
    recommendedAction: "Dispatch ground marshals to assist passengers at SBD kiosks.",
  },

  // Security Hold Area (SHA)
  {
    id: "security_sha_north",
    name: "Security Screening SHA (North)",
    category: "security",
    coords: { x: 40, y: 225, w: 215, h: 85 },
    baseCapacity: 1500,
    baseLoad: 1180,
    waitMultiplier: 0.012,
    staffingKey: "Domestic Security Lanes (X-Ray & ATRS)",
    recommendedAction: "Open Lanes 9 & 10 ATRS to absorb inbound passenger surge.",
  },
  {
    id: "security_sha_south",
    name: "Security Screening SHA (South)",
    category: "security",
    coords: { x: 285, y: 225, w: 215, h: 85 },
    baseCapacity: 1500,
    baseLoad: 1040,
    waitMultiplier: 0.011,
    staffingKey: "International Security Lanes",
    recommendedAction: "All 12 lanes optimal; maintain continuous lane monitoring.",
  },

  // Immigration & Customs
  {
    id: "immigration_hall",
    name: "International Immigration & E-Gates",
    category: "immigration",
    coords: { x: 140, y: 340, w: 260, h: 70 },
    baseCapacity: 1600,
    baseLoad: 1210,
    waitMultiplier: 0.014,
    staffingKey: "Immigration Counters & Biometric E-Gates",
    recommendedAction: "Deploy 4 additional immigration officers to E-Gate assistance desks.",
  },

  // Departure Piers / Airside
  {
    id: "pier_a_gates",
    name: "Departure Pier A (Gates 1–18)",
    category: "piers",
    coords: { x: 40, y: 440, w: 195, h: 90 },
    baseCapacity: 2400,
    baseLoad: 1450,
    waitMultiplier: 0.003,
    staffingKey: "Airside Boarding Concourses",
    recommendedAction: "Stagger pre-boarding calls for Widebody flights at Gate 14.",
  },
  {
    id: "central_retail_lounge",
    name: "Central Airside Lounge & Concourse",
    category: "piers",
    coords: { x: 250, y: 440, w: 140, h: 90 },
    baseCapacity: 1800,
    baseLoad: 920,
    waitMultiplier: 0.002,
    staffingKey: "Airside Transit Node",
    recommendedAction: "Flow smooth. Retail and lounge access operating under normal load.",
  },
  {
    id: "pier_b_gates",
    name: "Departure Pier B (Gates 19–36)",
    category: "piers",
    coords: { x: 405, y: 440, w: 195, h: 90 },
    baseCapacity: 2400,
    baseLoad: 1620,
    waitMultiplier: 0.003,
    staffingKey: "International Boarding Concourse",
    recommendedAction: "Boarding call synchronization active for Gate 27 & 28.",
  },

  // Arrivals & Baggage Claim
  {
    id: "baggage_claim_hall",
    name: "Arrivals Baggage Claim (Belts AC-01–14)",
    category: "baggage",
    coords: { x: 100, y: 560, w: 440, h: 80 },
    baseCapacity: 2800,
    baseLoad: 1890,
    waitMultiplier: 0.007,
    staffingKey: "Reclaim Belts & Offload Ground Teams",
    recommendedAction: "Prioritize Belt AC-04 offload; flight 6E-204 luggage arriving in 4 min.",
  },
];

const ZONE_CATEGORIES = [
  { id: "all", label: "All Terminal Zones" },
  { id: "forecourt", label: "Forecourt & Entry" },
  { id: "checkin", label: "Check-in Concourse" },
  { id: "security", label: "Security (SHA)" },
  { id: "immigration", label: "Immigration Hall" },
  { id: "piers", label: "Departure Piers" },
  { id: "baggage", label: "Baggage Claim" },
];

function getDensityColor(ratio) {
  if (ratio < 0.35) {
    return {
      fill: "rgba(6, 182, 212, 0.28)",
      stroke: "#06B6D4",
      badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
      status: "Low Density",
      intensity: "Lull",
    };
  }
  if (ratio < 0.65) {
    return {
      fill: "rgba(16, 185, 129, 0.35)",
      stroke: "#10B981",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      status: "Moderate Flow",
      intensity: "Normal",
    };
  }
  if (ratio < 0.85) {
    return {
      fill: "rgba(245, 158, 11, 0.45)",
      stroke: "#F59E0B",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      status: "Heavy Congestion",
      intensity: "High",
    };
  }
  return {
    fill: "rgba(244, 63, 94, 0.6)",
    stroke: "#F43F5E",
    badge: "bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
    status: "Peak Bottleneck",
    intensity: "Critical",
  };
}

export default function TerminalSpatialHeatmap() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedZone, setSelectedZone] = useState(null);
  const [simHour, setSimHour] = useState(new Date().getHours());
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({});

  // Fetch real zone metrics if available
  useEffect(() => {
    api.get("/zones")
      .then(({ data }) => {
        if (data?.zones) {
          const map = {};
          data.zones.forEach((z) => {
            map[z.zone_id] = z;
          });
          setLiveMetrics(map);
        }
      })
      .catch(() => {});
  }, []);

  // Time scrubber autoplay
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setSimHour((prev) => (prev + 1) % 24);
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Hourly rush multiplier
  const hourMultiplier = useMemo(() => {
    const h = simHour;
    if (h >= 0 && h <= 4) return 0.45 + h * 0.05;
    if (h >= 5 && h <= 9) return 1.15 + (h - 5) * 0.08;
    if (h >= 10 && h <= 15) return 0.85 + (h % 3) * 0.05;
    if (h >= 16 && h <= 22) return 1.35 + (h - 16) * 0.04;
    return 0.75;
  }, [simHour]);

  // Calculated zone stats
  const zonesData = useMemo(() => {
    return TERMINAL_ZONES.map((zone) => {
      const live = liveMetrics[zone.id];
      let pax = Math.round((live?.passenger_count || zone.baseLoad) * hourMultiplier);
      const cap = zone.baseCapacity;
      const ratio = Math.min(1.0, pax / cap);
      const waitMin = +(pax * zone.waitMultiplier).toFixed(1);
      const color = getDensityColor(ratio);

      return {
        ...zone,
        currentPax: pax,
        capacity: cap,
        densityPct: Math.round(ratio * 100),
        waitMinutes: waitMin,
        color,
      };
    });
  }, [liveMetrics, hourMultiplier]);

  const totalTerminalPax = useMemo(() => {
    return zonesData.reduce((sum, z) => sum + z.currentPax, 0);
  }, [zonesData]);

  const highestHotspot = useMemo(() => {
    return [...zonesData].sort((a, b) => b.densityPct - a.densityPct)[0];
  }, [zonesData]);

  const filteredZones = useMemo(() => {
    if (selectedCategory === "all") return zonesData;
    return zonesData.filter((z) => z.category === selectedCategory);
  }, [zonesData, selectedCategory]);

  const activeZoneDetail = selectedZone
    ? zonesData.find((z) => z.id === selectedZone.id) || selectedZone
    : highestHotspot;

  return (
    <div className="aero-card p-5 sm:p-6 space-y-6 bg-white dark:bg-[#09151e] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm" data-testid="terminal-spatial-heatmap">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
            <span className="overline text-cyan-600 dark:text-cyan-400 font-bold tracking-wider">
              Hub Terminal 3 · Spatial Intelligence
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white flex items-center gap-2">
            Terminal 3 Spatial Density Heatmap
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
              Live 2D Concourse Map
            </span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time optical flow & queue bottleneck detection across all checkpoints, security halls, and reclaim belts.
          </p>
        </div>

        {/* Top KPI counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 shadow-sm">
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">Terminal Load</div>
              <div className="font-mono font-black text-sm text-cyan-700 dark:text-cyan-400">
                {totalTerminalPax.toLocaleString()} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">pax</span>
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 shadow-sm">
            <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">Peak Hotspot</div>
              <div className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                {highestHotspot?.densityPct}% <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">cap</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter & Time Scrubber */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {ZONE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Time Scrubber / Simulation Controller */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause replay" : "Play rush simulation"}
            className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 grid place-items-center transition-colors border border-cyan-500/40"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-cyan-600 dark:fill-cyan-300 text-cyan-600 dark:text-cyan-300" />}
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono font-black text-xs text-slate-900 dark:text-white min-w-[58px]">
              {String(simHour).padStart(2, "0")}:00 IST
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="23"
            value={simHour}
            onChange={(e) => {
              setIsPlaying(false);
              setSimHour(Number(e.target.value));
            }}
            className="w-28 sm:w-36 accent-cyan-500"
          />
        </div>
      </div>

      {/* Main Grid: 2D Spatial SVG + Zone Detail Dossier */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* SVG Blueprint Canvas */}
        <div className="xl:col-span-8 rounded-2xl bg-[#08131C] dark:bg-[#070E14] border border-slate-300 dark:border-slate-800 p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-300 dark:text-slate-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-bold">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Hub Terminal 3 · Main Concourse Blueprint (Level 2 Departures & Level 1 Arrivals)
            </span>
            <span className="text-[11px] text-cyan-300 dark:text-cyan-400">Click any zone for AI balancing actions</span>
          </div>

          <div className="relative w-full aspect-[640/680] max-h-[580px]">
            <svg
              viewBox="0 0 640 680"
              className="w-full h-full select-none"
              style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))" }}
            >
              {/* Background Grid Pattern */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                </pattern>
                <linearGradient id="terminalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F172A" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0B1120" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              <rect x="10" y="10" width="620" height="660" rx="16" fill="url(#grid)" />
              <rect x="20" y="20" width="600" height="640" rx="12" fill="none" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1.5" strokeDasharray="6 4" />

              {/* Terminal Section Guides */}
              <text x="320" y="22" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace" fontWeight="700">
                ▲ LEVEL 2: LANDSIDE FORECOURT DROP-OFF ▲
              </text>
              <text x="320" y="650" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace" fontWeight="700">
                ▼ LEVEL 1: ARRIVALS & RECLAIM CONCOURSE ▼
              </text>

              {/* Render Zones */}
              {zonesData.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const isDimmed = selectedCategory !== "all" && zone.category !== selectedCategory;
                const { x, y, w, h } = zone.coords;

                return (
                  <g
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className="cursor-pointer transition-all duration-200 group"
                    opacity={isDimmed ? 0.25 : 1}
                  >
                    {/* Zone Boundary Box */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="8"
                      fill={zone.color.fill}
                      stroke={isSelected ? "#FFFFFF" : zone.color.stroke}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      style={{
                        transition: "all 0.3s ease",
                        filter: isSelected ? "drop-shadow(0 0 10px rgba(6, 182, 212, 0.8))" : "none"
                      }}
                    />

                    {/* Zone Name Label */}
                    <text
                      x={x + 10}
                      y={y + 20}
                      fill="#FFFFFF"
                      fontSize="10.5"
                      fontFamily="sans-serif"
                      fontWeight="700"
                      className="pointer-events-none"
                    >
                      {zone.name}
                    </text>

                    {/* Live Metric Stats on Zone */}
                    <text
                      x={x + 10}
                      y={y + 36}
                      fill={zone.color.stroke}
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {zone.currentPax.toLocaleString()} pax ({zone.densityPct}%)
                    </text>

                    {/* Wait Time Indicator */}
                    <text
                      x={x + 10}
                      y={y + 50}
                      fill="#CBD5E1"
                      fontSize="8.5"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      ⏱ ~{zone.waitMinutes}m wait
                    </text>

                    {/* Bottleneck Warning Icon for heavy zones */}
                    {zone.densityPct >= 80 && (
                      <circle
                        cx={x + w - 16}
                        cy={y + 16}
                        r="6"
                        fill="#F43F5E"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Color Legend */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 dark:border-slate-800/80 text-[11px] font-mono text-slate-300 dark:text-slate-400 flex-wrap gap-2">
            <span className="font-bold text-white dark:text-slate-300">Density Scale:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-cyan-500/40 border border-cyan-400" />
                <span className="text-cyan-300">Lull (&lt;35%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400" />
                <span className="text-emerald-300">Moderate (35–65%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/50 border border-amber-400" />
                <span className="text-amber-300">Heavy (65–85%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500/60 border border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                <span className="text-rose-300 font-bold">Peak Bottleneck (&gt;85%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Selected Zone Intelligence Dossier */}
        <div className="xl:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Zone Intelligence
                </span>
              </div>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${activeZoneDetail?.color?.badge}`}>
                {activeZoneDetail?.color?.status}
              </span>
            </div>

            <div>
              <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
                {activeZoneDetail?.name}
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                Operational Staffing Key: <span className="text-slate-900 dark:text-slate-200 font-bold">{activeZoneDetail?.staffingKey}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Current Occupancy</div>
                <div className="font-mono font-black text-lg text-slate-900 dark:text-white mt-0.5">
                  {activeZoneDetail?.currentPax?.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {activeZoneDetail?.capacity?.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${activeZoneDetail?.densityPct}%`,
                      backgroundColor: activeZoneDetail?.color?.stroke
                    }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400">Estimated Wait</div>
                <div className="font-mono font-black text-lg text-cyan-700 dark:text-cyan-400 mt-0.5">
                  ~{activeZoneDetail?.waitMinutes} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mins</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono font-medium">
                  Throughput: ~{Math.round(activeZoneDetail?.capacity / 60)} pax/min
                </div>
              </div>
            </div>

            {/* AI Recommendation Card */}
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                AI Counter Balancing Action
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {activeZoneDetail?.recommendedAction}
              </p>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
              <span>Simulation Time:</span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">{String(simHour).padStart(2, "0")}:00 IST</span>
            </div>
          </div>

          {/* Quick Hotspot Ranked List */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3 shadow-sm">
            <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Hotspot Congestion Ranking</span>
              <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              {[...zonesData]
                .sort((a, b) => b.densityPct - a.densityPct)
                .slice(0, 4)
                .map((z, idx) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 transition-all text-left group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 truncate max-w-[150px]">
                        {z.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: z.color.stroke }}>
                        {z.densityPct}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
