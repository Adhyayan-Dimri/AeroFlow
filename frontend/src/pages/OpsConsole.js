import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Users2, Luggage, Bell, BarChart3, Layers, RefreshCw, TrendingUp, Plane, Video } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import TerminalCongestionMap from "@/components/ops/TerminalCongestionMap";
import CarouselAllocationBoard from "@/components/ops/CarouselAllocationBoard";
import AlertsFeedCenter from "@/components/ops/AlertsFeedCenter";
import HistoricalAnalyticsStudio from "@/components/ops/HistoricalAnalyticsStudio";
import CarouselMasterManager from "@/components/ops/CarouselMasterManager";
import FlightScheduleDelayManager from "@/components/ops/FlightScheduleDelayManager";
import CctvFlowMonitor from "@/components/ops/CctvFlowMonitor";

const HERO = "https://images.unsplash.com/photo-1522798120812-304f8819f4be?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHw0fHxyYWRhciUyMHNjcmVlbiUyMGFpciUyMHRyYWZmaWN8ZW58MHx8fHwxNzg3ODA2MzI2fDA&ixlib=rb-4.1.0&q=85";

const TABS = [
  { id: "congestion", label: "Congestion", icon: Users2 },
  { id: "cctv", label: "CCTV AI Flow", icon: Video },
  { id: "flights", label: "Flight Delays", icon: Plane },
  { id: "baggage", label: "Baggage", icon: Luggage },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "carousels", label: "Carousels", icon: Layers },
];

export default function OpsConsole() {
  const { user, isStaff } = useAuth();
  const canEdit = isStaff;
  const [tab, setTab] = useState("congestion");
  const [zones, setZones] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [carousels, setCarousels] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState("open");
  const [tick, setTick] = useState(0);

  const loadZones = useCallback(async () => { const { data } = await api.get("/congestion/zones"); setZones(data.zones); }, []);
  const loadBaggage = useCallback(async () => {
    const [a, c] = await Promise.all([api.get("/baggage/assignments"), api.get("/admin/carousels")]);
    setAssignments(a.data.assignments); setCarousels(c.data.carousels);
  }, []);
  const loadAlerts = useCallback(async () => {
    const params = alertFilter === "all" ? {} : alertFilter === "critical" ? { severity: "critical" } : { status: "open" };
    const { data } = await api.get("/alerts", { params });
    setAlerts(data.alerts);
  }, [alertFilter]);

  useEffect(() => { loadZones(); }, [loadZones, tick]);
  useEffect(() => { if (tab === "baggage" || tab === "carousels") loadBaggage(); }, [tab, loadBaggage, tick]);
  useEffect(() => { loadAlerts(); }, [loadAlerts, tick]);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 15000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    const rawBackend = process.env.REACT_APP_BACKEND_URL || "https://aeroflow-j4ga.onrender.com";
    const url = rawBackend.replace(/^http/, "ws") + "/api/ws/live";
    let ws;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (e) => { try { if (JSON.parse(e.data).type === "tick") setTick((t) => t + 1); } catch { } };
    } catch { }
    return () => { try { ws && ws.close(); } catch { } };
  }, []);

  const [impact, setImpact] = useState(null);
  useEffect(() => { if (tab === "congestion") api.get("/analytics/impact").then((r) => setImpact(r.data)).catch(() => { }); }, [tab, tick]);

  const openAlerts = alerts.filter((a) => a.status === "open").length;
  const heavyZones = zones.filter((z) => z.crowd_level === "heavy").length;

  const isGroundStaff = user?.role === "ground_staff";
  const canDeployStaff = user?.role === "admin" || user?.role === "ops_manager";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] aero-grain">
      <div className="absolute inset-0 aero-grid opacity-[0.12] pointer-events-none" />
      {}
      <div className="relative border-b border-aero-border overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="overline text-aero-cyan">
                {isGroundStaff ? "Ground Operations Crew · DEL T3 · On Duty" : `Ops Commander · DEL T3 · ${user?.role?.replace("_", " ")}`}
              </div>
              <h1 className="font-display text-3xl font-black">
                {isGroundStaff ? "Ground Operations Center" : "Operations Console"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Stat label="Heavy zones" value={heavyZones} color={heavyZones ? "text-aero-rose" : "text-aero-emerald"} />
              <Stat label="Open alerts" value={openAlerts} color={openAlerts ? "text-aero-amber" : "text-aero-emerald"} />
              <button data-testid="ops-refresh" onClick={() => setTick((t) => t + 1)} className="w-10 h-10 grid place-items-center rounded-lg border border-aero-border hover:border-aero-cyan/40 text-aero-t2 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
          {}
          <div className="flex items-center gap-1 mt-5 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} data-testid={`ops-tab-${t.id}`} onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${active ? "text-aero-cyan" : "text-aero-t2 hover:text-aero-t1"}`}>
                  <Icon className="w-4 h-4" />{t.label}
                  {t.id === "alerts" && openAlerts > 0 && <span className="w-5 h-5 grid place-items-center rounded-full bg-aero-rose text-white text-[10px] font-bold">{openAlerts}</span>}
                  {active && <motion.div layoutId="ops-tab-pill" className="absolute inset-0 rounded-lg border border-aero-cyan/40 bg-aero-cyan/[0.08] -z-10" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {tab === "congestion" && <><ImpactBanner impact={impact} /><TerminalCongestionMap zones={zones} onChanged={loadZones} canEdit={canDeployStaff} /></>}
          {tab === "cctv" && <CctvFlowMonitor />}
          {tab === "flights" && <FlightScheduleDelayManager onFlightDelayed={() => { loadZones(); loadBaggage(); loadAlerts(); }} canEdit={canEdit} />}
          {tab === "baggage" && <CarouselAllocationBoard assignments={assignments} carousels={carousels} canEdit={canEdit} onChanged={loadBaggage} />}
          {tab === "alerts" && <AlertsFeedCenter alerts={alerts} filter={alertFilter} setFilter={setAlertFilter} onChanged={loadAlerts} canAct={canEdit} />}
          {tab === "analytics" && <HistoricalAnalyticsStudio />}
          {tab === "carousels" && <CarouselMasterManager carousels={carousels} onChanged={loadBaggage} canEdit={user?.role === "admin" || user?.role === "baggage_ops"} />}
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="glass rounded-lg px-4 py-2 text-center">
      <div className={`font-display text-2xl font-black tabular ${color}`}>{value}</div>
      <div className="text-[9px] text-aero-t3 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ImpactBanner({ impact }) {
  if (!impact) return null;

  if (impact.total_pax_minutes_saved <= 0) {
    return (
      <div className="aero-card p-4 mb-4 relative overflow-hidden" data-testid="impact-banner">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-aero-emerald/10 blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-xl bg-aero-emerald/10 border border-aero-emerald/30 grid place-items-center">
            <TrendingUp className="w-5 h-5 text-aero-emerald" />
          </div>
          <div>
            <div className="overline text-aero-t3">AI Staffing Impact · right now</div>
            <div className="font-display text-lg font-bold text-aero-emerald">Operating at optimal efficiency</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aero-card p-4 mb-4 relative overflow-hidden" data-testid="impact-banner">
      <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-aero-emerald/10 blur-3xl" />
      <div className="flex items-center justify-between flex-wrap gap-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-aero-emerald/10 border border-aero-emerald/30 grid place-items-center">
            <TrendingUp className="w-5 h-5 text-aero-emerald" />
          </div>
          <div>
            <div className="overline text-aero-t3">AI Staffing Impact · right now</div>
            <div className="font-display text-lg font-bold">Currently AI recommendation saves <span className="text-aero-emerald">{impact.total_pax_minutes_saved.toLocaleString()}</span> minutes for passengers</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="zones understaffed" value={impact.zones_understaffed} color={impact.zones_understaffed ? "text-aero-amber" : "text-aero-emerald"} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4 relative">
        {impact.rows.filter((r) => r.minutes_saved_per_pax > 0).slice(0, 6).map((r) => (
          <div key={r.zone_id} className="rounded-lg border border-aero-border bg-aero-elevated/40 px-3 py-2 flex items-center justify-between" data-testid={`impact-row-${r.zone_id}`}>
            <div className="text-xs text-aero-t2 truncate">{r.name.split("·")[0]}</div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-aero-rose">{r.wait_now_min}m</span>
              <span className="text-aero-t3">→</span>
              <span className="text-aero-emerald">{r.wait_optimized_min}m</span>
            </div>
          </div>
        ))}
        {impact.rows.every((r) => r.minutes_saved_per_pax <= 0) && (
          <div className="text-sm text-aero-t2 col-span-full">All zones are optimally staffed for current demand. ✓</div>
        )}
      </div>
    </div>
  );
}
