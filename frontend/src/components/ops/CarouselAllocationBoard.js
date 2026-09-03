import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Timer, Plane, RefreshCw, Search, ShieldAlert, Calendar as CalendarIcon, Clock, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { fmtTime, minsFromNow, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function CarouselAllocationBoard({ assignments: initialAssignments, carousels, canEdit, onChanged }) {
  const [delayFor, setDelayFor] = useState(null);
  const [reassignFor, setReassignFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [assignments, setAssignments] = useState(initialAssignments || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFilter) {
      setAssignments(initialAssignments || []);
    } else {
      setLoading(true);
      api.get("/baggage/assignments", { params: { date: dateFilter } })
        .then(({ data }) => setAssignments(data.assignments || []))
        .catch(() => setAssignments([]))
        .finally(() => setLoading(false));
    }
  }, [dateFilter, initialAssignments]);

  const effectiveNowMs = useMemo(() => {
    if (!dateFilter) return Date.now();
    const d = new Date(`${dateFilter}T12:00:00Z`);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }, [dateFilter]);

  const derived = useMemo(() => {
    return assignments.map((a) => {
      const s = new Date(a.window_start).getTime();
      const e = new Date(a.window_end).getTime();
      const deltaMin = (s - effectiveNowMs) / 60000;
      let ds = a.status;
      if (a.status !== "conflict") {
        if (deltaMin > 180 || !a.carousel_id || a.carousel_number === "TBD") {
          ds = "tbd";
        } else if (effectiveNowMs < s) {
          ds = deltaMin <= 90 ? "occupied" : "scheduled";
        } else if (effectiveNowMs <= e) {
          ds = "active";
        } else {
          ds = "completed";
        }
      }
      return { ...a, _s: s, _e: e, _ds: ds };
    });
  }, [assignments, effectiveNowMs]);

  const filtered = useMemo(() => {
    const list = searchQuery
      ? derived.filter(a => a.flight?.flight_number?.toLowerCase().includes(searchQuery.toLowerCase()) || a.flight?.airline_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.flight?.origin?.toLowerCase().includes(searchQuery.toLowerCase()))
      : derived;

    const order = { active: 0, occupied: 1, conflict: 2, scheduled: 3, tbd: 4, completed: 5 };
    return [...list].sort((x, y) => ((order[x._ds] ?? 99) - (order[y._ds] ?? 99)) || (x._s - y._s));
  }, [derived, searchQuery]);

  const conflicts = filtered.filter((a) => a._ds === "conflict");

  const winText = (a) => {
    const sMin = Math.round((a._s - effectiveNowMs) / 60000), eMin = Math.round((a._e - effectiveNowMs) / 60000);
    if (eMin < 0) return "cleared";
    if (sMin > 0) return `in ${sMin}–${eMin}m`;
    return `now · ${eMin}m left`;
  };

  const statusStyle = (ds) => ds === "conflict" ? "text-rose-950 dark:text-rose-300 border-rose-500/80 dark:border-rose-400/60 bg-rose-100 dark:bg-rose-500/20 shadow-sm dark:shadow-[0_0_10px_rgba(244,63,94,0.25)]"
    : ds === "active" ? "text-cyan-950 dark:text-cyan-300 border-cyan-500/80 dark:border-cyan-400/60 bg-cyan-100 dark:bg-cyan-500/20 shadow-sm dark:shadow-[0_0_10px_rgba(6,182,212,0.25)]"
    : ds === "occupied" ? "text-rose-950 dark:text-rose-300 border-rose-500/80 dark:border-rose-400/60 bg-rose-100 dark:bg-rose-500/20 shadow-sm dark:shadow-[0_0_10px_rgba(244,63,94,0.25)]"
    : ds === "scheduled" ? "text-amber-950 dark:text-amber-300 border-amber-500/80 dark:border-amber-400/60 bg-amber-100 dark:bg-amber-500/20 shadow-sm dark:shadow-[0_0_10px_rgba(245,158,11,0.25)]"
    : (ds === "tbd" || ds === "yet_to_assign") ? "text-emerald-950 dark:text-emerald-300 border-emerald-500/80 dark:border-emerald-400/60 bg-emerald-100 dark:bg-emerald-500/20 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.25)]"
    : "text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50";

  const statusLabel = (ds) => ds === "tbd" || ds === "yet_to_assign" ? "YET TO DECIDE (>180m)"
    : ds === "active" ? "ACTIVE (USING BELT)"
    : ds === "occupied" ? "OCCUPIED (<=90m)"
    : ds === "scheduled" ? "SCHEDULED (90-180m)"
    : ds;

  const getCarouselLength = (cid, cnum) => {
    const cObj = carousels?.find(c => c.carousel_id === cid || c.carousel_number === cnum);
    return cObj ? `${cObj.length_m}m` : null;
  };

  return (
    <div data-testid="carousel-allocation-board" className="space-y-3">
      {conflicts.length > 0 && (
        <div className="aero-card p-3 mb-2 border-rose-400 dark:border-aero-rose/40 bg-rose-50 dark:bg-rose-500/[0.06] flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-aero-rose" />
          <span className="text-rose-900 dark:text-aero-rose font-semibold">{conflicts.length} carousel conflict(s)</span>
          <span className="text-aero-t2">multiple flights overlapping. Reassign to resolve.</span>
        </div>
      )}

      <div className="aero-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">Baggage Belt Operations</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Size-Matching Active
              </span>
            </div>
            <p className="text-xs text-aero-t2 mt-0.5">
              Live carousel assignments optimized by aircraft category (wide vs narrow body), passenger load, and belt capacity.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-aero-t3" />
              <input
                type="text"
                placeholder="Search flight or origin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-aero-surface border border-aero-border text-slate-900 dark:text-white placeholder:text-aero-t3 focus:outline-none focus:border-aero-cyan w-48"
              />
            </div>

            <div className="relative">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs bg-aero-surface border-aero-border text-slate-700 dark:text-slate-200 hover:text-aero-cyan flex items-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-aero-cyan" />
                    <span>{dateFilter || "Filter Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-white dark:bg-slate-900 border border-aero-border shadow-2xl rounded-2xl" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter ? new Date(dateFilter) : undefined}
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        const day = String(selectedDate.getDate()).padStart(2, "0");
                        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                        const year = selectedDate.getFullYear();
                        setDateFilter(`${year}-${month}-${day}`);
                      } else {
                        setDateFilter("");
                      }
                      setCalendarOpen(false);
                    }}
                    initialFocus
                  />
                  <div className="px-3 py-2 border-t border-aero-border bg-aero-surface/80 text-[10px] text-aero-t2 flex items-center justify-between">
                    <span>Format: <strong className="text-aero-cyan font-mono">YYYY-MM-DD</strong></span>
                    <button
                      onClick={() => { setDateFilter(""); setCalendarOpen(false); }}
                      className="text-aero-cyan hover:underline font-bold"
                    >
                      Reset
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="h-8 text-xs text-aero-t3 hover:text-aero-cyan">
                Today
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-aero-elevated/60 text-aero-t3">
              <tr className="text-left">
                {["Flight", "Aircraft & Pax", "Route", "Belt / Carousel", "AI Recommendation", "Window", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-aero-border">
              {filtered.map((a) => {
                const aiRec = a.ai_recommendation;
                const pax = a.flight?.passengers || 150;
                const isIntl = a.flight?.is_international;
                const currentBeltLen = getCarouselLength(a.carousel_id, a.carousel_number);

                return (
                  <tr key={a.id} className="hover:bg-aero-elevated/40 transition-colors" data-testid={`assignment-row-${a.flight?.flight_number}`}>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                        <Plane className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 rotate-[135deg]" />
                        {a.flight?.flight_number}
                      </div>
                      <div className="text-[10px] text-aero-t3">{a.flight?.airline_name}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {pax} Pax · {isIntl ? "Intl" : "Dom"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {aiRec?.aircraft_label || (pax >= 230 ? "Wide-Body" : "Narrow-Body")}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-aero-t2 text-xs font-medium">
                      {a.flight?.origin}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {(!a.carousel_id || a.carousel_number === "TBD" || a.carousel_number === "Yet to be decided") ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 min-w-[52px] h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-500/60 dark:border-emerald-400/60 font-mono font-black text-emerald-950 dark:text-emerald-300 text-xs shadow-sm whitespace-nowrap">
                          TBD
                        </span>
                      ) : (
                        <div className="inline-flex flex-col">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 min-w-[56px] rounded-md bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-500/70 dark:border-cyan-400/70 font-display font-black text-cyan-950 dark:text-cyan-300 text-xs shadow-sm whitespace-nowrap">
                            {a.carousel_number}
                          </span>
                          {currentBeltLen && (
                            <span className="text-[9px] font-mono text-center text-slate-500 dark:text-slate-400 mt-0.5">
                              {currentBeltLen} belt
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {aiRec ? (
                        aiRec.is_current_optimal && a.carousel_number !== "TBD" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Optimal Belt ({aiRec.recommended_length_m}m)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
                              <Sparkles className="w-3 h-3 text-cyan-500" /> Rec: {aiRec.recommended_carousel_number} ({aiRec.recommended_length_m}m)
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => setReassignFor(a)}
                                title="Click to review and apply AI recommendation"
                                className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline font-bold whitespace-nowrap"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Analyzing...</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-aero-t3 font-mono whitespace-nowrap">
                      <div>{fmtTime(a.window_start)} – {fmtTime(a.window_end)}</div>
                      <div className="text-[10px] text-slate-400">{winText(a)}</div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border ${statusStyle(a._ds)}`}>
                        {statusLabel(a._ds)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            data-testid={`delay-btn-${a.flight?.flight_number}`}
                            onClick={() => setDelayFor(a)}
                            className="text-xs text-amber-800 dark:text-amber-400 font-bold hover:underline"
                          >
                            +delay
                          </button>
                          <button
                            data-testid={`reassign-btn-${a.flight?.flight_number}`}
                            onClick={() => setReassignFor(a)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Reassign
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-aero-t3">
                    No active baggage assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DelayModal a={delayFor} onClose={() => setDelayFor(null)} onChanged={onChanged} />
      <ReassignModal a={reassignFor} carousels={carousels} assignments={assignments} onClose={() => setReassignFor(null)} onChanged={onChanged} />
    </div>
  );
}

function DelayModal({ a, onClose, onChanged }) {
  const [min, setMin] = useState(15);
  if (!a) return null;
  const submit = async () => {
    try {
      await api.post(`/baggage/flights/${a.flight_id}/delay`, { additional_minutes: Number(min) });
      toast.success(`${a.flight?.flight_number} baggage delayed +${min}m. Passengers updated`);
      onChanged && onChanged(); onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  return (
    <Dialog open={!!a} onOpenChange={onClose}>
      <DialogContent className="data-[theme=light]:bg-white data-[theme=dark]:bg-[#0E131F]/95 backdrop-blur-xl border border-white/10" data-testid="delay-modal">
        <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Timer className="w-5 h-5 text-amber-500 dark:text-aero-amber" /> Add baggage delay · {a.flight?.flight_number}</DialogTitle></DialogHeader>
        <p className="text-sm text-aero-t2">Shift first/last bag ETA for a real operational delay. Reflected instantly to passengers.</p>
        <div><label className="text-xs text-aero-t2">Additional minutes</label><Input data-testid="delay-minutes" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
        <Button data-testid="delay-submit" onClick={submit} className="bg-aero-amber text-[#041014] hover:bg-aero-amber/90 font-semibold">Apply delay</Button>
      </DialogContent>
    </Dialog>
  );
}

function ReassignModal({ a, carousels, assignments, onClose, onChanged }) {
  if (!a) return null;
  const nowMs = Date.now();
  const aiRec = a.ai_recommendation;
  const pax = a.flight?.passengers || 150;
  const isIntl = a.flight?.is_international;
  const bags = aiRec?.estimated_bags || Math.round(pax * (isIntl ? 1.4 : 0.95));

  const getCarouselStatus = (carouselId) => {
    const cObj = carousels?.find(c => c.carousel_id === carouselId);
    const isReserve = cObj?.is_emergency_reserve || ["AC-13", "AC-14"].includes(cObj?.carousel_number);

    const assignment = assignments?.find(assign =>
      assign.carousel_id === carouselId &&
      assign.id !== a.id &&
      new Date(assign.window_end).getTime() >= nowMs
    );

    if (!assignment) {
      return { status: isReserve ? 'reserve' : 'free', isReserve, length_m: cObj?.length_m || 88 };
    }

    const windowStart = new Date(assignment.window_start).getTime();
    const windowEnd = new Date(assignment.window_end).getTime();
    const timeUntilStart = (windowStart - nowMs) / 60000;

    if (timeUntilStart <= 90 || (nowMs >= windowStart && nowMs <= windowEnd)) {
      return { status: 'locked', isReserve, length_m: cObj?.length_m || 88 };
    } else if (timeUntilStart <= 180) {
      return { status: 'scheduled', isReserve, length_m: cObj?.length_m || 88 };
    } else {
      return { status: 'free', isReserve, length_m: cObj?.length_m || 88 };
    }
  };

  const submit = async (cid) => {
    try {
      await api.post(`/baggage/assignments/${a.id}/reassign`, { carousel_id: cid });
      toast.success(`${a.flight?.flight_number} reassigned successfully`);
      onChanged && onChanged();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Reassign failed");
    }
  };

  return (
    <Dialog open={!!a} onOpenChange={onClose}>
      <DialogContent className="max-w-xl data-[theme=light]:bg-white data-[theme=dark]:bg-[#0E131F]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10" data-testid="reassign-modal">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Carousel Reassignment · {a.flight?.flight_number}</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
              Current: {a.carousel_number || "TBD"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {aiRec && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 grid place-items-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    AI Sizing & Capacity Recommendation
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {aiRec.aircraft_label} · {pax} Pax · ~{bags} Bags ({isIntl ? "International" : "Domestic"})
                  </div>
                </div>
              </div>

              {aiRec.recommended_carousel_id && (
                <button
                  onClick={() => submit(aiRec.recommended_carousel_id)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all transform active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply {aiRec.recommended_carousel_number} ({aiRec.recommended_length_m}m)</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              💡 {aiRec.reason}
            </p>
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
            <span>Select Carousel Belt:</span>
            <span className="text-[10px] font-normal text-slate-500">105m = High Capacity · 88m = Standard</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-60 overflow-auto p-1">
            {carousels?.filter((c) => c.status !== "maintenance").map((c) => {
              const carouselStatus = getCarouselStatus(c.carousel_id);
              const isCurrent = c.carousel_number === a.carousel_number;
              const isRecommended = aiRec?.recommended_carousel_id === c.carousel_id;
              const beltLen = c.length_m || 88;

              let buttonClass = "";
              if (isCurrent) {
                buttonClass = "border-cyan-500 bg-cyan-100 text-cyan-950 dark:border-cyan-400 dark:bg-cyan-500/25 dark:text-cyan-300 ring-2 ring-cyan-500/40";
              } else if (isRecommended && carouselStatus.status !== 'locked') {
                buttonClass = "border-amber-400 dark:border-amber-400 bg-amber-50 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50 hover:scale-105";
              } else if (carouselStatus.status === 'locked') {
                buttonClass = "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300 cursor-not-allowed opacity-60";
              } else if (carouselStatus.status === 'scheduled') {
                buttonClass = "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300 hover:border-amber-500";
              } else {
                buttonClass = "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300 hover:border-emerald-500";
              }

              return (
                <button
                  key={c.carousel_id}
                  data-testid={`reassign-option-${c.carousel_number}`}
                  onClick={() => carouselStatus.status !== 'locked' && submit(c.carousel_id)}
                  disabled={carouselStatus.status === 'locked'}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center font-display transition-all relative ${buttonClass}`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 px-1 rounded bg-amber-500 text-white font-mono text-[7px] font-black uppercase tracking-wider shadow-sm">
                      AI REC
                    </span>
                  )}
                  <span className="font-bold text-xs">{c.carousel_number}</span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{beltLen}m</span>
                  {carouselStatus.isReserve && (
                    <span className="text-[7px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">RES</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-aero-t3 font-medium">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-emerald-500/40 bg-emerald-500/20"></div> Free / Reserve</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-amber-500/40 bg-amber-500/20"></div> Scheduled (90-180m)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-rose-500/40 bg-rose-500/20"></div> Occupied / Locked (&le;90m)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-400"></div> AI Recommended</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
