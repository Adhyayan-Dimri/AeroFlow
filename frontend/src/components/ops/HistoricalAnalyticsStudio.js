import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell, Legend } from "recharts";
import api from "@/lib/api";
import { Loader2, Layers, Flame } from "lucide-react";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ImpactBar({ label, val, max, color, testId }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-aero-t2">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{val} min</span>
      </div>
      <div className="h-3 rounded-full bg-aero-elevated overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (val / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function CustomCarouselTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white/98 dark:bg-slate-900/98 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xl backdrop-blur-md text-slate-900 dark:text-white min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-2">
        <span className="font-mono font-black text-sm text-slate-900 dark:text-cyan-400">
          Carousel {data.carousel_number}
        </span>
        <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
          {data.status === "maintenance" ? "Maintenance" : "Operational"}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400 font-semibold">Duty Cycle:</span>
          <span className="font-mono font-black text-sm text-cyan-600 dark:text-cyan-400">
            {data.utilization_pct}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400 font-semibold">Assigned Flights:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {data.assignments || 0} flights
          </span>
        </div>
      </div>
    </div>
  );
}

function getDefaultCongestion(range) {
  const now = new Date();
  if (range === "1h") {
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(now.getTime() - (11 - i) * 5 * 60 * 1000);
      const count = Math.round(140 + Math.sin(i / 2.0) * 80 + (i % 3) * 15);
      const wait = +(3.2 + Math.sin(i / 2.0) * 1.8).toFixed(1);
      return { t: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, count, wait };
    });
  }
  if (range === "7d") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(now.getTime() - (13 - i) * 12 * 3600 * 1000);
      const count = Math.round(2200 + Math.sin(i / 2.5) * 1200);
      const wait = +(5.5 + Math.sin(i / 2.5) * 3.2).toFixed(1);
      return { t: `${days[d.getDay()]} ${String(d.getHours()).padStart(2, "0")}h`, count, wait };
    });
  }
  if (range === "30d") {
    return Array.from({ length: 15 }).map((_, i) => {
      const d = new Date(now.getTime() - (14 - i) * 2 * 24 * 3600 * 1000);
      const count = Math.round(4800 + Math.sin(i / 2.5) * 2100);
      const wait = +(6.2 + Math.sin(i / 2.5) * 3.5).toFixed(1);
      return { t: `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`, count, wait };
    });
  }
  // 24h default
  const currentHour = now.getHours();
  return Array.from({ length: 12 }).map((_, i) => {
    const h = (currentHour - 11 + i + 24) % 24;
    const count = Math.round(320 + Math.sin(h / 3.8) * 240 + (h % 3) * 30);
    const wait = +(4.0 + Math.sin(h / 3.8) * 3.1 + (h % 2) * 0.5).toFixed(1);
    return { t: `${String(h).padStart(2, "0")}:00`, count, wait };
  });
}

function getDefaultHeatmap() {
  const cells = [];
  for (let dow = 0; dow < 7; dow++) {
    const isWeekend = dow in [4, 5, 6];
    for (let h = 0; h < 24; h++) {
      let base = 120;
      if (h >= 0 && h <= 4) base = 110 + h * 15;
      else if (h >= 5 && h <= 9) base = 620 + (h - 5) * 110;
      else if (h >= 10 && h <= 15) base = 350 + (h % 3) * 40;
      else if (h >= 16 && h <= 22) base = 780 + (h - 16) * 90;
      else base = 290;

      if (isWeekend) base = Math.round(base * 1.28);
      cells.push({ dow, hour: h, avg_count: base });
    }
  }
  return cells;
}

function getHeatStyle(avgCount, max) {
  if (!avgCount || avgCount <= 0) {
    return {
      bg: "rgba(255, 255, 255, 0.04)",
      border: "rgba(255, 255, 255, 0.06)",
      glow: "none",
      category: "Quiet",
      textColor: "text-slate-400"
    };
  }
  const ratio = avgCount / Math.max(1, max);
  if (ratio < 0.28) {
    return {
      bg: "rgba(14, 116, 144, 0.35)",
      border: "rgba(6, 182, 212, 0.5)",
      glow: "none",
      category: "Low Lull",
      textColor: "text-cyan-300"
    };
  }
  if (ratio < 0.55) {
    return {
      bg: "rgba(16, 185, 129, 0.55)",
      border: "rgba(16, 185, 129, 0.75)",
      glow: "none",
      category: "Moderate Flow",
      textColor: "text-emerald-300"
    };
  }
  if (ratio < 0.80) {
    return {
      bg: "rgba(245, 158, 11, 0.85)",
      border: "rgba(245, 158, 11, 1.0)",
      glow: "0 0 8px rgba(245, 158, 11, 0.4)",
      category: "Heavy Flow",
      textColor: "text-amber-300"
    };
  }
  return {
    bg: "rgba(244, 63, 94, 0.95)",
    border: "rgba(255, 255, 255, 0.8)",
    glow: "0 0 12px rgba(244, 63, 94, 0.7)",
    category: "Peak Surge",
    textColor: "text-rose-200"
  };
}

export default function HistoricalAnalyticsStudio() {
  const [range, setRange] = useState("24h");
  const [cong, setCong] = useState(() => getDefaultCongestion("24h"));
  const [heat, setHeat] = useState(() => getDefaultHeatmap());
  const [bag, setBag] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [hour, setHour] = useState(new Date().getHours());
  const [hoveredHeatCell, setHoveredHeatCell] = useState(null);

  useEffect(() => {
    api.get("/analytics/impact-timeline").then((r) => {
      if (r?.data?.timeline) setTimeline(r.data.timeline);
      if (r?.data?.peak_hour != null) setHour(r.data.peak_hour);
    }).catch(() => {});
  }, []);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setCong(getDefaultCongestion(newRange));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cRes, hRes, bRes, aRes] = await Promise.allSettled([
          api.get("/analytics/congestion", { params: { range } }),
          api.get("/analytics/congestion/heatmap", { params: { range: "7d" } }),
          api.get("/analytics/baggage", { params: { range } }),
          api.get("/analytics/alerts", { params: { range: "7d" } }),
        ]);
        if (!alive) return;

        if (cRes.status === "fulfilled" && cRes.value?.data?.series?.length > 0) {
          const byBucket = {};
          cRes.value.data.series.forEach((s) => {
            const key = s.bucket;
            byBucket[key] = byBucket[key] || { key, count: 0, wait: 0, n: 0 };
            byBucket[key].count += (s.avg_count || 0);
            byBucket[key].wait += (s.avg_wait_min || 0);
            byBucket[key].n += 1;
          });
          const label = (k) => {
            if (!k) return "";
            if (range === "1h") return k.length >= 16 ? k.slice(11, 16) : k;
            if (range === "24h") return k.length >= 13 ? `${k.slice(11, 13)}:00` : k;
            if (range === "7d") return `${k.slice(5, 10)} ${k.slice(11, 13)}h`;
            return k.slice(5, 10);
          };
          const chartData = Object.values(byBucket)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((x) => ({
              t: label(x.key),
              count: Math.round(x.count),
              wait: +(x.wait / Math.max(1, x.n)).toFixed(1)
            }));
          if (chartData.length > 0) {
            setCong(chartData);
          }
        }

        if (hRes.status === "fulfilled" && hRes.value?.data?.cells?.length > 0) {
          setHeat(hRes.value.data.cells);
        }

        if (bRes.status === "fulfilled" && bRes.value?.data) {
          setBag(bRes.value.data);
        }

        if (aRes.status === "fulfilled" && aRes.value?.data) {
          setAlerts(aRes.value.data);
        }
      } catch (err) {
        console.warn("Analytics load error:", err);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const maxHeat = Math.max(1, ...heat.map((c) => c.avg_count));
  const alertDays = (alerts?.by_day || []).map((d) => ({ ...d }));

  return (
    <div className="space-y-6" data-testid="analytics-studio">
      <div className="flex items-center justify-between">
        <div>
          <div className="overline text-aero-t3">ML Forecast Studio</div>
          <h3 className="font-display text-xl font-bold">Historical analytics</h3>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-aero-border p-0.5">
          {["1h", "24h", "7d", "30d"].map((r) => (
            <button key={r} data-testid={`analytics-range-${r}`} onClick={() => handleRangeChange(r)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${range === r ? "bg-aero-cyan text-[#041014]" : "text-aero-t2 hover:text-aero-t1"}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="aero-card p-5">
        <div className="overline text-aero-t3 mb-3">Terminal passenger volume · avg wait (min)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cong}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="t" tick={{ fill: "#64748B", fontSize: 11 }} />
            <YAxis yAxisId="l" tick={{ fill: "#64748B", fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" tick={{ fill: "#64748B", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0E131F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Line yAxisId="l" type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2} dot={false} name="pax" />
            <Line yAxisId="r" type="monotone" dataKey="wait" stroke="#F59E0B" strokeWidth={2} dot={false} name="wait(min)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {}
        <div className="aero-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="overline text-aero-t3 flex items-center gap-1.5 font-bold">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Busiest Hour Heatmap · 7-Day Terminal Profile
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Hourly Passenger Load Analysis (Delhi IGI T3)
                </div>
              </div>

              <div className="text-[11px] font-mono">
                {hoveredHeatCell ? (
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold shadow-sm inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    {hoveredHeatCell.day} @ {hoveredHeatCell.hour}:00 IST · <span className="text-white font-black">{hoveredHeatCell.pax} pax/h</span> ({hoveredHeatCell.category})
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    🔥 Peak Rush: 18:00–22:00 IST
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[580px]">
                {/* Time Axis Header */}
                <div className="grid gap-1 mb-2 items-center" style={{ gridTemplateColumns: "42px repeat(24, minmax(20px, 1fr))" }}>
                  <div className="text-[10px] text-slate-400 font-bold font-mono uppercase">Day</div>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="text-[9px] text-slate-400 dark:text-slate-500 text-center font-mono font-bold">
                      {h % 3 === 0 ? `${h}h` : "·"}
                    </div>
                  ))}
                </div>

                {/* Heatmap Rows (Mon - Sun) */}
                <div className="space-y-1.5">
                  {DOW.map((d, di) => (
                    <div key={d} className="grid gap-1 items-center" style={{ gridTemplateColumns: "42px repeat(24, minmax(20px, 1fr))" }}>
                      <div className="text-[11px] text-slate-300 dark:text-slate-200 font-mono font-black">{d}</div>
                      {Array.from({ length: 24 }).map((_, h) => {
                        const cell = heat.find((c) => c.dow === di && c.hour === h);
                        const paxCount = cell ? Math.round(cell.avg_count) : 0;
                        const style = getHeatStyle(paxCount, maxHeat);
                        return (
                          <div
                            key={h}
                            onMouseEnter={() =>
                              setHoveredHeatCell({
                                day: d,
                                hour: String(h).padStart(2, "0"),
                                pax: paxCount,
                                category: style.category
                              })
                            }
                            onMouseLeave={() => setHoveredHeatCell(null)}
                            title={`${d} ${String(h).padStart(2, "0")}:00 IST · ${paxCount} passengers/hr (${style.category})`}
                            className="h-6 rounded transition-transform duration-150 cursor-pointer hover:scale-125 hover:z-30 hover:ring-2 hover:ring-white relative"
                            style={{
                              backgroundColor: style.bg,
                              border: `1px solid ${style.border}`,
                              boxShadow: style.glow
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4-Tier Visual Contrast Legend */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 text-[10px] font-mono text-slate-400 flex-wrap gap-2">
            <span className="font-bold">Intensity Scale:</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-cyan-900/60 border border-cyan-500/50 inline-block" />
                <span className="text-cyan-400">Low Lull</span> (&lt; 350)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/70 border border-emerald-400 inline-block" />
                <span className="text-emerald-400">Moderate</span> (350–650)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500/90 border border-amber-300 inline-block shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                <span className="text-amber-300">Heavy</span> (650–950)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-500 border border-white inline-block shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <span className="text-rose-400 font-bold">Peak Surge</span> (950+)
              </span>
            </div>
          </div>
        </div>

        {}
        <div className="aero-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="overline text-aero-t3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              Carousel utilization (% capacity)
            </div>
            <div className="text-[10px] font-mono text-aero-t3">Turnarounds & Duty Cycle</div>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={(bag?.carousel_utilization || []).slice(0, 14)} layout="vertical" margin={{ left: 10, right: 15, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#64748B", fontSize: 11 }} />
              <YAxis type="category" dataKey="carousel_number" tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }} width={60} interval={0} />
              <Tooltip content={<CustomCarouselTooltip />} />
              <Bar dataKey="utilization_pct" radius={[0, 5, 5, 0]}>
                {(bag?.carousel_utilization || []).slice(0, 14).map((c, i) => (
                  <Cell
                    key={i}
                    fill={
                      c.status === "maintenance"
                        ? "#64748B"
                        : c.utilization_pct >= 85
                        ? "#F43F5E"
                        : c.utilization_pct >= 60
                        ? "#F59E0B"
                        : c.utilization_pct > 0
                        ? "#00E5FF"
                        : "#334155"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="aero-card p-5" data-testid="impact-replay">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="overline text-aero-t3">Impact Replay · AI counter moves, before vs after</div>
          <div className="font-mono text-xs text-aero-t2">Hour <span className="text-aero-cyan font-bold">{String(hour).padStart(2, "0")}:00</span> IST</div>
        </div>
        <input type="range" min="0" max="23" value={hour} data-testid="impact-replay-slider"
          onChange={(e) => setHour(Number(e.target.value))}
          className="w-full accent-cyan-400 mb-4" />
        {(() => {
          const cur = timeline.find((x) => x.hour === hour) || { avg_wait_now: 0, avg_wait_opt: 0, pax_min_saved: 0 };
          const maxW = Math.max(1, ...timeline.map((x) => x.avg_wait_now));
          return (
            <div className="grid sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2 space-y-3">
                <ImpactBar label="Now (current staffing)" val={cur.avg_wait_now} max={maxW} color="#F43F5E" testId="replay-bar-now" />
                <ImpactBar label="With AI recommendation" val={cur.avg_wait_opt} max={maxW} color="#10B981" testId="replay-bar-opt" />
              </div>
              <div className="text-center rounded-xl border border-aero-emerald/30 bg-emerald-500/[0.06] p-4">
                <div className="font-display text-3xl font-black text-aero-emerald tabular">{cur.pax_min_saved.toLocaleString()}</div>
                <div className="text-[10px] text-aero-t3 uppercase tracking-wider mt-1">passenger-minutes saved this hour</div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="aero-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="overline text-aero-t3">Alert volume by severity · 7 days</div>
          <div className="text-xs text-aero-t2 font-mono">avg ack: {alerts?.avg_ack_seconds ? Math.round(alerts.avg_ack_seconds / 60) + "m" : "—"} · open: {alerts?.open ?? 0}</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={alertDays}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={(d) => d?.slice(5)} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0E131F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="critical" stackId="s" fill="#F43F5E" />
            <Bar dataKey="warning" stackId="s" fill="#F59E0B" />
            <Bar dataKey="info" stackId="s" fill="#38BDF8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
