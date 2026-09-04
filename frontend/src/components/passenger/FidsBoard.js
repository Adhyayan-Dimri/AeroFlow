import React, { useState, useEffect, useMemo } from "react";
import { Plane, ArrowUp, ArrowDown, Clock, Search, X, Filter, Sparkles, RefreshCw, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { fmtTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRESET_HOURS = [
  { label: "All Flights", value: "" },
  { label: "Next 1h", value: "1" },
  { label: "Next 2h", value: "2" },
  { label: "Next 4h", value: "4" },
  { label: "Next 8h", value: "8" },
];

export default function FidsBoard({ onSelectFlight }) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [hoursFilter, setHoursFilter] = useState("");
  const [view, setView] = useState("departures");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    loadFlights();
    const interval = setInterval(() => {
      loadFlights(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFlights = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get("/flights/search", { params: { limit: 120 } });
      setFlights(data.flights || []);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Failed to load FIDS flights:", e);
      if (showLoading) setFlights([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filteredFlights = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const parsedHours = parseFloat(hoursFilter);
    const hasHourFilter = !isNaN(parsedHours) && parsedHours > 0;
    const nowMs = Date.now();
    const maxMs = hasHourFilter ? nowMs + parsedHours * 60 * 60 * 1000 : null;
    const minMs = hasHourFilter ? nowMs - 15 * 60 * 1000 : null; // Include flights departing in last 15 min

    return flights.filter((flight) => {
      const isDep = flight.direction === "departure";
      if (view === "departures" && !isDep) return false;
      if (view === "arrivals" && isDep) return false;

      // Text search matching
      if (q) {
        const num = (flight.flight_number || "").toLowerCase();
        const airline = (flight.airline_name || "").toLowerCase();
        const origin = (flight.origin || "").toLowerCase();
        const dest = (flight.destination || "").toLowerCase();
        const gate = (flight.gate || "").toLowerCase();
        if (!num.includes(q) && !airline.includes(q) && !origin.includes(q) && !dest.includes(q) && !gate.includes(q)) {
          return false;
        }
      }

      // Time window filtering
      if (hasHourFilter) {
        const timeStr = isDep ? (flight.etd || flight.std) : (flight.eta || flight.ata || flight.sta);
        if (!timeStr) return false;
        const flightTimeMs = new Date(timeStr).getTime();
        if (isNaN(flightTimeMs)) return false;

        if (flightTimeMs < minMs || flightTimeMs > maxMs) {
          return false;
        }
      }

      return true;
    });
  }, [flights, filter, view, hoursFilter]);

  return (
    <div className="space-y-4" data-testid="fids-board-container">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-aero-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-black tracking-tight text-aero-t1">
              Live Flight Information Display (FIDS)
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-aero-t2 mt-0.5">
            Real-time terminal departures, arrivals, gate allocations, and on-time telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-aero-surface border border-aero-border rounded-lg p-0.5">
            <Button
              variant={view === "departures" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("departures")}
              className={`h-8 px-3 text-xs font-semibold ${view === "departures" ? "bg-aero-cyan text-[#041014] shadow-sm" : "text-aero-t2 hover:text-aero-t1"}`}
            >
              <PlaneTakeoff className="w-3.5 h-3.5 mr-1.5" /> Departures
            </Button>
            <Button
              variant={view === "arrivals" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("arrivals")}
              className={`h-8 px-3 text-xs font-semibold ${view === "arrivals" ? "bg-aero-cyan text-[#041014] shadow-sm" : "text-aero-t2 hover:text-aero-t1"}`}
            >
              <PlaneLanding className="w-3.5 h-3.5 mr-1.5" /> Arrivals
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFlights(true)}
            className="h-8 text-xs border-aero-border text-aero-t2 hover:text-aero-cyan hover:border-aero-cyan/40"
            title="Refresh FIDS"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar with Search and Custom Hour Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aero-t3" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search flight #, airline, destination, or gate..."
            className="pl-9 pr-8 h-9 text-xs bg-aero-surface border-aero-border focus:border-aero-cyan/50"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-aero-t3 hover:text-aero-t1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Time Window (Hours) Number Input Box */}
        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-aero-cyan" />
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={hoursFilter}
              onChange={(e) => setHoursFilter(e.target.value)}
              placeholder="Hours (e.g. 2)..."
              className="pl-8 pr-7 h-9 text-xs bg-aero-surface border-aero-border focus:border-aero-cyan/50 font-mono"
            />
            {hoursFilter && (
              <button
                onClick={() => setHoursFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-aero-t3 hover:text-aero-cyan"
                title="Clear hour filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {PRESET_HOURS.map((preset) => {
              const isActive = hoursFilter === preset.value;
              return (
                <button
                  key={preset.label}
                  onClick={() => setHoursFilter(preset.value)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-aero-cyan/20 text-aero-cyan border border-aero-cyan/50 font-bold"
                      : "bg-aero-surface border border-aero-border/80 text-aero-t3 hover:text-aero-t1 hover:border-aero-cyan/30"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Status Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-aero-t3 font-mono">
        <div>
          Showing <span className="text-aero-cyan font-bold">{filteredFlights.length}</span> {view}
          {hoursFilter && parseFloat(hoursFilter) > 0 ? (
            <span> for the next <strong className="text-aero-cyan">{hoursFilter} hour{parseFloat(hoursFilter) > 1 ? "s" : ""}</strong> only</span>
          ) : (
            <span> (all scheduled time slots)</span>
          )}
        </div>
        <div className="text-[11px] text-aero-t3">
          Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Main Flights Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-aero-t2 aero-card">
          <Clock className="w-6 h-6 animate-spin text-aero-cyan mb-2" />
          <div className="text-sm font-semibold">Updating Live FIDS Telemetry...</div>
          <div className="text-xs text-aero-t3">Fetching latest departures & gate allocations</div>
        </div>
      ) : (
        <div className="rounded-xl border border-aero-border overflow-hidden bg-aero-surface/60 backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-aero-border bg-aero-surface/80 text-[11px] font-bold text-aero-t3 uppercase tracking-wider">
                  <th className="px-4 py-3">Flight</th>
                  <th className="px-4 py-3">Airline</th>
                  <th className="px-4 py-3">{view === "departures" ? "Destination" : "Origin"}</th>
                  <th className="px-4 py-3 font-mono">{view === "departures" ? "STD (Sched)" : "STA (Sched)"}</th>
                  <th className="px-4 py-3 font-mono">{view === "departures" ? "ETD (Live)" : "ETA (Live)"}</th>
                  <th className="px-4 py-3">Gate</th>
                  {view === "arrivals" && <th className="px-4 py-3">Belt</th>}
                  <th className="px-4 py-3">Status</th>
                  {onSelectFlight && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-aero-border/50 font-sans">
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan={view === "arrivals" ? 9 : 8} className="text-center py-12 text-aero-t3">
                      <Plane className="w-8 h-8 mx-auto text-aero-t3/40 mb-2" />
                      <p className="text-sm font-medium">No flights found matching your filter criteria.</p>
                      {hoursFilter && (
                        <button
                          onClick={() => setHoursFilter("")}
                          className="mt-2 text-xs text-aero-cyan underline hover:text-cyan-300"
                        >
                          Clear time window to view all flights
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight) => {
                    const isDep = flight.direction === "departure";
                    const isDelayed = (flight.flight_delay_minutes && flight.flight_delay_minutes > 0) || flight.status === "delayed";
                    const schedTime = isDep ? flight.std : flight.sta;
                    const liveTime = isDep ? (flight.etd || flight.std) : (flight.eta || flight.ata || flight.sta);

                    return (
                      <tr
                        key={flight.flight_id}
                        onClick={() => onSelectFlight && onSelectFlight(flight)}
                        className={`hover:bg-aero-cyan/[0.04] transition-colors ${
                          onSelectFlight ? "cursor-pointer group" : ""
                        }`}
                      >
                        {/* Flight Number & Intl Tag */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-aero-t1 group-hover:text-aero-cyan transition-colors">
                            {flight.flight_number}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                              flight.is_international ? "bg-aero-blue/15 text-aero-blue border border-aero-blue/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {flight.is_international ? "INTL" : "DOM"}
                            </span>
                            {flight.aircraft_type && (
                              <span className="text-[10px] text-aero-t3 font-mono">
                                {flight.aircraft_type}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Airline */}
                        <td className="px-4 py-3 text-xs sm:text-sm text-aero-t2 font-medium">
                          {flight.airline_name || flight.airline_code}
                        </td>

                        {/* Route (Destination/Origin) */}
                        <td className="px-4 py-3 text-xs sm:text-sm text-aero-t1 font-semibold">
                          {view === "departures" ? flight.destination : flight.origin}
                        </td>

                        {/* Sched Time */}
                        <td className="px-4 py-3 font-mono text-xs text-aero-t3">
                          {fmtTime(schedTime)}
                        </td>

                        {/* Live / Estimated Time */}
                        <td className="px-4 py-3 font-mono text-xs">
                          <span className={isDelayed ? "text-amber-400 font-bold" : "text-aero-t1 font-semibold"}>
                            {fmtTime(liveTime)}
                          </span>
                        </td>

                        {/* Gate */}
                        <td className="px-4 py-3 font-mono text-xs">
                          {flight.gate ? (
                            <span className="px-2 py-0.5 rounded bg-aero-surface border border-aero-border text-aero-cyan font-bold">
                              {flight.gate}
                            </span>
                          ) : (
                            <span className="text-aero-t3">—</span>
                          )}
                        </td>

                        {/* Carousel Belt for Arrivals */}
                        {view === "arrivals" && (
                          <td className="px-4 py-3 font-mono text-xs">
                            {flight.carousel_number ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 font-bold">
                                Belt {flight.carousel_number}
                              </span>
                            ) : (
                              <span className="text-aero-t3">TBD</span>
                            )}
                          </td>
                        )}

                        {/* Operational Status */}
                        <td className="px-4 py-3">
                          {isDelayed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Delayed +{flight.flight_delay_minutes || 20}m
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              On Time
                            </span>
                          )}
                        </td>

                        {/* Action CTA if clickable */}
                        {onSelectFlight && (
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-semibold text-aero-cyan opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                              View Journey →
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
