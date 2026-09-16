import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Zap,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Radio
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function RagAutomationController({
  onRefreshTelemetry,
  compact = false,
  section = "all" // "all" | "congestion" | "baggage"
}) {
  const { isStaff } = useAuth();
  const [mode, setMode] = useState("manual"); // 'manual' | 'autonomous'
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [sops, setSops] = useState([]);
  const [activeActions, setActiveActions] = useState([]);
  const [expandedSop, setExpandedSop] = useState(null);
  const [minimizedActions, setMinimizedActions] = useState(false);

  // Fetch initial status & SOPs
  const fetchStatus = React.useCallback(async () => {
    if (!isStaff) return;
    try {
      setLoading(true);
      const { data } = await api.get("/rag/status");
      setMode(data.mode || "manual");
      setAuditLog(data.recent_audit_log || []);
      
      let combined = [
        ...(data.active_manpower_actions || []).map((a) => ({ ...a, type: "manpower" })),
        ...(data.active_baggage_actions || []).map((a) => ({ ...a, type: "baggage" }))
      ];

      if (section === "congestion") {
        combined = combined.filter((a) => a.type === "manpower");
      } else if (section === "baggage") {
        combined = combined.filter((a) => a.type === "baggage");
      }

      setActiveActions(combined);
    } catch (err) {
      console.warn("RAG status error:", err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, section]);

  const fetchSops = React.useCallback(async () => {
    if (!isStaff) return;
    try {
      const { data } = await api.get("/rag/sops");
      let allSops = data.sops || [];
      if (section === "congestion") {
        allSops = allSops.filter((s) => s.category !== "baggage");
      } else if (section === "baggage") {
        allSops = allSops.filter((s) => s.category === "baggage");
      }
      setSops(allSops);
    } catch (err) {}
  }, [isStaff, section]);

  useEffect(() => {
    fetchStatus();
    fetchSops();
    const iv = setInterval(fetchStatus, 15000);
    return () => clearInterval(iv);
  }, [fetchStatus, fetchSops]);

  const handleToggleMode = async () => {
    const nextMode = mode === "manual" ? "autonomous" : "manual";
    try {
      setLoading(true);
      const { data } = await api.post("/rag/toggle-mode", { mode: nextMode });
      setMode(data.mode);
      if (data.mode === "autonomous") {
        toast.success("Autonomous Dispatch Enabled", {
          description: "Checkpoint counters and baggage belts will update automatically based on airport operating standards."
        });
        runEvaluation(true);
      } else {
        toast.info("Manual Control Enabled", {
          description: "Duty manager approval required before applying counter and belt changes."
        });
      }
    } catch (err) {
      toast.error("Failed to toggle operating mode");
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async (silent = false) => {
    try {
      setEvaluating(true);
      const promises = [];
      if (section === "all" || section === "congestion") {
        promises.push(api.post("/rag/evaluate-congestion"));
      }
      if (section === "all" || section === "baggage") {
        promises.push(api.post("/rag/evaluate-baggage"));
      }
      
      await Promise.all(promises);
      await fetchStatus();
      if (onRefreshTelemetry) onRefreshTelemetry();
      
      if (!silent) {
        toast.success("Operations Evaluated", {
          description: mode === "autonomous" 
            ? "Terminal staffing and belt assignments updated." 
            : "Recommendations updated for duty manager review."
        });
      }
    } catch (err) {
      if (!silent) toast.error("Failed to evaluate operations");
    } finally {
      setEvaluating(false);
    }
  };

  const handleManualAction = async (action) => {
    try {
      setLoading(true);
      if (action.type === "manpower") {
        await api.post("/rag/execute-action", {
          action_type: "deploy_staff",
          zone_id: action.zone_id,
          counters_open: action.recommended_counters
        });
        toast.success(`Deployed ${action.recommended_counters} counters to ${action.zone_name}`);
      } else if (action.type === "baggage") {
        await api.post("/rag/execute-action", {
          action_type: "reassign_belt",
          flight_id: action.flight_id,
          carousel_id: action.target_carousel_id,
          carousel_number: action.target_carousel_number
        });
        toast.success(`Reassigned flight ${action.flight_number} to Belt ${action.target_carousel_number}`);
      }
      await fetchStatus();
      if (onRefreshTelemetry) onRefreshTelemetry();
    } catch (err) {
      toast.error("Failed to execute RAG recommendation");
    } finally {
      setLoading(false);
    }
  };

  if (!isStaff) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Banner: Mode Status & Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border ${
            mode === "autonomous"
              ? "bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/40 text-cyan-700 dark:text-cyan-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          }`}>
            <Brain className="w-5 h-5 animate-pulse text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                {section === "congestion"
                  ? "RAG Congestion & Checkpoint SOP Auto-Pilot"
                  : section === "baggage"
                  ? "RAG Baggage Carousel SOP Auto-Pilot"
                  : "RAG Airport Operations SOP Auto-Pilot"}
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                mode === "autonomous"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              }`}>
                {mode === "autonomous" ? "Autonomous Dispatch Active" : "Manual Authorization Mode"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {mode === "autonomous"
                ? "Checkpoint counters and baggage belts update automatically based on live terminal telemetry and SOP thresholds."
                : "Standard operating procedures evaluate live queue telemetry and propose recommendations for duty manager review."}
            </p>
          </div>
        </div>

        {/* Toggle Controls & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => runEvaluation(false)}
            disabled={evaluating || loading}
            title="Re-run SOP Knowledge Evaluation"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin text-cyan-500" : ""}`} />
            <span className="hidden sm:inline">Evaluate Now</span>
          </button>

          {/* Master Autonomous Toggle Switch */}
          <button
            onClick={handleToggleMode}
            disabled={loading}
            className={`px-3.5 py-2 rounded-xl border-2 transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm ${
              mode === "autonomous"
                ? "bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400 shadow-emerald-500/20"
                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-cyan-500"
            }`}
          >
            <Radio className={`w-4 h-4 ${mode === "autonomous" ? "animate-pulse" : ""}`} />
            <span>{mode === "autonomous" ? "Autonomous: ON" : "Autonomous: OFF"}</span>
          </button>
        </div>
      </div>

      {/* Active Tactical RAG Actions Feed */}
      {activeActions.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Live RAG Deployments & Tactical Recommendations ({activeActions.length})
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">Directives: {sops.length} active</span>
              <button
                type="button"
                onClick={() => setMinimizedActions(!minimizedActions)}
                className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {minimizedActions ? (
                  <>
                    <span>Show ({activeActions.length})</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>Minimize</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {!minimizedActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {activeActions.slice(0, 4).map((action, idx) => {
                    const isManpower = action.type === "manpower";
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                            {action.sop_id} · {action.sop_title}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            action.status === "auto_deployed" || action.status === "auto_reassigned"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}>
                            {action.status === "auto_deployed" ? "Auto-Deployed" : action.status === "auto_reassigned" ? "Auto-Reassigned" : "Pending Review"}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {isManpower ? action.zone_name : `Flight ${action.flight_number} (${action.aircraft_name})`}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {isManpower ? action.action_description : action.reason}
                        </p>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                          <div className="text-slate-600 dark:text-slate-400">
                            {isManpower ? (
                              <span>Counters: <strong className="text-cyan-700 dark:text-cyan-300">{action.current_counters} → {action.recommended_counters}</strong></span>
                            ) : (
                              <span>Belt: <strong className="text-cyan-700 dark:text-cyan-300">{action.current_carousel_number} → {action.target_carousel_number}</strong></span>
                            )}
                          </div>

                          {mode === "manual" && (
                            <button
                              onClick={() => handleManualAction(action)}
                              disabled={loading}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Real-time SOP Directives Reference Drawer Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <button
          onClick={() => setExpandedSop(expandedSop ? null : true)}
          className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {expandedSop ? "Hide Airport SOP Directives" : "View Indexed Airport SOP Directives (7)"}
          {expandedSop ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <span className="font-mono text-[11px] text-slate-500">
          Last RAG Cycle: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Expanded SOP Knowledge Base Viewer */}
      <AnimatePresence>
        {expandedSop && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2 pt-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {sops.map((sop) => (
                <div key={sop.sop_id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-cyan-700 dark:text-cyan-300 font-mono">{sop.sop_id}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{sop.category}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">{sop.title}</div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{sop.content}</p>
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    <strong>Trigger:</strong> {sop.trigger_condition}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
