import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plane, ArrowRight, PlaneTakeoff, PlaneLanding, MapPin, Calendar as CalendarIcon, AlertCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtTime, fmtDateTime } from "@/lib/format";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationMap from "./LocationMap";
import { getAirlineTheme } from "./BoardingPassDossier";

const QUICK = ["AI", "6E", "UK", "EK", "SG", "BA"];
const AIRLINE_NAMES = { AI: "Air India", "6E": "IndiGo", UK: "Vistara", EK: "Emirates", SG: "SpiceJet", BA: "British Airways" };
const PERIODS = [["", "Any time"], ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"]];

export default function FlightSearchHero({ onSelect, onLocationChange }) {
  const [q, setQ] = useState("");
  const [dir, setDir] = useState("");
  const [period, setPeriod] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [locationPermission, setLocationPermission] = useState("prompt");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxAllowedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const maxAllowedDateStr = useMemo(() => {
    const year = maxAllowedDate.getFullYear();
    const month = String(maxAllowedDate.getMonth() + 1).padStart(2, "0");
    const day = String(maxAllowedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [maxAllowedDate]);

  const maxAllowedDateFormatted = useMemo(() => {
    const day = String(maxAllowedDate.getDate()).padStart(2, "0");
    const month = String(maxAllowedDate.getMonth() + 1).padStart(2, "0");
    const year = maxAllowedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }, [maxAllowedDate]);

  const isDateBeyondLimit = useMemo(() => {
    if (!date) return false;
    let isoDate = date;
    if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      isoDate = `${year}-${month}-${day}`;
    }
    return isoDate > maxAllowedDateStr;
  }, [date, maxAllowedDateStr]);

  useEffect(() => {
    let alive = true;
    if (isDateBeyondLimit) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        let formattedDate = date;
        if (date && date.includes('/')) {
          const [day, month, year] = date.split('/');
          formattedDate = `${year}-${month}-${day}`;
        }
        const { data } = await api.get("/flights/search", { params: { number: q || undefined, direction: dir || undefined, period: period || undefined, date: formattedDate || undefined, limit: 14 } });
        if (alive) {
          setResults(data.flights || []);
        }
      } finally { if (alive) setLoading(false); }
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [q, dir, period, date, isDateBeyondLimit]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermission("denied");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude},${position.coords.longitude}`;
        setLocation(coords);
        setLocationPermission("granted");
        setDetectingLocation(false);
        if (onLocationChange) onLocationChange(coords);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationPermission("denied");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative z-30" ref={containerRef}>
      <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 glow-cyan" data-testid="flight-search-box">
        <div className="flex-1 flex items-center gap-3 px-4 py-3">
          <Search className="w-5 h-5 text-aero-cyan" />
          <input
            data-testid="flight-search-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value.toUpperCase());
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search flight number e.g. AI102, 6E2341, EK512"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-aero-t3 font-medium"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                setIsOpen(false);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-aero-border p-1 self-stretch sm:self-auto">
          {[["", "All"], ["departure", "Depart"], ["arrival", "Arrive"]].map(([v, l]) => (
            <button key={v} data-testid={`search-dir-${v || "all"}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { setDir(v); setIsOpen(true); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${dir === v ? "bg-aero-cyan text-[#041014]" : "text-aero-t2 hover:text-aero-t1"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {locationPermission === "prompt" && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-aero-cyan" />
            <button
              onClick={requestLocation}
              disabled={detectingLocation}
              className="flex-1 bg-aero-surface border border-aero-border rounded-lg px-3 py-2 text-sm text-left outline-none focus:border-aero-cyan/50 hover:border-aero-cyan/30 transition-colors"
            >
              {detectingLocation ? "Detecting location..." : "📍 Allow location access for accurate travel time"}
            </button>
          </div>
        )}
        {locationPermission === "granted" && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-aero-emerald" />
            <input
              data-testid="location-input"
              value={location}
              onChange={(e) => { setLocation(e.target.value); if (onLocationChange) onLocationChange(e.target.value); }}
              placeholder="Location detected automatically"
              className="flex-1 bg-aero-surface border border-aero-emerald/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-aero-emerald/70 placeholder:text-aero-t3 text-aero-emerald"
            />
          </div>
        )}
        {locationPermission === "denied" && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-aero-t3" />
            <div className="flex-1 bg-aero-surface border border-aero-border rounded-lg px-3 py-2 text-sm text-aero-t3">
              Location access denied. Using standard city traffic (45 mins)
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 relative z-20">
        <Select value={q && QUICK.includes(q) ? q : "all"} onValueChange={(v) => { setQ(v === "all" ? "" : v); setIsOpen(true); }}>
          <SelectTrigger data-testid="filter-airline" className="w-[150px] h-9 bg-aero-surface border-aero-border text-sm"><SelectValue placeholder="All airlines" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All airlines</SelectItem>
            {QUICK.map((c) => <SelectItem key={c} value={c}>{AIRLINE_NAMES[c] || c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period || "any"} onValueChange={(v) => { setPeriod(v === "any" ? "" : v); setIsOpen(true); }}>
          <SelectTrigger data-testid="filter-time" className="w-[140px] h-9 bg-aero-surface border-aero-border text-sm"><SelectValue placeholder="Any time" /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(([v, l]) => <SelectItem key={v || "any"} value={v || "any"}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-[145px]">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                data-testid="filter-date"
                className="h-9 w-full rounded-md bg-aero-surface border border-aero-border text-sm px-2.5 text-aero-t1 outline-none focus:border-aero-cyan/50 flex items-center justify-between"
              >
                {date ? date : "DD/MM/YYYY"}
                <CalendarIcon className="w-4 h-4 text-aero-t3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date ? (date.includes('/') ? new Date(`${date.split('/')[2]}-${date.split('/')[1]}-${date.split('/')[0]}`) : new Date(date)) : undefined}
                onSelect={(selectedDate) => {
                  if (selectedDate) {
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const year = selectedDate.getFullYear();
                    const formatted = `${day}/${month}/${year}`;
                    const isoDate = `${year}-${month}-${day}`;
                    setDate(formatted);
                    setIsOpen(true);

                    if (isoDate > maxAllowedDateStr) {
                      toast.info(
                        `Schedule notice for ${formatted}: Flight schedule data is currently available only for the next 5 days (till ${maxAllowedDateFormatted}). Schedules for ${formatted} will be added later.`,
                        { duration: 5000 }
                      );
                    }
                  } else {
                    setDate('');
                  }
                  setCalendarOpen(false);
                }}
                initialFocus
              />
              <div className="px-3 py-2 border-t border-aero-border bg-aero-surface/80 text-[11px] text-aero-t2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-aero-cyan shrink-0" />
                <span>Available range: <strong className="text-aero-cyan font-mono">{maxAllowedDateFormatted}</strong> (next 5 days)</span>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {(q || period || date) && (
          <button data-testid="filter-clear" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setPeriod(""); setDate(""); setIsOpen(false); }}
            className="text-xs text-aero-t3 hover:text-aero-cyan px-2">Clear</button>
        )}
      </div>

      {isDateBeyondLimit && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-xs sm:text-sm text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 p-3.5 rounded-xl flex items-start sm:items-center gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-bold">Schedule Notice for {date}: </span>
            <span>
              Flight schedule data is currently available only for the next 5 days from today (till {maxAllowedDateFormatted}). Schedules for further dates will be added later.
            </span>
          </div>
        </motion.div>
      )}

      {isOpen && results.length > 0 && !isDateBeyondLimit && (
        <div className="mt-3 aero-card divide-y divide-aero-border max-h-[380px] overflow-auto relative z-40 shadow-xl" data-testid="flight-results">
          {results.map((f) => {
            const Dir = f.direction === "departure" ? PlaneTakeoff : PlaneLanding;
            const isDelayed = f.status === "delayed" || (f.flight_delay_minutes && f.flight_delay_minutes > 0);
            const isDep = f.direction === "departure";
            const schedTime = f.std || f.sta;
            const expTime = isDep ? (f.etd || f.std) : (f.eta || f.ata || f.sta);
            const theme = getAirlineTheme(f.airline_code, f.flight_number);

            return (
              <button key={f.flight_id} data-testid={`flight-result-${f.flight_number}`}
                onClick={() => {
                  onSelect(f, location, true);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 text-left hover:bg-aero-elevated/60 transition-all group cursor-pointer ${isDelayed ? "bg-amber-500/[0.03]" : ""}`}>
                <div className={`w-10 h-10 rounded-xl ${theme.accentBg} border ${theme.accentBorder} grid place-items-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                  <Dir className={`w-5 h-5 ${theme.accentText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-black ${theme.pillBg}`}>
                      {f.flight_number}
                    </span>
                    <span className="text-xs text-aero-t2 font-medium truncate max-w-[120px] sm:max-w-none">{f.airline_name}</span>
                    <span className={`text-[10px] px-1.5 rounded font-mono font-bold ${f.is_international ? "bg-blue-100 text-blue-800 dark:bg-aero-blue/15 dark:text-aero-blue" : "bg-emerald-100 text-emerald-800 dark:bg-aero-emerald/15 dark:text-aero-emerald"}`}>
                      {f.is_international ? "INTL" : "DOM"}
                    </span>
                    {isDelayed && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-400 dark:border-amber-500/40">
                        +{f.flight_delay_minutes}M DELAY
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-aero-t2 truncate mt-0.5">{f.origin} <ArrowRight className="w-3 h-3 inline text-aero-t3" /> {f.destination}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold tabular text-sm sm:text-base ${isDelayed ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                    {fmtTime(expTime)}
                  </div>
                  {isDelayed ? (
                    <div className="text-[10px] text-aero-t3 line-through font-mono">{fmtTime(schedTime)}</div>
                  ) : (
                    <div className="text-[10px] text-aero-t3">{fmtDateTime(schedTime).split(",")[0]}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {loading && q && results.length === 0 && <div className="mt-3 text-sm text-aero-t3 px-2">Searching…</div>}
      {!loading && (date || q) && results.length === 0 && (
        <div className="mt-3 text-sm text-aero-amber px-2">
          No matching flights found for this query.
        </div>
      )}

      {locationPermission === "granted" && <LocationMap userCoords={location} />}
    </div>
  );
}
