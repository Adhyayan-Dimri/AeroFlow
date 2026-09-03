import React, { useState, useEffect, useRef } from "react";
import api, { API } from "@/lib/api";
import {
  Video,
  Eye,
  Users,
  UserCheck,
  UserMinus,
  Activity,
  Maximize2,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Radio,
  Sliders,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

export default function CctvFlowMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [activeCam, setActiveCam] = useState("all");
  const [lastTick, setLastTick] = useState(Date.now());
  const [entrySpeed, setEntrySpeed] = useState(0.5); // Default smooth 0.5x slow-motion
  const entryVideoRef = useRef(null);

  useEffect(() => {
    if (entryVideoRef.current) {
      entryVideoRef.current.playbackRate = entrySpeed;
    }
  }, [entrySpeed]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/cctv/stats");
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn("CCTV stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(() => {
      fetchStats();
      setLastTick(Date.now());
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const metrics = data?.metrics || {
    total_entered_today: 54200,
    total_exited_today: 47600,
    net_inside_terminal: 6600,
    instant_entering_flow_hr: 1840,
    instant_exiting_flow_hr: 1420,
    net_flow_delta_hr: 420,
    terminal_capacity_max: 9500,
    terminal_occupancy_pct: 69.5,
    density_status: "Optimal"
  };

  const camEntry = data?.cameras?.cam_entry || {
    id: "CAM-01-ENTRY",
    name: "Gate 01 · Departure Concourse Entry",
    location: "DEL T3 Concourse - Forecourt North",
    status: "LIVE AI ANALYZING",
    fps: 30,
    resolution: "1920x1080",
    latency_ms: 11,
    current_tracked_pax: 6,
    active_boxes: []
  };

  const camExit = data?.cameras?.cam_exit || {
    id: "CAM-04-EXIT",
    name: "Gate 04 · Arrivals Landside Exit",
    location: "DEL T3 Arrivals Concourse - Exit B",
    status: "LIVE AI ANALYZING",
    fps: 24,
    resolution: "3840x2160",
    latency_ms: 14,
    current_tracked_pax: 4,
    active_boxes: []
  };

  const timeline = data?.timeline || [];

  return (
    <div className="space-y-6" data-testid="cctv-flow-monitor">
      {/* Top Header & Vision Status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-aero-cyan flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 text-aero-cyan animate-pulse" />
            Computer Vision Telemetry · Real-Time Passenger Counting
          </div>
          <h2 className="font-display text-2xl font-black text-white flex items-center gap-2.5">
            CCTV AI Passenger Flow Vision
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-aero-cyan/15 text-aero-cyan border border-aero-cyan/30">
              Live Edge ML
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all border ${
              showBoxes
                ? "bg-aero-cyan text-[#041014] border-aero-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                : "bg-aero-card text-aero-t2 border-aero-border hover:border-aero-t2"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Bounding Boxes: {showBoxes ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all border ${
              showVectors
                ? "bg-aero-emerald text-[#041014] border-aero-emerald shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-aero-card text-aero-t2 border-aero-border hover:border-aero-t2"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Flow Vectors: {showVectors ? "ON" : "OFF"}
          </button>

          <button
            onClick={fetchStats}
            className="w-9 h-9 grid place-items-center rounded-lg border border-aero-border hover:border-aero-cyan/40 text-aero-t2 cursor-pointer transition-colors"
            title="Refresh stream metadata"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="aero-card p-5 relative overflow-hidden border-cyan-500/20">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <UserCheck className="w-4 h-4" /> Passengers Entering
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Cam 01
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-white">
            {metrics.total_entered_today.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-bold">+{metrics.instant_entering_flow_hr} pax/hr</span> rate
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-amber-400">
              <UserMinus className="w-4 h-4" /> Passengers Exiting
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Cam 04
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-white">
            {metrics.total_exited_today.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-bold">+{metrics.instant_exiting_flow_hr} pax/hr</span> rate
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-aero-card via-aero-card to-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Users className="w-4 h-4" /> Net Inside Terminal
            </span>
            <span className="text-[10px] uppercase font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Entering − Exiting
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-emerald-400">
            {metrics.net_inside_terminal.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">
              {metrics.terminal_occupancy_pct}% capacity
            </span>
            <span>({metrics.density_status})</span>
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-aero-border">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-aero-t1">
              <Activity className="w-4 h-4 text-aero-cyan" /> Net Flow Delta
            </span>
            <span className="text-[10px] uppercase font-bold text-aero-cyan bg-aero-cyan/10 px-1.5 py-0.5 rounded">
              Throughput
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-white">
            {metrics.net_flow_delta_hr > 0 ? `+${metrics.net_flow_delta_hr}` : metrics.net_flow_delta_hr}
            <span className="text-sm font-normal text-aero-t3 ml-1">pax/h</span>
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1">
            Real-time terminal congestion influx
          </div>
        </div>
      </div>

      {/* Dual Video Stream CCTV Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed 01: Entry Concourse */}
        <div className="aero-card overflow-hidden border border-cyan-500/20 shadow-xl flex flex-col">
          {/* Feed Header */}
          <div className="p-3.5 bg-slate-900/90 border-b border-aero-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <div className="text-xs font-mono font-black text-white flex items-center gap-2">
                  {camEntry.name}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/30">
                    ENTRY GATE
                  </span>
                </div>
                <div className="text-[10px] font-mono text-aero-t3">{camEntry.location}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
              {/* Playback Speed Controller */}
              <div className="flex items-center gap-1 bg-slate-800/90 rounded px-1.5 py-0.5 border border-slate-700/80">
                <span className="text-[9px] text-slate-400 font-mono">Speed:</span>
                {[0.35, 0.5, 0.75, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEntrySpeed(s)}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-colors ${
                      entrySpeed === s
                        ? "bg-cyan-500 text-slate-950 font-black shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div className="text-right">
                <span className="text-aero-t3">In View:</span>{" "}
                <span className="text-cyan-400 font-bold">{camEntry.current_tracked_pax} pax</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-slate-800 text-aero-t2 text-[10px]">
                {camEntry.latency_ms}ms · {camEntry.fps}fps
              </div>
            </div>
          </div>

          {/* Video Container with Real-Time Vision Overlay */}
          <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={entryVideoRef}
              src={`${API}/cctv/feed/entry`}
              autoPlay
              loop
              muted
              playsInline
              onPlay={(e) => { e.target.playbackRate = entrySpeed; }}
              onLoadedMetadata={(e) => { e.target.playbackRate = entrySpeed; }}
              className="w-full h-full object-cover"
            />

            {/* AI HUD Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded w-fit">
                <span>REC ● {camEntry.id} · {camEntry.resolution}</span>
              </div>

              {/* Optical Flow Trigger Line */}
              {showVectors && (
                <div className="absolute top-[68%] left-0 right-0 border-t-2 border-dashed border-cyan-400/60 flex items-center justify-between px-3 text-[10px] font-mono text-cyan-300 bg-cyan-500/5 py-0.5">
                  <span>◀ ENTRY COUNTING BOUNDARY ▶</span>
                  <span className="animate-pulse">● DETECTING INFLOW</span>
                </div>
              )}

              {/* Dynamic Simulated/Pre-calculated Passenger Bounding Boxes */}
              {showBoxes && (
                <div className="absolute inset-0">
                  {(camEntry.active_boxes && camEntry.active_boxes.length > 0
                    ? camEntry.active_boxes
                    : [
                        { x: 18, y: 35, w: 16, h: 42, track_id: "PAX-EN-101", confidence: 0.96 },
                        { x: 42, y: 28, w: 18, h: 48, track_id: "PAX-EN-102", confidence: 0.94 },
                        { x: 68, y: 40, w: 15, h: 38, track_id: "PAX-EN-103", confidence: 0.91 }
                      ]
                  ).map((box, idx) => (
                    <div
                      key={idx}
                      className="absolute border-2 border-cyan-400 rounded-sm bg-cyan-400/10 transition-all duration-200"
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`
                      }}
                    >
                      <span className="absolute -top-5 left-0 bg-cyan-500 text-black text-[9px] font-mono font-bold px-1 rounded-t whitespace-nowrap">
                        {box.track_id} · {Math.round((box.confidence || 0.92) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-cyan-400 font-bold">OPENCV MOG2 + CENTROID TRACKER</span>
                <span>STATUS: {camEntry.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feed 02: Exit Gate */}
        <div className="aero-card overflow-hidden border border-amber-500/20 shadow-xl flex flex-col">
          {/* Feed Header */}
          <div className="p-3.5 bg-slate-900/90 border-b border-aero-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <div>
                <div className="text-xs font-mono font-black text-white flex items-center gap-2">
                  {camExit.name}
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-400 rounded border border-amber-500/30">
                    EXIT GATE
                  </span>
                </div>
                <div className="text-[10px] font-mono text-aero-t3">{camExit.location}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <div className="text-right">
                <span className="text-aero-t3">In View:</span>{" "}
                <span className="text-amber-400 font-bold">{camExit.current_tracked_pax} pax</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-slate-800 text-aero-t2 text-[10px]">
                {camExit.latency_ms}ms · {camExit.fps}fps
              </div>
            </div>
          </div>

          {/* Video Container with Real-Time Vision Overlay */}
          <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
            <video
              src={`${API}/cctv/feed/exit`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* AI HUD Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded w-fit">
                <span>REC ● {camExit.id} · {camExit.resolution}</span>
              </div>

              {/* Optical Flow Trigger Line */}
              {showVectors && (
                <div className="absolute top-[60%] left-0 right-0 border-t-2 border-dashed border-amber-400/60 flex items-center justify-between px-3 text-[10px] font-mono text-amber-300 bg-amber-500/5 py-0.5">
                  <span>◀ EXIT COUNTING BOUNDARY ▶</span>
                  <span className="animate-pulse">● DETECTING OUTFLOW</span>
                </div>
              )}

              {/* Dynamic Simulated/Pre-calculated Passenger Bounding Boxes */}
              {showBoxes && (
                <div className="absolute inset-0">
                  {(camExit.active_boxes && camExit.active_boxes.length > 0
                    ? camExit.active_boxes
                    : [
                        { x: 25, y: 30, w: 18, h: 44, track_id: "PAX-EX-201", confidence: 0.95 },
                        { x: 55, y: 38, w: 16, h: 40, track_id: "PAX-EX-202", confidence: 0.93 }
                      ]
                  ).map((box, idx) => (
                    <div
                      key={idx}
                      className="absolute border-2 border-amber-400 rounded-sm bg-amber-400/10 transition-all duration-200"
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`
                      }}
                    >
                      <span className="absolute -top-5 left-0 bg-amber-500 text-black text-[9px] font-mono font-bold px-1 rounded-t whitespace-nowrap">
                        {box.track_id} · {Math.round((box.confidence || 0.91) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-amber-400 font-bold">OPENCV MOG2 + CENTROID TRACKER</span>
                <span>STATUS: {camExit.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Flow Timeline Chart */}
      <div className="aero-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="overline text-aero-t3">Real-Time Inflow vs Outflow Dynamics</div>
            <h3 className="font-display text-lg font-bold text-white">
              Hourly Passenger Velocity & Net Airport Occupancy
            </h3>
          </div>
          <div className="text-xs font-mono text-aero-t2 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" /> Entering Flow (pax/h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Exiting Flow (pax/h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Terminal Occupancy
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cctvEnterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="cctvExitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: "#64748B", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0E131F",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8
              }}
            />
            <Area
              type="monotone"
              dataKey="entering"
              name="Entering Rate"
              stroke="#00E5FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#cctvEnterGrad)"
            />
            <Area
              type="monotone"
              dataKey="exiting"
              name="Exiting Rate"
              stroke="#F59E0B"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#cctvExitGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
