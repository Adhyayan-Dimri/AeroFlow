import React, { useState, useEffect } from "react";
import { Plane, ArrowUp, ArrowDown, Clock, Search, X } from "lucide-react";
import api from "@/lib/api";
import { fmtTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FidsBoard() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState("departures");

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/flights/search");
      console.log("FIDS flights response:", data);
      setFlights(data.flights || []);
    } catch (e) {
      console.error("Failed to load flights:", e);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFlights = flights.filter(f =>
    (view === "departures" ? f.direction === "departure" : f.direction === "arrival") &&
    (f.flight_number.toLowerCase().includes(filter.toLowerCase()) ||
    f.airline_name.toLowerCase().includes(filter.toLowerCase()) ||
    f.origin.toLowerCase().includes(filter.toLowerCase()) ||
    f.destination.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black">Flight Information Display</h2>
          <p className="text-sm text-aero-t2">Live flight status for Indira Gandhi International Airport (T3)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "departures" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("departures")}
            className={view === "departures" ? "bg-aero-cyan text-[#041014]" : "text-aero-t2"}
          >
            <ArrowUp className="w-4 h-4 mr-1" /> Departures
          </Button>
          <Button
            variant={view === "arrivals" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("arrivals")}
            className={view === "arrivals" ? "bg-aero-cyan text-[#041014]" : "text-aero-t2"}
          >
            <ArrowDown className="w-4 h-4 mr-1" /> Arrivals
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aero-t3" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by flight number, airline, or city..."
          className="pl-10 bg-aero-surface border-aero-border"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-aero-t3 hover:text-aero-t1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-aero-t2">
          <Clock className="w-5 h-5 animate-spin mr-2" /> Loading flights...
        </div>
      ) : (
        <>
          <div className="text-xs text-aero-t3 mb-2">
            Loaded {flights.length} flights total. Showing {filteredFlights.length} {view}.
          </div>
          <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-aero-border bg-aero-surface/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">Flight</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">Airline</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">
                    {view === "departures" ? "Destination" : "Origin"}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">
                    {view === "departures" ? "STD" : "STA"}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">Gate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-aero-t3 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-aero-t3">
                      No flights found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight) => (
                    <tr key={flight.flight_id} className="border-b border-aero-border/50 hover:bg-aero-surface/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-aero-t1">{flight.flight_number}</div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded inline-block mt-1 ${
                          flight.is_international ? "bg-aero-blue/15 text-aero-blue" : "bg-aero-emerald/15 text-aero-emerald"
                        }`}>
                          {flight.is_international ? "INTL" : "DOM"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-aero-t2">{flight.airline_name}</td>
                      <td className="px-4 py-3 text-sm text-aero-t1 font-medium">
                        {view === "departures" ? flight.destination : flight.origin}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-aero-t1">
                        {fmtTime(view === "departures" ? flight.std : flight.sta)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-aero-t1">{flight.gate || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-aero-emerald">
                          <span className="w-2 h-2 rounded-full bg-aero-emerald animate-pulse" />
                          On Time
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
