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

export default function HistoricalAnalyticsStudio() {
  const [range, setRange] = useState("24h");
  const [cong, setCong] = useState([]);
  const [heat, setHeat] = useState([]);
  const [bag, setBag] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [hour, setHour] = useState(new Date().getHours());
  const [hoveredHeatCell, setHoveredHeatCell] = useState(null);

  useEffect(() => {
    api.get("/analytics/impact-timeline").then((r) => {
      setTimeline(r.data.timeline);
      if (r.data.peak_hour != null) setHour(r.data.peak_hour);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [c, h, b, a] = await Promise.all([
        api.get("/analytics/congestion", { params: { range } }),
        api.get("/analytics/congestion/heatmap", { params: { range: "7d" } }),
        api.get("/analytics/baggage", { params: { range } }),
        api.get("/analytics/alerts", { params: { range: "7d" } }),
      ]);
      if (!alive) return;
      const byBucket = {};
      c.data.series.forEach((s) => {
        const key = s.bucket;
        byBucket[key] = byBucket[key] || { key, count: 0, wait: 0, n: 0 };
        byBucket[key].count += s.avg_count;
        byBucket[key].wait += s.avg_wait_min;
        byBucket[key].n += 1;
      });
      const label = (k) => (range === "1h" || range === "24h") ? k.slice(11, 16) : `${k.slice(5, 10)} ${k.slice(11, 13)}h`;
      setCong(Object.values(byBucket).sort((a, b) => a.key.localeCompare(b.key))
        .map((x) => ({ t: label(x.key), count: Math.round(x.count), wait: +(x.wait / x.n).toFixed(1) })));
      setHeat(h.data.cells);
      setBag(b.data);
      setAlerts(a.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [range]);

  if (loading) return <div className="grid place-items-center py-24 text-aero-t2"><Loader2 className="w-6 h-6 animate-spin text-aero-cyan" /></div>;

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
            <button key={r} data-testid={`analytics-range-${r}`} onClick={() => setRange(r)}
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
            <div className="flex items-center justify-between mb-3">
              <div className="overline text-aero-t3 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Busiest hour heatmap · 7 days
              </div>
              <div className="text-[11px] font-mono text-aero-t3">
                {hoveredHeatCell ? (
                  <span className="text-cyan-600 dark:text-cyan-300 font-bold">
                    {hoveredHeatCell.day} {hoveredHeatCell.hour}:00 · ~{hoveredHeatCell.pax} pax/hr
                  </span>
                ) : (
                  "Hover hour for pax volume"
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[560px]">
                {}
                <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: "38px repeat(24, minmax(20px, 1fr))" }}>
                  <div className="text-[10px] text-aero-t3 font-bold">Day</div>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="text-[10px] text-slate-500 dark:text-aero-t3 text-center font-mono font-bold">
                      {h % 3 === 0 ? String(h).padStart(2, "0") : "·"}
                    </div>
                  ))}
                </div>

                {}
                <div className="space-y-1.5">
                  {DOW.map((d, di) => (
                    <div key={d} className="grid gap-1 items-center" style={{ gridTemplateColumns: "38px repeat(24, minmax(20px, 1fr))" }}>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono font-bold">{d}</div>
                      {Array.from({ length: 24 }).map((_, h) => {
                        const cell = heat.find((c) => c.dow === di && c.hour === h);
                        const v = cell ? cell.avg_count / maxHeat : 0;
                        const paxCount = cell ? Math.round(cell.avg_count) : 0;
                        return (
                          <div
                            key={h}
                            onMouseEnter={() => setHoveredHeatCell({ day: d, hour: String(h).padStart(2, "0"), pax: paxCount })}
                            onMouseLeave={() => setHoveredHeatCell(null)}
                            title={`${d} ${h}:00 IST · ${paxCount} passengers`}
                            className="h-6 rounded-md transition-all duration-150 cursor-pointer hover:scale-110 hover:ring-2 hover:ring-cyan-400 z-10"
                            style={{
                              background: v > 0
                                ? `rgba(0, 229, 255, ${Math.max(0.15, v * 0.95)})`
                                : "rgba(255, 255, 255, 0.05)",
                              boxShadow: v > 0.6 ? `0 0 10px rgba(0, 229, 255, ${v * 0.4})` : "none"
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

          {}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 text-[10px] font-mono text-aero-t3">
            <span>Low Terminal Volume</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-cyan-500/15 inline-block" />
              <span className="w-3.5 h-3.5 rounded bg-cyan-500/40 inline-block" />
              <span className="w-3.5 h-3.5 rounded bg-cyan-500/70 inline-block" />
              <span className="w-3.5 h-3.5 rounded bg-cyan-400 inline-block shadow-[0_0_6px_rgba(0,229,255,0.6)]" />
            </div>
            <span>Peak Congestion ({Math.round(maxHeat)} pax/h)</span>
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
