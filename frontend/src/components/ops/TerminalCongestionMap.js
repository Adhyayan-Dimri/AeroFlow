import React, { useState, useEffect } from "react";
import { Sliders, TrendingUp, Users, ArrowUp, ArrowDown, Check } from "lucide-react";
import { CrowdBadge } from "@/components/Badges";
import { toast } from "sonner";
import api from "@/lib/api";

const ICONMAP = { checkin: "Check-in", security: "Security", immigration: "Immigration", gate: "Gate" };

export default function TerminalCongestionMap({ zones, onChanged, canEdit }) {
  const heavyRushZones = zones.filter(z => z.crowd_level === "heavy");

  return (
    <div className="space-y-4" data-testid="terminal-congestion-map">
      {heavyRushZones.length > 0 && (
        <div className="bg-rose-500/[0.08] dark:bg-rose-950/25 border-2 border-rose-500 dark:border-rose-500/80 rounded-2xl p-4 flex items-start gap-3.5 mb-3 shadow-md shadow-rose-500/10 animate-in fade-in slide-in-from-top-2 duration-500 ring-2 ring-rose-500/20">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="font-bold text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
              Heavy Rush Alert
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
              The following areas are currently experiencing severe congestion:
              <span className="font-bold text-rose-700 dark:text-rose-300 ml-1.5 block sm:inline mt-1 sm:mt-0">
                {heavyRushZones.map(z => z.name).join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((z) => <ZoneCard key={z.zone_id} zone={z} onChanged={onChanged} canEdit={canEdit} />)}
      </div>
    </div>
  );
}

function ZoneCard({ zone, onChanged, canEdit }) {
  const [open, setOpen] = useState(zone.counters_open);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(zone.counters_open);
  }, [zone.counters_open]);

  const rec = zone.recommended_counters || 1;
  const ratio = open / Math.max(1, rec);
  const isModified = open !== zone.counters_open;

  const previewLevel = ratio >= 1.0 ? "normal" : ratio >= 0.70 ? "medium" : "heavy";
  const level = isModified ? previewLevel : zone.crowd_level;

  const previewWaitSec = ratio >= 1.0
    ? Math.max(45, Math.round(zone.predicted_wait_seconds * (zone.counters_open / Math.max(1, open))))
    : ratio >= 0.70
    ? Math.max(180, Math.round(240 + (1.0 - ratio) * 200))
    : Math.max(450, Math.round(500 + ((0.70 - ratio) / 0.70) * 500));
  const waitSec = isModified ? previewWaitSec : zone.predicted_wait_seconds;

  const paxCount = Math.round(zone.predicted_count);

  const barColor = level === "heavy" ? "bg-aero-rose" : level === "medium" ? "bg-aero-amber" : "bg-aero-emerald";
  const pct = Math.min(100, (paxCount / (zone.threshold_medium_max * 1.4)) * 100);
  const understaffed = rec > open;

  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/congestion/zones/${zone.zone_id}/staffing-recommendation`, { counters_open: open });
      toast.success(`Staffing Deployed: ${zone.name.split("·")[0]} → ${open} counters open. Crowd level updated.`);
      onChanged && onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Update failed");
    } finally { setBusy(false); }
  };
  const applyRec = () => setOpen(rec);

  return (
    <div className={`aero-card p-4 transition-all duration-300 ${level === "heavy" ? "glow-cyan ring-1 ring-rose-500/30" : level === "medium" ? "ring-1 ring-amber-500/20" : "ring-1 ring-emerald-500/20"}`} data-testid={`zone-card-${zone.zone_id}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="overline text-aero-t3 text-[9px]">{ICONMAP[zone.zone_type] || zone.zone_type} · {zone.terminal}</div>
          <div className="font-semibold text-sm leading-tight mt-0.5">{zone.name}</div>
        </div>
        <CrowdBadge level={level} testId={`zone-badge-${zone.zone_id}`} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <Metric label="Passengers" value={paxCount} />
        <Metric label="Avg Wait" value={`${Math.max(1, Math.round(waitSec / 60))}m`} />
        <Metric label="Utilization" value={`${Math.round(Math.min(1.0, (zone.arrival_rate_per_min || 10) / Math.max(0.1, open * (60.0 / (zone.avg_service_seconds_per_passenger || 60)))) * 100)}%`} />
      </div>

      <div className="h-1.5 rounded-full bg-aero-elevated mt-3 overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-aero-t2">Open: <b className="text-aero-t1 font-mono">{zone.counters_open}</b></span>
        <span className={`font-mono ${understaffed ? "text-aero-rose font-bold" : "text-aero-emerald font-semibold"}`}>
          AI rec: {zone.recommended_counters} {understaffed ? <ArrowUp className="w-3 h-3 inline" /> : <Check className="w-3 h-3 inline" />}
        </span>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-aero-border">
          <button data-testid={`zone-dec-${zone.zone_id}`} onClick={() => setOpen((v) => Math.max(1, v - 1))} className="w-7 h-7 grid place-items-center rounded border border-aero-border hover:border-aero-cyan/40 hover:bg-aero-cyan/10 cursor-pointer active:scale-90 transition-all"><ArrowDown className="w-3 h-3" /></button>
          <span className={`font-mono font-bold w-8 text-center tabular ${open !== zone.counters_open ? "text-aero-cyan scale-110" : ""}`}>{open}</span>
          <button data-testid={`zone-inc-${zone.zone_id}`} onClick={() => setOpen((v) => Math.min(zone.capacity, v + 1))} className="w-7 h-7 grid place-items-center rounded border border-aero-border hover:border-aero-cyan/40 hover:bg-aero-cyan/10 cursor-pointer active:scale-90 transition-all"><ArrowUp className="w-3 h-3" /></button>
          <button data-testid={`zone-apply-rec-${zone.zone_id}`} onClick={applyRec} className="text-[11px] font-mono text-aero-cyan hover:underline ml-1 cursor-pointer font-semibold">use rec</button>
          <button
            data-testid={`zone-save-${zone.zone_id}`}
            onClick={save}
            disabled={busy}
            className={`ml-auto text-xs font-bold px-3.5 py-1.5 rounded-lg border shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${
              open !== zone.counters_open
                ? "bg-aero-cyan text-[#041014] border-aero-cyan shadow-cyan-500/30 hover:brightness-110"
                : "bg-aero-cyan/20 text-aero-cyan border-aero-cyan/40 hover:bg-aero-cyan hover:text-[#041014]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {busy ? "Deploying..." : open !== zone.counters_open ? "Deploy Changes" : "Deploy"}
          </button>
        </div>
      )}
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-aero-elevated/50 py-2">
      <div className="font-mono font-bold text-lg tabular leading-none">{value}</div>
      <div className="text-[9px] text-aero-t3 uppercase mt-1">{label}</div>
    </div>
  );
}
