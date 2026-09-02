import React from "react";
import { Bell, Check, CheckCheck, AlertTriangle, Zap, Users2, PlaneLanding, Activity } from "lucide-react";
import { SeverityBadge } from "@/components/Badges";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import api from "@/lib/api";

const TYPE_ICON = {
  congestion: Users2, understaffing: Users2, staff_deployment: Users2, flight_delay: PlaneLanding,
  baggage_delay: PlaneLanding, carousel_overcrowd: AlertTriangle, anomaly: Activity,
};

export default function AlertsFeedCenter({ alerts, filter, setFilter, onChanged, canAct }) {
  const ack = async (id) => { try { await api.post(`/alerts/${id}/acknowledge`); toast.success("Alert acknowledged"); onChanged(); } catch (e) { toast.error("Failed"); } };
  const markEnRoute = async (id) => { try { await api.post(`/alerts/${id}/en-route`); toast.success("Marked: En Route to Zone"); onChanged(); } catch (e) { toast.error("Failed"); } };
  const markOnStation = async (id) => { try { await api.post(`/alerts/${id}/on-station`); toast.success("Marked: On Station (Ready at counter)"); onChanged(); } catch (e) { toast.error("Failed"); } };
  const resolve = async (id) => { try { await api.post(`/alerts/${id}/resolve`); toast.success("Alert resolved"); onChanged(); } catch (e) { toast.error("Failed"); } };
  const ackAll = async () => { try { const { data } = await api.post("/alerts/acknowledge-all"); toast.success(`Acknowledged ${data.acknowledged} open alert(s)`); onChanged(); } catch (e) { toast.error("Failed"); } };

  return (
    <div className="aero-card overflow-hidden" data-testid="alerts-feed">
      <div className="flex items-center justify-between px-4 py-3 border-b border-aero-border">
        <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-aero-cyan" /><span className="font-semibold">Live Alerts & Staff Dispatches</span>
          <span className="text-[10px] font-mono text-aero-t3 bg-aero-elevated px-2 py-0.5 rounded-full">{alerts.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {canAct && <button data-testid="ack-all-btn" onClick={ackAll} className="text-[11px] px-2.5 py-1 rounded border border-aero-cyan/30 text-aero-cyan hover:bg-aero-cyan/10 font-semibold flex items-center gap-1 cursor-pointer"><CheckCheck className="w-3 h-3" />Ack all</button>}
          <div className="flex items-center gap-1 rounded-lg border border-aero-border p-0.5">
            {["open", "critical", "all"].map((f) => (
              <button key={f} data-testid={`alert-filter-${f}`} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors cursor-pointer ${filter === f ? "bg-aero-cyan text-[#041014]" : "text-aero-t2 hover:text-aero-t1"}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="divide-y divide-aero-border max-h-[560px] overflow-auto">
        {alerts.map((a) => {
          const Icon = TYPE_ICON[a.alert_type] || Zap;
          const isStaffDeploy = a.alert_type === "staff_deployment";
          return (
            <div key={a.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-aero-elevated/40 ${isStaffDeploy && a.status === "open" ? "bg-aero-cyan/5 border-l-2 border-aero-cyan" : ""}`} data-testid={`alert-item-${a.id}`}>
              <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${a.severity === "critical" ? "bg-rose-500/10 text-aero-rose" : a.severity === "warning" ? "bg-amber-500/10 text-aero-amber" : "bg-sky-500/10 text-sky-400"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={a.severity} />
                  <span className={`text-[10px] font-mono uppercase font-bold ${isStaffDeploy ? "text-aero-cyan bg-aero-cyan/10 px-1.5 py-0.5 rounded" : "text-aero-t3"}`}>
                    {a.alert_type.replace("_", " ")}
                  </span>
                  {a.status === "en_route" && (
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      🏃 EN ROUTE {a.en_route_name ? `(${a.en_route_name.split(" ")[0]})` : ""}
                    </span>
                  )}
                  {a.status === "on_station" && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      📍 ON STATION {a.on_station_name ? `(${a.on_station_name.split(" ")[0]})` : ""}
                    </span>
                  )}
                  {a.status === "acknowledged" && (
                    <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                      ✓ ACKNOWLEDGED {a.acknowledged_name ? `(${a.acknowledged_name.split(" ")[0]})` : ""}
                    </span>
                  )}
                  {a.status === "resolved" && (
                    <span className="text-[10px] font-mono text-aero-emerald">· resolved</span>
                  )}
                </div>
                <div className="text-sm mt-1 text-aero-t1 font-medium">{a.message}</div>
                <div className="text-[10px] text-aero-t3 font-mono mt-0.5">
                  {fmtDateTime(a.triggered_at)}
                  {a.deployed_by ? ` · deployed by ${a.deployed_by}` : ""}
                  {a.en_route_by ? ` · en route: ${a.en_route_by}` : ""}
                  {a.on_station_by ? ` · on station: ${a.on_station_by}` : ""}
                </div>
              </div>
              {canAct && a.status !== "resolved" && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {a.status === "open" && (
                    <>
                      <button data-testid={`alert-enroute-${a.id}`} onClick={() => markEnRoute(a.id)} className="text-[11px] px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 flex items-center gap-1 font-semibold cursor-pointer active:scale-95 transition-all">
                        🏃 En Route
                      </button>
                      <button data-testid={`alert-ack-${a.id}`} onClick={() => ack(a.id)} className="text-[11px] px-2 py-0.5 rounded border border-aero-border hover:border-aero-cyan/40 text-aero-t2 flex items-center gap-1 cursor-pointer">
                        <Check className="w-3 h-3" />Ack
                      </button>
                    </>
                  )}
                  {a.status === "en_route" && (
                    <button data-testid={`alert-onstation-${a.id}`} onClick={() => markOnStation(a.id)} className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer active:scale-95 transition-all">
                      📍 On Station
                    </button>
                  )}
                  {a.status === "acknowledged" && (
                    <button data-testid={`alert-enroute-${a.id}`} onClick={() => markEnRoute(a.id)} className="text-[11px] px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 flex items-center gap-1 font-semibold cursor-pointer active:scale-95 transition-all">
                      🏃 En Route
                    </button>
                  )}
                  <button data-testid={`alert-resolve-${a.id}`} onClick={() => resolve(a.id)} className="text-[11px] px-2 py-0.5 rounded border border-aero-emerald/30 text-aero-emerald hover:bg-emerald-500/10 flex items-center gap-1 cursor-pointer">
                    <CheckCheck className="w-3 h-3" />Resolve
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {alerts.length === 0 && <div className="px-4 py-12 text-center text-aero-t3">No alerts. All clear. ✈</div>}
      </div>
    </div>
  );
}
