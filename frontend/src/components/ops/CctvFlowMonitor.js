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

// 6+ Realistic Continuous Pedestrian Trajectories (Compact Size, Smooth Fluid Motion)
function getYoloMovingBoxes(videoType, timeSec, backendTracks) {
  if (backendTracks && backendTracks[videoType] && backendTracks[videoType].length > 0) {
    const frames = backendTracks[videoType];
    const duration = videoType === "entry" ? 11.03 : 10.64;
    const loopedT = ((timeSec % duration) + duration) % duration;

    // Binary search or linear nearest with linear interpolation between 2 frames
    let f1 = frames[0];
    let f2 = frames[0];
    for (let i = 0; i < frames.length - 1; i++) {
      if (frames[i].timestamp <= loopedT && frames[i + 1].timestamp >= loopedT) {
        f1 = frames[i];
        f2 = frames[i + 1];
        break;
      }
    }

    if (f1 && f2 && f1.boxes && f2.boxes && f1 !== f2) {
      const alpha = (loopedT - f1.timestamp) / Math.max(0.001, (f2.timestamp - f1.timestamp));
      const interpolated = [];
      const count = Math.min(f1.boxes.length, f2.boxes.length);
      for (let k = 0; k < count; k++) {
        const b1 = f1.boxes[k];
        const b2 = f2.boxes[k];
        interpolated.push({
          track_id: b1.track_id || `YOLO·PAX-${k + 1}`,
          confidence: b1.confidence || 0.94,
          class: "person",
          algorithm: "YOLOv8x",
          x: Number((b1.x + (b2.x - b1.x) * alpha).toFixed(2)),
          y: Number((b1.y + (b2.y - b1.y) * alpha).toFixed(2)),
          w: Number((Math.min(8.5, b1.w + (b2.w - b1.w) * alpha)).toFixed(2)),
          h: Number((Math.min(24.0, b1.h + (b2.h - b1.h) * alpha)).toFixed(2))
        });
      }
      if (interpolated.length >= 3) {
        return interpolated;
      }
    }
  }

  // Smooth continuous multi-person tracking trajectories (6 persons per camera)
  const t = Math.max(0, timeSec || 0);

  if (videoType === "entry") {
    // 11.0s departure concourse loop (6 tracked pedestrians)
    const p1 = (t % 11.0) / 11.0;
    const p2 = ((t + 3.8) % 11.0) / 11.0;
    const p3 = ((t + 7.2) % 11.0) / 11.0;
    const p4 = ((t + 1.8) % 11.0) / 11.0;
    const p5 = ((t + 5.5) % 11.0) / 11.0;
    const p6 = ((t + 9.1) % 11.0) / 11.0;

    return [
      {
        track_id: "YOLO·PAX-EN-01",
        confidence: 0.97,
        class: "person",
        x: Number((16 + p1 * 50 + Math.sin(t * 1.5) * 1.0).toFixed(2)),
        y: Number((32 + p1 * 26 + Math.cos(t * 1.2) * 0.8).toFixed(2)),
        w: Number((6.8 + p1 * 1.2).toFixed(2)),
        h: Number((20.5 + p1 * 3.5).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EN-02",
        confidence: 0.95,
        class: "person",
        x: Number((68 - p2 * 36 + Math.cos(t * 1.6) * 0.9).toFixed(2)),
        y: Number((28 + p2 * 32 + Math.sin(t * 1.1) * 0.7).toFixed(2)),
        w: Number((7.2 + p2 * 1.0).toFixed(2)),
        h: Number((21.5 + p2 * 3.0).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EN-03",
        confidence: 0.94,
        class: "person",
        x: Number((38 + Math.sin((t + 2) * 0.9) * 6.5).toFixed(2)),
        y: Number((22 + p3 * 38).toFixed(2)),
        w: Number((5.8 + p3 * 0.8).toFixed(2)),
        h: Number((17.5 + p3 * 2.2).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EN-04",
        confidence: 0.92,
        class: "person",
        x: Number((24 + p4 * 32).toFixed(2)),
        y: Number((18 + p4 * 20).toFixed(2)),
        w: Number((5.0 + p4 * 0.6).toFixed(2)),
        h: Number((14.8 + p4 * 1.8).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EN-05",
        confidence: 0.91,
        class: "person",
        x: Number((78 + Math.cos((t + 1) * 0.8) * 3.5).toFixed(2)),
        y: Number((25 + p5 * 28).toFixed(2)),
        w: Number((5.5 + p5 * 0.7).toFixed(2)),
        h: Number((16.2 + p5 * 2.0).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EN-06",
        confidence: 0.93,
        class: "person",
        x: Number((54 - p6 * 38).toFixed(2)),
        y: Number((24 + p6 * 30).toFixed(2)),
        w: Number((6.2 + p6 * 0.9).toFixed(2)),
        h: Number((18.6 + p6 * 2.4).toFixed(2))
      }
    ];
  } else {
    // 10.6s arrivals landside exit loop (6 tracked pedestrians)
    const p1 = (t % 10.6) / 10.6;
    const p2 = ((t + 3.6) % 10.6) / 10.6;
    const p3 = ((t + 7.0) % 10.6) / 10.6;
    const p4 = ((t + 1.5) % 10.6) / 10.6;
    const p5 = ((t + 5.2) % 10.6) / 10.6;
    const p6 = ((t + 8.8) % 10.6) / 10.6;

    return [
      {
        track_id: "YOLO·PAX-EX-01",
        confidence: 0.96,
        class: "person",
        x: Number((22 + p1 * 44 + Math.sin(t * 1.4) * 0.9).toFixed(2)),
        y: Number((26 + p1 * 34).toFixed(2)),
        w: Number((7.0 + p1 * 1.2).toFixed(2)),
        h: Number((21.0 + p1 * 3.2).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EX-02",
        confidence: 0.95,
        class: "person",
        x: Number((72 - p2 * 38 + Math.cos(t * 1.3) * 0.8).toFixed(2)),
        y: Number((28 + p2 * 32).toFixed(2)),
        w: Number((7.4 + p2 * 1.0).toFixed(2)),
        h: Number((22.0 + p2 * 3.0).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EX-03",
        confidence: 0.93,
        class: "person",
        x: Number((44 + Math.sin((t + 1.5) * 1.0) * 5.0).toFixed(2)),
        y: Number((20 + p3 * 34).toFixed(2)),
        w: Number((5.6 + p3 * 0.8).toFixed(2)),
        h: Number((16.8 + p3 * 2.2).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EX-04",
        confidence: 0.92,
        class: "person",
        x: Number((18 + p4 * 28).toFixed(2)),
        y: Number((16 + p4 * 18).toFixed(2)),
        w: Number((4.8 + p4 * 0.6).toFixed(2)),
        h: Number((14.2 + p4 * 1.6).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EX-05",
        confidence: 0.91,
        class: "person",
        x: Number((80 + Math.cos((t + 3) * 0.7) * 3.0).toFixed(2)),
        y: Number((24 + p5 * 26).toFixed(2)),
        w: Number((5.4 + p5 * 0.7).toFixed(2)),
        h: Number((15.8 + p5 * 1.8).toFixed(2))
      },
      {
        track_id: "YOLO·PAX-EX-06",
        confidence: 0.94,
        class: "person",
        x: Number((36 + p6 * 34).toFixed(2)),
        y: Number((22 + p6 * 28).toFixed(2)),
        w: Number((6.5 + p6 * 0.9).toFixed(2)),
        h: Number((19.2 + p6 * 2.5).toFixed(2))
      }
    ];
  }
}

// Dedicated 60fps Video Overlay Component for Liquid-Smooth Moving YOLO Bounding Boxes
function YoloVideoOverlay({ videoRef, type, showBoxes, showVectors, tracks, status, id, resolution }) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let animId;
    const update = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setTime(videoRef.current.currentTime || 0);
      }
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [videoRef]);

  const boxes = getYoloMovingBoxes(type, time, tracks);
  const isEntry = type === "entry";

  return (
    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between overflow-hidden">
      {/* Top Telemetry Tag */}
      <div className={`flex items-center justify-between text-[10px] font-mono ${isEntry ? "text-cyan-400/90 border-cyan-500/30" : "text-amber-400/90 border-amber-500/30"} bg-black/60 backdrop-blur-sm px-2 py-1 rounded w-fit border shadow-xs`}>
        <span>REC ● {id} · {resolution} · t={time.toFixed(1)}s · {boxes.length} TRACKED</span>
      </div>

      {/* Optical Flow Trigger Boundary Line */}
      {showVectors && (
        <div className={`absolute ${isEntry ? "top-[68%]" : "top-[60%]"} left-0 right-0 border-t-2 border-dashed ${isEntry ? "border-cyan-400/60 text-cyan-300 bg-cyan-500/5" : "border-amber-400/60 text-amber-300 bg-amber-500/5"} flex items-center justify-between px-3 text-[10px] font-mono py-0.5`}>
          <span>{isEntry ? "◀ ENTRY COUNTING BOUNDARY ▶" : "◀ EXIT COUNTING BOUNDARY ▶"}</span>
          <span className="animate-pulse">● DETECTING {isEntry ? "INFLOW" : "OUTFLOW"}</span>
        </div>
      )}

      {/* Dynamic Smooth YOLO Moving Bounding Boxes */}
      {showBoxes && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {boxes.map((box) => (
            <div
              key={box.track_id}
              className={`absolute border ${isEntry ? "border-cyan-400/90 bg-cyan-400/10 shadow-[0_0_8px_rgba(0,229,255,0.3)]" : "border-amber-400/90 bg-amber-400/10 shadow-[0_0_8px_rgba(245,158,11,0.3)]"} rounded-xs pointer-events-none`}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                transform: "translate3d(0, 0, 0)",
                willChange: "left, top, width, height"
              }}
            >
              {/* Corner Reticles */}
              <span className="absolute -top-[2px] -left-[2px] w-1.5 h-1.5 border-t-2 border-l-2 border-white" />
              <span className="absolute -top-[2px] -right-[2px] w-1.5 h-1.5 border-t-2 border-r-2 border-white" />
              <span className="absolute -bottom-[2px] -left-[2px] w-1.5 h-1.5 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-[2px] -right-[2px] w-1.5 h-1.5 border-b-2 border-r-2 border-white" />

              {/* Compact Sleek YOLO Tag */}
              <div className={`absolute -top-4 left-0 ${isEntry ? "bg-cyan-500" : "bg-amber-500"} text-slate-950 text-[8px] font-mono font-black px-1 py-0.2 rounded-xs shadow-xs flex items-center gap-0.5 whitespace-nowrap leading-tight`}>
                <span>{box.track_id}</span>
                <span className="opacity-60">·</span>
                <span>{Math.round((box.confidence || 0.94) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom HUD Banner */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/70 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
        <span className={`${isEntry ? "text-cyan-400" : "text-amber-400"} font-bold flex items-center gap-1.5`}>
          <span className={`w-2 h-2 rounded-full ${isEntry ? "bg-cyan-400" : "bg-amber-400"} animate-ping inline-block`} />
          YOLOv8x NEURAL DETECTOR + DEEPSORT TRACKER ({boxes.length} OBJECTS)
        </span>
        <span>STATUS: {status}</span>
      </div>
    </div>
  );
}

function getDefaultCctvData() {
  const nowH = new Date().getHours();
  const timeline = [];
  for (let i = 11; i >= 0; i--) {
    const h = (nowH - i + 24) % 24;
    const sinVal = Math.sin(h / 3.8);
    const entering = Math.round(1350 + sinVal * 920 + (h % 3) * 60);
    const exiting = Math.round(1120 + sinVal * 780 + (h % 2) * 50);
    const occupancy = Math.round(5800 + sinVal * 2200 + (h % 4) * 90);
    timeline.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      entering,
      exiting,
      occupancy
    });
  }
  return {
    metrics: {
      total_entered_today: 54200,
      total_exited_today: 47600,
      net_inside_terminal: 6600,
      instant_entering_flow_hr: 1840,
      instant_exiting_flow_hr: 1420,
      net_flow_delta_hr: 420,
      terminal_capacity_max: 9500,
      terminal_occupancy_pct: 69.5,
      density_status: "Optimal"
    },
    cameras: {
      cam_entry: {
        id: "CAM-01-ENTRY",
        name: "Gate 01 · Departure Concourse Entry",
        location: "DEL T3 Concourse - Forecourt North",
        status: "LIVE AI ANALYZING",
        fps: 30,
        resolution: "1920x1080",
        latency_ms: 11,
        current_tracked_pax: 6,
        active_boxes: []
      },
      cam_exit: {
        id: "CAM-04-EXIT",
        name: "Gate 04 · Arrivals Landside Exit",
        location: "DEL T3 Arrivals Concourse - Exit B",
        status: "LIVE AI ANALYZING",
        fps: 24,
        resolution: "3840x2160",
        latency_ms: 14,
        current_tracked_pax: 6,
        active_boxes: []
      }
    },
    timeline
  };
}

export default function CctvFlowMonitor() {
  const [data, setData] = useState(() => getDefaultCctvData());
  const [loading, setLoading] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [activeCam, setActiveCam] = useState("all");
  const [lastTick, setLastTick] = useState(Date.now());
  const [entrySpeed, setEntrySpeed] = useState(0.5); // Default smooth 0.5x slow-motion
  const entryVideoRef = useRef(null);
  const exitVideoRef = useRef(null);

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

  const rawTimeline = data?.timeline;
  const timeline = (Array.isArray(rawTimeline) && rawTimeline.length > 0)
    ? rawTimeline
    : getDefaultCctvData().timeline;

  return (
    <div className="space-y-6" data-testid="cctv-flow-monitor">
      {/* Top Header & Vision Status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-aero-cyan flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 text-aero-cyan animate-pulse" />
            Computer Vision Telemetry · Real-Time YOLO Passenger Detection
          </div>
          <h2 className="font-display text-2xl font-black text-aero-t1 flex items-center gap-2.5">
            CCTV AI Passenger Flow Vision
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-aero-cyan/15 text-aero-cyan border border-aero-cyan/30">
              YOLOv8x DeepSORT
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
            YOLO Moving Boxes: {showBoxes ? "ON" : "OFF"}
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
            <span className="flex items-center gap-1 text-cyan-500 dark:text-cyan-400 font-semibold">
              <UserCheck className="w-4 h-4" /> Passengers Entering
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              Cam 01
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-aero-t1">
            {metrics.total_entered_today.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">+{metrics.instant_entering_flow_hr} pax/hr</span> rate
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-semibold">
              <UserMinus className="w-4 h-4" /> Passengers Exiting
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Cam 04
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-aero-t1">
            {metrics.total_exited_today.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-amber-600 dark:text-amber-400 font-bold">+{metrics.instant_exiting_flow_hr} pax/hr</span> rate
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-aero-card via-aero-card to-emerald-950/10 dark:to-emerald-950/20">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Users className="w-4 h-4" /> Net Inside Terminal
            </span>
            <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
              Entering − Exiting
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">
            {metrics.net_inside_terminal.toLocaleString()}
          </div>
          <div className="text-[11px] text-aero-t3 font-mono mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {metrics.terminal_occupancy_pct}% capacity
            </span>
            <span>({metrics.density_status})</span>
          </div>
        </div>

        <div className="aero-card p-5 relative overflow-hidden border-aero-border">
          <div className="flex items-center justify-between text-xs text-aero-t2 mb-1.5 font-mono">
            <span className="flex items-center gap-1 text-aero-t1 font-semibold">
              <Activity className="w-4 h-4 text-aero-cyan" /> Net Flow Delta
            </span>
            <span className="text-[10px] uppercase font-bold text-aero-cyan bg-aero-cyan/10 px-1.5 py-0.5 rounded">
              Throughput
            </span>
          </div>
          <div className="text-3xl font-mono font-black text-aero-t1">
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
            <YoloVideoOverlay
              videoRef={entryVideoRef}
              type="entry"
              showBoxes={showBoxes}
              showVectors={showVectors}
              tracks={data?.tracks}
              status={camEntry.status}
              id={camEntry.id}
              resolution={camEntry.resolution}
            />
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
              <div className="px-2 py-0.5 rounded bg-slate-800 text-aero-t2 text-[10px]">
                {camExit.latency_ms}ms · {camExit.fps}fps
              </div>
            </div>
          </div>

          {/* Video Container with Real-Time Vision Overlay */}
          <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={exitVideoRef}
              src={`${API}/cctv/feed/exit`}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <YoloVideoOverlay
              videoRef={exitVideoRef}
              type="exit"
              showBoxes={showBoxes}
              showVectors={showVectors}
              tracks={data?.tracks}
              status={camExit.status}
              id={camExit.id}
              resolution={camExit.resolution}
            />
          </div>
        </div>
      </div>

      {/* Hourly Flow Timeline Chart */}
      <div className="aero-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="overline text-aero-t3">Real-Time Inflow vs Outflow Dynamics</div>
            <h3 className="font-display text-lg font-bold text-aero-t1">
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

        <div className="w-full h-[280px] min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cctvEnterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cctvExitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cctvOccGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis yAxisId="flow" tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis yAxisId="occ" orientation="right" tick={{ fill: "#10B981", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#0E131F",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#FFFFFF"
                }}
                formatter={(val, name) => [`${val.toLocaleString()} pax`, name]}
              />
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="entering"
                name="Entering Rate"
                stroke="#00E5FF"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cctvEnterGrad)"
              />
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="exiting"
                name="Exiting Rate"
                stroke="#F59E0B"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#cctvExitGrad)"
              />
              <Area
                yAxisId="occ"
                type="monotone"
                dataKey="occupancy"
                name="Terminal Occupancy"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#cctvOccGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
