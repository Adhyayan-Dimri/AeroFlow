import React, { useState, useEffect } from "react";
import { Plus, Wrench, Trash2, ShieldAlert, CheckCircle2, Clock, AlertCircle, Sparkles, Calendar as CalendarIcon, Info } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const STATUS_STYLE = {
  free: "text-emerald-900 dark:text-emerald-300 border-emerald-500/80 dark:border-emerald-400/60 bg-emerald-100 dark:bg-emerald-500/20 shadow-sm dark:shadow-[0_0_12px_rgba(16,185,129,0.25)]",
  scheduled: "text-amber-900 dark:text-amber-300 border-amber-500/80 dark:border-amber-400/60 bg-amber-100 dark:bg-amber-500/20 shadow-sm dark:shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  occupied: "text-rose-900 dark:text-rose-300 border-rose-500/80 dark:border-rose-400/60 bg-rose-100 dark:bg-rose-500/20 shadow-sm dark:shadow-[0_0_12px_rgba(244,63,94,0.25)]",
  maintenance: "text-slate-900 dark:text-slate-300 border-slate-400/80 dark:border-slate-500/60 bg-slate-200 dark:bg-slate-800/60 shadow-sm",
};

const STATUS_LABELS = {
  free: "FREE",
  scheduled: "SCHEDULED",
  occupied: "OCCUPIED",
  maintenance: "MAINTENANCE",
};

export default function CarouselMasterManager({ carousels: initialCarousels, onChanged, canEdit }) {
  const [addOpen, setAddOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [form, setForm] = useState({ carousel_number: "", length_m: 90, speed_mps: 0.5 });
  const [carousels, setCarousels] = useState(initialCarousels || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dateFilter) {
      setCarousels(initialCarousels || []);
    } else {
      setLoading(true);
      api.get("/admin/carousels", { params: { date: dateFilter } })
        .then(({ data }) => setCarousels(data.carousels || []))
        .catch(() => setCarousels(initialCarousels || []))
        .finally(() => setLoading(false));
    }
  }, [dateFilter, initialCarousels]);

  const cycleStatus = async (c) => {
    const next = c.status === "maintenance" ? "free" : "maintenance";
    try {
      await api.patch(`/admin/carousels/${c.carousel_id}`, { status: next });
      toast.success(`${c.carousel_number} → ${next}`);
      if (onChanged) onChanged();
    } catch (e) {
      toast.error("Failed to update carousel status");
    }
  };

  const remove = async (c) => {
    try {
      await api.delete(`/admin/carousels/${c.carousel_id}`);
      toast.success(`${c.carousel_number} removed`);
      if (onChanged) onChanged();
    } catch {
      toast.error("Failed to delete carousel");
    }
  };

  const add = async () => {
    try {
      await api.post("/admin/carousels", form);
      toast.success(`${form.carousel_number} added`);
      setAddOpen(false);
      setForm({ carousel_number: "", length_m: 90, speed_mps: 0.5 });
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const occupiedCount = carousels.filter((c) => c.status === "occupied").length;
  const scheduledCount = carousels.filter((c) => c.status === "scheduled").length;
  const freeCount = carousels.filter((c) => c.status === "free").length;
  const maintCount = carousels.filter((c) => c.status === "maintenance").length;
  const reserveCount = carousels.filter((c) => c.is_emergency_reserve || c.carousel_number in { "AC-13": 1, "AC-14": 1 }).length;

  return (
    <div className="space-y-4" data-testid="carousel-master">
      {}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="overline text-aero-t3">Master Matrix & Allocation Control</div>
          <h3 className="font-display text-xl font-bold">Baggage Carousels ({carousels.length})</h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {}
          <div className="flex items-center gap-2">
            <span className="text-xs text-aero-t3 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-aero-cyan" /> Matrix Date:
            </span>
            <div className="w-[145px]">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    data-testid="ops-matrix-date-btn"
                    className="h-9 w-full rounded-md bg-aero-surface border border-aero-border text-xs px-2.5 text-aero-t1 outline-none focus:border-aero-cyan/50 flex items-center justify-between font-mono"
                  >
                    <span>
                      {dateFilter
                        ? (dateFilter.includes("-")
                            ? `${dateFilter.split("-")[2]}/${dateFilter.split("-")[1]}/${dateFilter.split("-")[0]}`
                            : dateFilter)
                        : "DD/MM/YYYY"}
                    </span>
                    <CalendarIcon className="w-3.5 h-3.5 text-aero-t3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      dateFilter
                        ? new Date(
                            dateFilter.includes("-")
                              ? `${dateFilter}T00:00:00`
                              : `${dateFilter.split("/")[2]}-${dateFilter.split("/")[1]}-${dateFilter.split("/")[0]}T00:00:00`
                          )
                        : undefined
                    }
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
                    <span>Format: <strong className="text-aero-cyan font-mono">DD/MM/YYYY</strong></span>
                    <button
                      onClick={() => { setDateFilter(""); setCalendarOpen(false); }}
                      className="text-aero-cyan hover:underline font-bold"
                    >
                      Live (Now)
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="h-9 text-xs text-aero-t3 hover:text-aero-cyan">
                Live (Now)
              </Button>
            )}
          </div>

          {canEdit && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-carousel-btn" className="bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold h-9 text-xs">
                  <Plus className="w-4 h-4 mr-1.5" /> Add carousel
                </Button>
              </DialogTrigger>
              <DialogContent className="data-[theme=light]:bg-white data-[theme=dark]:bg-[#0E131F]/95 backdrop-blur-xl border border-white/10" data-testid="add-carousel-modal">
                <DialogHeader><DialogTitle className="font-display">Add carousel</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Carousel number</Label>
                    <Input data-testid="carousel-number-input" value={form.carousel_number} onChange={(e) => setForm({ ...form, carousel_number: e.target.value })} placeholder="AC-15" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Length (m)</Label><Input type="number" value={form.length_m} onChange={(e) => setForm({ ...form, length_m: +e.target.value })} /></div>
                    <div><Label>Speed (m/s)</Label><Input type="number" step="0.1" value={form.speed_mps} onChange={(e) => setForm({ ...form, speed_mps: +e.target.value })} /></div>
                  </div>
                  <Button data-testid="carousel-save-btn" onClick={add} className="w-full bg-aero-cyan text-[#041014] font-semibold">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="aero-card p-3 border-rose-300 dark:border-rose-500/30 bg-rose-50/90 dark:bg-rose-500/[0.04] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/10 border border-rose-400 dark:border-rose-500/30 grid place-items-center text-rose-900 dark:text-rose-400 font-bold font-display text-base">
            {occupiedCount}
          </div>
          <div>
            <div className="text-xs font-bold text-rose-950 dark:text-rose-400">Occupied</div>
            <div className="text-[10px] text-aero-t3 font-medium">Active / &le; 90 min</div>
          </div>
        </div>

        <div className="aero-card p-3 border-amber-300 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-500/[0.04] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-400 dark:border-amber-500/30 grid place-items-center text-amber-900 dark:text-amber-400 font-bold font-display text-base">
            {scheduledCount}
          </div>
          <div>
            <div className="text-xs font-bold text-amber-950 dark:text-amber-400">Scheduled</div>
            <div className="text-[10px] text-aero-t3 font-medium">90 – 180 min</div>
          </div>
        </div>

        <div className="aero-card p-3 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-500/[0.04] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-400 dark:border-emerald-500/30 grid place-items-center text-emerald-900 dark:text-aero-emerald font-bold font-display text-base">
            {freeCount}
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-aero-emerald">Free</div>
            <div className="text-[10px] text-aero-t3 font-medium">&gt; 180 min / Reserve</div>
          </div>
        </div>

        <div className="aero-card p-3 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-500/[0.04] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-400 dark:border-emerald-500/30 grid place-items-center text-emerald-900 dark:text-aero-emerald font-bold font-display text-base">
            {reserveCount}
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-aero-emerald">Emergency Reserve</div>
            <div className="text-[10px] text-aero-t3 font-medium">Min 2 belts free</div>
          </div>
        </div>

        <div className="aero-card p-3 border-slate-300 dark:border-slate-500/30 bg-slate-50/90 dark:bg-slate-500/[0.04] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-500/10 border border-slate-400 dark:border-slate-500/30 grid place-items-center text-slate-900 dark:text-slate-400 font-bold font-display text-base">
            {maintCount}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-950 dark:text-slate-400">Maintenance</div>
            <div className="text-[10px] text-aero-t3 font-medium">Locked / offline</div>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {carousels.map((c) => {
          const isEmergency = c.is_emergency_reserve || c.carousel_number === "AC-13" || c.carousel_number === "AC-14";
          const statusKey = c.status in STATUS_STYLE ? c.status : "free";
          const flt = c.active_flight || (c.flight_number ? { flight_number: c.flight_number } : null);

          return (
            <div key={c.carousel_id} className="aero-card p-3 text-center relative overflow-hidden flex flex-col justify-between" data-testid={`carousel-tile-${c.carousel_number}`}>
              {isEmergency && (
                <div className="absolute top-1.5 right-1.5" title="Designated Emergency Reserve">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 block animate-pulse" />
                </div>
              )}

              <div>
                <div className={`mx-auto w-12 h-12 rounded-xl grid place-items-center font-display font-black text-lg border-2 transition-all ${STATUS_STYLE[statusKey]}`}>
                  {c.carousel_number.replace("AC-", "")}
                </div>
                <div className="font-mono text-xs font-bold mt-2 text-aero-t1">{c.carousel_number}</div>
                <div className="text-[9px] text-aero-t3 font-medium">{c.length_m}m · {c.speed_mps}m/s</div>

                {isEmergency && (
                  <div className="mt-1">
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 inline-block font-bold">
                      EMERGENCY RESERVE
                    </span>
                  </div>
                )}

                {flt?.flight_number && (
                  <div className="mt-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-aero-surface border border-aero-border text-aero-t1 inline-block">
                      ✈️ {flt.flight_number}
                    </span>
                  </div>
                )}

                <div className="mt-1.5">
                  <span className={`inline-block text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${STATUS_STYLE[statusKey]}`}>
                    {STATUS_LABELS[statusKey] || statusKey}
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-aero-border">
                  <button
                    data-testid={`carousel-toggle-${c.carousel_number}`}
                    onClick={() => cycleStatus(c)}
                    className="p-1.5 rounded hover:bg-aero-elevated text-aero-amber"
                    title={c.status === "maintenance" ? "Reactivate Carousel" : "Set to Maintenance"}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                  </button>
                  <button
                    data-testid={`carousel-delete-${c.carousel_number}`}
                    onClick={() => remove(c)}
                    className="p-1.5 rounded hover:bg-aero-elevated text-aero-rose"
                    title="Remove Carousel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
