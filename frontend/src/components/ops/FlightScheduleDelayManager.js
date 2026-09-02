import React, { useEffect, useMemo, useState } from "react";
import { Plane, Search, Clock, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight, ShieldAlert, Sparkles, Filter, Calendar as CalendarIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fmtTime, fmtDateTime, fmtDateTimeWithNextDay } from "@/lib/format";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const REASONS = [
  "Air Traffic Control (ATC) Flow Hold",
  "Adverse Weather / Low Visibility Conditions",
  "Technical / Aircraft Maintenance Inspection",
  "Late Inbound Aircraft Turnaround",
  "Crew Duty / Operational Hold",
  "Security / Enhanced Screening Measures",
  "Runway Maintenance / Congestion",
  "Operational Schedule Adjustment",
];

const PRESETS = [15, 30, 45, 60, 90, 120];

export default function FlightScheduleDelayManager({ onFlightDelayed, canEdit = true }) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [dirFilter, setDirFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedFlight, setSelectedFlight] = useState(null);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [delayReason, setDelayReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFlights = async () => {
    setLoading(true);
    try {
      const params = { limit: 250 };
      if (q) params.number = q;
      if (dirFilter !== "all") params.direction = dirFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      const { data } = await api.get("/admin/flights", { params });
      setFlights(data.flights || []);
    } catch (err) {
      toast.error("Failed to load flights: " + (formatApiError(err.response?.data?.detail) || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFlights();
    }, 150);
    return () => clearTimeout(timer);

  }, [q, dirFilter, statusFilter, dateFilter]);

  const handleApplyDelay = async () => {
    if (!selectedFlight) return;
    setSubmitting(true);
    try {
      const finalReason = customReason.trim() || delayReason;
      await api.post(`/admin/flights/${selectedFlight.flight_id}/delay`, {
        additional_minutes: parseInt(delayMinutes, 10),
        reason: finalReason,
        new_status: "delayed",
      });

      toast.success(`Flight ${selectedFlight.flight_number} delayed by +${delayMinutes}m. Passenger schedules updated.`);
      setSelectedFlight(null);
      setCustomReason("");
      loadFlights();
      if (onFlightDelayed) onFlightDelayed();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to update flight delay");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = flights.length;
    const delayed = flights.filter((f) => f.status === "delayed" || (f.flight_delay_minutes && f.flight_delay_minutes > 0)).length;
    const onTime = total - delayed;
    return { total, delayed, onTime };
  }, [flights]);

  return (
    <div className="space-y-4" data-testid="flight-delay-manager">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="overline text-aero-cyan">Operations Schedule Control</div>
          <h2 className="font-display text-xl font-bold">Flight Schedule & Delay Management</h2>
          <p className="text-xs text-aero-t2 mt-0.5">
            Manage flight delays and propagate updated timetables live to the passenger portal, baggage carousel matrices, and alerts feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg border border-aero-border bg-aero-surface text-center">
            <span className="text-[10px] text-aero-t3 block uppercase">Total Active</span>
            <span className="font-mono font-bold text-sm text-aero-t1">{stats.total}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-aero-amber/40 bg-aero-amber/10 text-center">
            <span className="text-[10px] text-aero-amber block uppercase">Delayed</span>
            <span className="font-mono font-bold text-sm text-aero-amber">{stats.delayed}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-aero-emerald/40 bg-aero-emerald/10 text-center">
            <span className="text-[10px] text-aero-emerald block uppercase">On Time</span>
            <span className="font-mono font-bold text-sm text-aero-emerald">{stats.onTime}</span>
          </div>
          <button onClick={loadFlights} disabled={loading} className="w-9 h-9 grid place-items-center rounded-lg border border-aero-border hover:border-aero-cyan/40 text-aero-t2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-aero-cyan" : ""}`} />
          </button>
        </div>
      </div>

      {}
      <div className="aero-card p-3 rounded-xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-aero-t3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="Search flight number (e.g. AI-102, 6E-204) or route..."
            className="pl-9 h-9 text-sm bg-aero-surface border-aero-border"
          />
        </div>

        {}
        <Select value={dirFilter} onValueChange={setDirFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs bg-aero-surface border-aero-border">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="departure">🛫 Departures</SelectItem>
            <SelectItem value="arrival">🛬 Arrivals</SelectItem>
          </SelectContent>
        </Select>

        {}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs bg-aero-surface border-aero-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="delayed">⚠️ Delayed Only</SelectItem>
            <SelectItem value="scheduled">⏱️ Scheduled</SelectItem>
          </SelectContent>
        </Select>

        {}
        <div className="relative w-[145px]">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="ops-flight-date-btn"
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
                  Reset to Today
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {(q || dirFilter !== "all" || statusFilter !== "all" || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setDirFilter("all"); setStatusFilter("all"); setDateFilter(""); }} className="text-xs text-aero-t3 hover:text-aero-cyan h-9">
            Clear
          </Button>
        )}
      </div>

      {}
      <div className="aero-card rounded-xl overflow-hidden border border-aero-border shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-aero-surface border-b border-aero-border text-aero-t3 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-4 py-3">Flight</th>
                <th className="px-4 py-3">Airline & Route</th>
                <th className="px-4 py-3">Scheduled Time</th>
                <th className="px-4 py-3">Expected Time</th>
                <th className="px-4 py-3">Status / Delay Reason</th>
                <th className="px-4 py-3">Gate / Belt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aero-border/60 font-medium">
              {flights.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-aero-t3">
                    {loading ? "Loading flight schedules…" : "No flights found matching the criteria."}
                  </td>
                </tr>
              ) : (
                flights.map((f) => {
                  const isDelayed = f.status === "delayed" || (f.flight_delay_minutes && f.flight_delay_minutes > 0);
                  const isDep = f.direction === "departure";
                  const schedTime = f.std || f.sta;
                  const expTime = isDep ? (f.etd || f.std) : (f.eta || f.ata || f.sta);

                  return (
                    <tr key={f.flight_id} className={`hover:bg-aero-surface/60 transition-colors ${isDelayed ? "bg-amber-500/[0.03]" : ""}`}>
                      <td className="px-4 py-3 font-mono font-bold text-aero-t1">
                        <div className="flex items-center gap-2">
                          <Plane className={`w-3.5 h-3.5 text-aero-cyan ${isDep ? "rotate-45" : "rotate-[135deg]"}`} />
                          <span>{f.flight_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-aero-t2">
                        <div className="font-semibold text-aero-t1">{f.airline_name || f.airline_code}</div>
                        <div className="text-[11px] text-aero-t3 flex items-center gap-1">
                          {f.origin} <ArrowRight className="w-3 h-3 inline" /> {f.destination}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={isDelayed ? "line-through text-aero-t3" : "text-aero-t1"}>
                          {fmtTime(schedTime)}
                        </span>
                        <span className="block text-[10px] text-aero-t3">{fmtDateTimeWithNextDay(schedTime).split(",")[0]}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className={isDelayed ? "text-amber-400 font-bold text-sm" : "text-aero-t2"}>
                          {fmtTime(expTime)}
                        </span>
                        <span className="block text-[10px] text-aero-t3">{fmtDateTimeWithNextDay(expTime).split(",")[0]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isDelayed ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" /> +{f.flight_delay_minutes || 30}M DELAY
                            </span>
                            {f.delay_reason && (
                              <div className="text-[10px] text-aero-t3 truncate max-w-[180px]" title={f.delay_reason}>
                                {f.delay_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> ON TIME
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-aero-t2">
                        <div>Gate: <span className="text-aero-t1 font-bold">{f.gate || "—"}</span></div>
                        <div className="text-[10px] text-aero-t3">Belt: {f.carousel_number || "TBD"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFlight(f);
                              setDelayMinutes(30);
                              setDelayReason(f.delay_reason || REASONS[0]);
                            }}
                            className="h-8 text-xs font-semibold border-aero-cyan/40 text-aero-cyan hover:bg-aero-cyan/10">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {isDelayed ? "Adjust Delay" : "+ Delay Flight"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {}
      <Dialog open={!!selectedFlight} onOpenChange={(open) => !open && setSelectedFlight(null)}>
        <DialogContent className="data-[theme=light]:bg-white data-[theme=dark]:bg-[#0E131F] border border-aero-border max-w-[92vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Apply Operational Flight Delay · {selectedFlight?.flight_number}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedFlight && (
            <div className="space-y-4 py-2 text-sm text-aero-t2">
              {}
              <div className="p-3 rounded-xl border border-aero-border bg-aero-surface/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-base text-aero-t1">{selectedFlight.flight_number} · {selectedFlight.airline_name}</div>
                  <div className="text-xs text-aero-t3">{selectedFlight.origin} → {selectedFlight.destination}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-aero-t3">Scheduled (STD/STA)</div>
                  <div className="font-bold text-aero-t1">{fmtTime(selectedFlight.std || selectedFlight.sta)}</div>
                </div>
              </div>

              {}
              <div>
                <label className="block text-xs font-bold uppercase text-aero-t1 mb-2">
                  Additional Delay Time (Minutes)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDelayMinutes(p)}
                      className={`py-2 rounded-lg text-xs font-bold font-mono transition-all border ${delayMinutes === p ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500 dark:border-amber-400 shadow-sm" : "border-aero-border bg-aero-surface hover:border-aero-cyan/40 text-aero-t2"}`}>
                      +{p}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-aero-t3">Custom minutes:</span>
                  <Input
                    type="number"
                    min="1"
                    max="600"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-24 h-8 font-mono text-sm"
                  />
                </div>
              </div>

              {}
              <div>
                <label className="block text-xs font-bold uppercase text-aero-t1 mb-1.5">
                  Primary Operational Reason
                </label>
                <Select value={delayReason} onValueChange={setDelayReason}>
                  <SelectTrigger className="w-full h-9 bg-aero-surface border-aero-border text-xs">
                    <SelectValue placeholder="Select delay category" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {}
              <div>
                <label className="block text-xs font-bold uppercase text-aero-t1 mb-1.5">
                  Optional Public Notice / Note
                </label>
                <Input
                  placeholder="e.g. ATC departure slot delay assigned for Delhi runway 29L"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="h-9 text-xs bg-aero-surface border-aero-border"
                />
              </div>

              {}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-400 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Real-time Operational Propagation:</span>
                </div>
                <p className="text-aero-t2 text-[11px]">
                  Saving this delay will update the passenger portal departure timing, shift estimated baggage reclaim windows, and generate an operations log alert automatically.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setSelectedFlight(null)} disabled={submitting} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleApplyDelay} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs">
              {submitting ? "Updating Timetable…" : `Confirm +${delayMinutes}m Flight Delay`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
