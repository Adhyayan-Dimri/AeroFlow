import React, { useMemo, useState, useEffect } from "react";
import { Plane, ArrowRight, Bookmark, Bell, X, Clock, MapPin, ShieldCheck, Sparkles, Navigation, Luggage, CheckCircle2, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmtTime, fmtDateTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

export const AIRLINE_THEMES = {
  AI: {
    name: "Air India",
    code: "AI",
    bgGradient: "from-[#B91C1C] via-[#991B1B] to-[#7F1D1D]",
    lightHeader: "from-red-600 via-red-700 to-red-800",
    accentBg: "bg-red-500/10 dark:bg-red-950/40",
    accentBorder: "border-red-500/40",
    accentText: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-600 text-white",
    glow: "shadow-red-500/20",
    pillBg: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    ringColor: "ring-red-500/30",
    highlightColor: "#EF4444",
    goldAccent: "text-amber-400",
    tagline: "Maharajah Experience",
  },
  "6E": {
    name: "IndiGo",
    code: "6E",
    bgGradient: "from-[#002060] via-[#0284C7] to-[#0369A1]",
    lightHeader: "from-[#002060] via-[#0284C7] to-[#0369A1]",
    accentBg: "bg-sky-500/10 dark:bg-sky-950/40",
    accentBorder: "border-sky-500/40",
    accentText: "text-sky-600 dark:text-sky-400",
    badgeBg: "bg-[#002060] text-white",
    glow: "shadow-sky-500/20",
    pillBg: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30",
    ringColor: "ring-sky-500/30",
    highlightColor: "#0284C7",
    goldAccent: "text-sky-300",
    tagline: "India's Preferred On-Time Airline",
  },
  UK: {
    name: "Vistara",
    code: "UK",
    bgGradient: "from-[#581845] via-[#7B1FA2] to-[#4A154B]",
    lightHeader: "from-[#581845] via-[#7B1FA2] to-[#4A154B]",
    accentBg: "bg-purple-500/10 dark:bg-purple-950/40",
    accentBorder: "border-purple-500/40",
    accentText: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-[#581845] text-amber-300 border border-amber-400/40",
    glow: "shadow-purple-500/20",
    pillBg: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
    ringColor: "ring-purple-500/30",
    highlightColor: "#A855F7",
    goldAccent: "text-amber-300",
    tagline: "Fly the New Feeling",
  },
  SG: {
    name: "SpiceJet",
    code: "SG",
    bgGradient: "from-[#C2410C] via-[#EA580C] to-[#D97706]",
    lightHeader: "from-[#C2410C] via-[#EA580C] to-[#D97706]",
    accentBg: "bg-orange-500/10 dark:bg-orange-950/40",
    accentBorder: "border-orange-500/40",
    accentText: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-[#EA580C] text-white",
    glow: "shadow-orange-500/20",
    pillBg: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
    ringColor: "ring-orange-500/30",
    highlightColor: "#EA580C",
    goldAccent: "text-yellow-400",
    tagline: "Red. Hot. Spicy.",
  },
  QP: {
    name: "Akasa Air",
    code: "QP",
    bgGradient: "from-[#F97316] via-[#EA580C] to-[#0284C7]",
    lightHeader: "from-[#F97316] via-[#EA580C] to-[#0284C7]",
    accentBg: "bg-orange-500/10 dark:bg-orange-950/40",
    accentBorder: "border-orange-500/40",
    accentText: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-[#F97316] text-white",
    glow: "shadow-orange-500/20",
    pillBg: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
    ringColor: "ring-orange-500/30",
    highlightColor: "#F97316",
    goldAccent: "text-orange-300",
    tagline: "It's Your Sky",
  },
  EK: {
    name: "Emirates",
    code: "EK",
    bgGradient: "from-[#991B1B] via-[#B91C1C] to-[#78350F]",
    lightHeader: "from-[#991B1B] via-[#B91C1C] to-[#78350F]",
    accentBg: "bg-red-500/10 dark:bg-red-950/40",
    accentBorder: "border-amber-500/40",
    accentText: "text-red-600 dark:text-red-400",
    badgeBg: "bg-[#D71921] text-amber-200 border border-amber-400/40",
    glow: "shadow-red-500/20",
    pillBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    ringColor: "ring-amber-500/30",
    highlightColor: "#DC2626",
    goldAccent: "text-amber-400",
    tagline: "Fly Better · Dubai Route",
  },
  BA: {
    name: "British Airways",
    code: "BA",
    bgGradient: "from-[#002D62] via-[#075AAA] to-[#B91C1C]",
    lightHeader: "from-[#002D62] via-[#075AAA] to-[#B91C1C]",
    accentBg: "bg-blue-500/10 dark:bg-blue-950/40",
    accentBorder: "border-blue-500/40",
    accentText: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-[#002D62] text-white",
    glow: "shadow-blue-500/20",
    pillBg: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
    ringColor: "ring-blue-500/30",
    highlightColor: "#2563EB",
    goldAccent: "text-blue-300",
    tagline: "To Fly. To Serve.",
  },
  QR: {
    name: "Qatar Airways",
    code: "QR",
    bgGradient: "from-[#5C0632] via-[#831843] to-[#4A044E]",
    lightHeader: "from-[#5C0632] via-[#831843] to-[#4A044E]",
    accentBg: "bg-pink-500/10 dark:bg-pink-950/40",
    accentBorder: "border-pink-500/40",
    accentText: "text-pink-600 dark:text-pink-400",
    badgeBg: "bg-[#5C0632] text-white",
    glow: "shadow-pink-500/20",
    pillBg: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
    ringColor: "ring-pink-500/30",
    highlightColor: "#DB2777",
    goldAccent: "text-pink-300",
    tagline: "World's Best Airline",
  },
  SQ: {
    name: "Singapore Airlines",
    code: "SQ",
    bgGradient: "from-[#00266B] via-[#1E3A8A] to-[#D97706]",
    lightHeader: "from-[#00266B] via-[#1E3A8A] to-[#D97706]",
    accentBg: "bg-indigo-500/10 dark:bg-indigo-950/40",
    accentBorder: "border-indigo-500/40",
    accentText: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-[#00266B] text-amber-300 border border-amber-400/40",
    glow: "shadow-indigo-500/20",
    pillBg: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    ringColor: "ring-indigo-500/30",
    highlightColor: "#4F46E5",
    goldAccent: "text-amber-300",
    tagline: "A Great Way to Fly",
  },
  LH: {
    name: "Lufthansa",
    code: "LH",
    bgGradient: "from-[#05164D] via-[#1E3A8A] to-[#D97706]",
    lightHeader: "from-[#05164D] via-[#1E3A8A] to-[#D97706]",
    accentBg: "bg-blue-500/10 dark:bg-blue-950/40",
    accentBorder: "border-blue-500/40",
    accentText: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-[#05164D] text-amber-400",
    glow: "shadow-blue-500/20",
    pillBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    ringColor: "ring-blue-500/30",
    highlightColor: "#2563EB",
    goldAccent: "text-amber-400",
    tagline: "Say Yes to the World",
  },
  DEFAULT: {
    name: "AeroFlow Premium",
    code: "AF",
    bgGradient: "from-cyan-600 via-sky-600 to-blue-700",
    lightHeader: "from-cyan-600 via-sky-600 to-blue-700",
    accentBg: "bg-cyan-500/10 dark:bg-cyan-950/40",
    accentBorder: "border-cyan-500/40",
    accentText: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-600 text-white",
    glow: "shadow-cyan-500/20",
    pillBg: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    ringColor: "ring-cyan-500/30",
    highlightColor: "#06B6D4",
    goldAccent: "text-cyan-300",
    tagline: "Synchronized Terminal Flow",
  }
};

export function getAirlineTheme(airlineCode, flightNumber = "") {
  if (airlineCode && AIRLINE_THEMES[airlineCode.toUpperCase()]) {
    return AIRLINE_THEMES[airlineCode.toUpperCase()];
  }
  const prefix = flightNumber ? flightNumber.slice(0, 2).toUpperCase() : "";
  if (AIRLINE_THEMES[prefix]) {
    return AIRLINE_THEMES[prefix];
  }
  return AIRLINE_THEMES.DEFAULT;
}

function estimateFlightDuration(origin = "DEL", destination = "BOM") {
  const routes = {
    "DEL-BOM": 130, "BOM-DEL": 130,
    "DEL-BLR": 165, "BLR-DEL": 165,
    "DEL-CCU": 135, "CCU-DEL": 135,
    "DEL-HYD": 130, "HYD-DEL": 130,
    "DEL-MAA": 170, "MAA-DEL": 170,
    "DEL-GOI": 150, "GOI-DEL": 150,
    "DEL-DXB": 230, "DXB-DEL": 220,
    "DEL-LHR": 550, "LHR-DEL": 510,
    "DEL-SIN": 330, "SIN-DEL": 330,
    "DEL-JFK": 960, "JFK-DEL": 900,
    "DEL-FRA": 510, "FRA-DEL": 480,
    "DEL-DOH": 250, "DOH-DEL": 240,
    "DEL-BKK": 260, "BKK-DEL": 260,
  };
  const key = `${(origin || "DEL").toUpperCase()}-${(destination || "BOM").toUpperCase()}`;
  return routes[key] || 140;
}

export default function BoardingPassDossier({ flight, forecast, onNotify, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const airlineCode = flight.airline_code || flight.flight_number?.slice(0, 2) || "AF";
  const theme = useMemo(() => getAirlineTheme(airlineCode, flight.flight_number), [airlineCode, flight.flight_number]);

  const isDelayed = flight.status === "delayed" || (flight.flight_delay_minutes && flight.flight_delay_minutes > 0);
  const isDep = flight.direction === "departure";
  const schedTime = flight.std || flight.sta;
  const expTime = isDep ? (flight.etd || flight.std) : (flight.eta || flight.ata || flight.sta);

  useEffect(() => {
    if (user && flight.flight_id) {
      api.get("/users/me/saved-flights")
        .then(({ data }) => {
          const ids = (data.flights || []).map((f) => f.flight_id);
          setIsSaved(ids.includes(flight.flight_id));
        })
        .catch(() => {});
    }
  }, [user, flight.flight_id]);

  const durationMins = useMemo(() => {
    return estimateFlightDuration(flight.origin, flight.destination);
  }, [flight.origin, flight.destination]);

  const durationFormatted = useMemo(() => {
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    return `${h}h ${m}m`;
  }, [durationMins]);

  const landingTimeFormatted = useMemo(() => {
    if (!isDep) {
      return fmtTime(expTime);
    }
    try {
      const depDate = new Date(expTime);
      if (!isNaN(depDate.getTime())) {
        const landDate = new Date(depDate.getTime() + durationMins * 60000);
        return fmtTime(landDate.toISOString());
      }
    } catch {}
    return "—";
  }, [isDep, expTime, durationMins]);

  const departureTimeFormatted = useMemo(() => {
    if (isDep) return fmtTime(expTime);
    try {
      const arrDate = new Date(expTime);
      if (!isNaN(arrDate.getTime())) {
        const takeoffDate = new Date(arrDate.getTime() - durationMins * 60000);
        return fmtTime(takeoffDate.toISOString());
      }
    } catch {}
    return "—";
  }, [isDep, expTime, durationMins]);

  const totalWaitMin = forecast?.total_wait_minutes || 14;
  const totalWalkMin = forecast?.total_walk_minutes || 8;
  const totalTransitMin = useMemo(() => {
    if (isDep) {
      return Math.round((forecast?.entry_wait_minutes ?? 4) + (forecast?.total_wait_minutes || 14) + (forecast?.total_walk_minutes || 8));
    }
    const immWait = forecast?.steps?.[0]?.wait_minutes || 0;
    const immWalk = forecast?.steps?.[0]?.walk_minutes || (flight.is_international ? 6 : 0);
    const firstMs = forecast?.baggage?.first_bag_time ? new Date(forecast.baggage.first_bag_time).getTime() : 0;
    const lastMs = forecast?.baggage?.last_bag_time ? new Date(forecast.baggage.last_bag_time).getTime() : 0;
    const beltMin = (firstMs && lastMs) ? Math.max(6, Math.round((lastMs - firstMs) / 60000)) : 8;
    return Math.round(3 + immWait + immWalk + beltMin + 4);
  }, [isDep, forecast, flight.is_international]);

  const checkinIsland = flight.is_international ? "Check-in Island C" : "Check-in Island A / B";
  const securityHall = flight.is_international ? "Security Intl" : "Security Domestic";
  const baggageCarousel = flight.carousel_number || forecast?.baggage?.carousel_number || "Carousel AC-04";

  const toggleSave = async () => {
    if (!user) {
      sessionStorage.setItem("pending_save_flight", JSON.stringify({ flight_id: flight.flight_id, flight_number: flight.flight_number }));
      toast.info("Please sign in to save this flight to your account");
      navigate(`/login?type=passenger&save_flight=${flight.flight_id}&next=${encodeURIComponent("/?flight=" + flight.flight_number)}`);
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await api.delete(`/users/me/saved-flights/${flight.flight_id}`);
        setIsSaved(false);
        toast.success(`Flight ${flight.flight_number} removed from saved`);
      } else {
        await api.post("/users/me/saved-flights", { flight_id: flight.flight_id });
        setIsSaved(true);
        toast.success(`Flight ${flight.flight_number} saved to your account!`);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        sessionStorage.setItem("pending_save_flight", JSON.stringify({ flight_id: flight.flight_id, flight_number: flight.flight_number }));
        toast.info("Session expired. Please sign in again.");
        navigate(`/login?type=passenger&save_flight=${flight.flight_id}&next=${encodeURIComponent("/?flight=" + flight.flight_number)}`);
      } else {
        toast.error(e.response?.data?.detail || "Failed to update saved flights");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#071318]/95 border-2 ${theme.accentBorder} shadow-2xl ${theme.glow} backdrop-blur-xl group`}
      data-testid="flight-dossier-card"
    >
      {}
      <div className={`w-full bg-gradient-to-r ${theme.bgGradient} p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden`}>
        {}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Plane className="w-48 h-48 rotate-45 transform translate-x-12" />
        </div>

        <div className="flex items-center gap-3.5 z-10">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 backdrop-blur-md grid place-items-center shadow-inner font-black text-sm tracking-wider">
            {theme.code}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-black text-xl sm:text-2xl tracking-tight leading-none text-white drop-shadow-sm">
                {flight.airline_name || theme.name}
              </span>
              <span className="text-[10px] uppercase font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm">
                {flight.is_international ? "International Route" : "Domestic Route"}
              </span>
            </div>
            <div className={`text-[11px] font-medium tracking-wide mt-1 ${theme.goldAccent} flex items-center gap-1.5 opacity-90`}>
              <Sparkles className="w-3 h-3" /> {theme.tagline}
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-2 z-10 self-start sm:self-auto">
          <div className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-sm border ${
            isDelayed
              ? "bg-amber-400/90 text-amber-950 border-amber-300"
              : "bg-emerald-500/90 text-white border-emerald-300/50"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDelayed ? "bg-amber-950" : "bg-white"} animate-pulse`} />
            {isDelayed ? `DELAYED +${flight.flight_delay_minutes}M` : "ON SCHEDULE"}
          </div>

          <div className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/15 border border-white/25 text-white/90">
            FLIGHT DOSSIER
          </div>
        </div>
      </div>

      {}
      {isDelayed && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-bold">Operational Timing Revision:</span>
            <span>{flight.delay_reason || "Flight schedule updated by airport control."}</span>
          </div>
          <div className="font-mono font-bold shrink-0 hidden md:block">
            <span className="line-through opacity-60 mr-2">{fmtTime(schedTime)}</span>
            <span className="text-amber-600 dark:text-amber-300 font-extrabold">New {isDep ? "Departure" : "Arrival"}: {fmtTime(expTime)}</span>
          </div>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        {}
        <div className="lg:col-span-8 p-4 sm:p-7 space-y-5 sm:space-y-6">
          {/* Origin & Destination route row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-2">
            {/* ORIGIN */}
            <div className="space-y-0.5 sm:space-y-1 shrink-0 min-w-0 max-w-[110px] sm:max-w-[150px]">
              <div className="overline text-aero-t3 text-[9px] sm:text-[10px] font-bold">ORIGIN</div>
              <div className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                {flight.origin || "DEL"}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-aero-t2 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-aero-cyan shrink-0" />
                <span className="truncate">{flight.origin === "DEL" ? "Delhi · T3" : flight.origin}</span>
              </div>
            </div>

            {/* MIDDLE ROUTE TRACK */}
            <div className="flex-1 flex flex-col items-center justify-center px-1 sm:px-6 relative min-w-0">
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-aero-t3 mb-1 flex items-center gap-1 sm:gap-1.5">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-aero-cyan" />
                <span className="text-slate-900 dark:text-white font-extrabold">{flight.flight_number}</span>
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-aero-cyan" />
              </div>

              <div className="w-full flex items-center relative py-1">
                {/* Dotted Flight Track */}
                <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700/80" />

                {/* Animated Flight Icon */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full ${theme.accentBg} border ${theme.accentBorder} grid place-items-center shadow-md`}>
                  <Plane className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme.accentText} ${isDep ? "rotate-45" : "rotate-[135deg]"}`} />
                </div>
              </div>

              <div className="text-[9px] sm:text-[10px] font-mono text-aero-t2 mt-1 font-bold flex items-center gap-1 text-center justify-center">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-aero-cyan shrink-0" />
                <span>{durationFormatted}</span>
                <span className="text-aero-t3 hidden xs:inline">•</span>
                <span className="text-aero-t3 uppercase hidden xs:inline">{isDep ? "Outbound" : "Inbound"}</span>
              </div>
            </div>

            {/* DESTINATION */}
            <div className="space-y-0.5 sm:space-y-1 text-right shrink-0 min-w-0 max-w-[110px] sm:max-w-[150px]">
              <div className="overline text-aero-t3 text-[9px] sm:text-[10px] font-bold">DESTINATION</div>
              <div className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                {flight.destination || "BOM"}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-aero-t2 flex items-center justify-end gap-1 truncate">
                <span className="truncate">{flight.destination === "DEL" ? "Delhi · T3" : flight.destination}</span>
                <MapPin className="w-3 h-3 text-aero-cyan shrink-0" />
              </div>
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <TicketSpec
              label={isDep ? "WHEELS UP / DEPARTURE" : "ORIGIN TAKEOFF"}
              value={departureTimeFormatted}
              subValue={isDep && isDelayed ? `Sched: ${fmtTime(schedTime)}` : isDep ? "Takeoff Time" : `From ${flight.origin}`}
              highlight={isDep && isDelayed ? "text-amber-500 font-extrabold" : "text-slate-900 dark:text-white font-bold"}
              icon={<Clock className="w-3.5 h-3.5 text-aero-cyan" />}
            />
            <TicketSpec
              label={isDep ? "EST. TOUCHDOWN" : "TOUCHDOWN / ARRIVAL"}
              value={landingTimeFormatted}
              subValue={!isDep && isDelayed ? `Sched: ${fmtTime(schedTime)}` : "Estimated Landing"}
              highlight={!isDep && isDelayed ? "text-amber-500 font-extrabold" : "text-slate-900 dark:text-white font-bold"}
              icon={<Plane className="w-3.5 h-3.5 text-emerald-500" />}
            />

            {}
            {isDep ? (
              <TicketSpec
                label="BOARDING GATE"
                value={flight.gate || "GATE 32"}
                badge="CONFIRMED"
                highlight="text-cyan-600 dark:text-cyan-400 font-extrabold"
                icon={<MapPin className="w-3.5 h-3.5 text-cyan-500" />}
              />
            ) : (
              <TicketSpec
                label="BAGGAGE BELT"
                value={baggageCarousel}
                badge="CONFIRMED"
                highlight="text-amber-600 dark:text-amber-400 font-extrabold"
                icon={<Luggage className="w-3.5 h-3.5 text-amber-500" />}
              />
            )}

            <TicketSpec
              label="AIRCRAFT TYPE"
              value={flight.aircraft_type?.split("-")[0] || "A320neo"}
              subValue={flight.aircraft_type?.split("-")[1] || "COMMERCIAL JET"}
              highlight="text-slate-900 dark:text-white font-bold"
              icon={<ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
            />
          </div>

          {}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            {isDep ? (
              <>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-500" />
                    Check-in Counter
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {checkinIsland}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Security Zone
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {securityHall}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Terminal Transit
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    ~{totalTransitMin}m to Gate
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-500" />
                    Arrival Gate / Bay
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {flight.gate || "Contact Bay 42"}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Immigration / Customs
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {flight.is_international ? "Immigration Inbound T3" : "Domestic Concourse T3"}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-aero-t3 uppercase font-bold flex items-center gap-1">
                    <Luggage className="w-3 h-3 text-amber-500" />
                    First Bag Time
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {forecast?.baggage?.first_bag_time ? fmtTime(forecast.baggage.first_bag_time) : "~12m post landing"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {}
        <div className="hidden lg:block absolute right-[33.333%] top-0 bottom-0 pointer-events-none">
          {}
          <div className="absolute top-0 -translate-x-1/2 w-7 h-3.5 rounded-b-full bg-aero-bg border-b-2 border-x-2 border-slate-200 dark:border-slate-800 shadow-inner z-20" />

          {}
          <div className="h-full border-r-2 border-dashed border-slate-300 dark:border-slate-800/90" />

          {}
          <div className="absolute -bottom-3.5 -translate-x-1/2 w-7 h-7 rounded-full bg-aero-bg border-t-2 border-slate-200 dark:border-slate-800 shadow-inner z-20" />
        </div>

        {}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50/70 dark:bg-[#060e12]/80 border-t lg:border-t-0 border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="overline text-aero-t3 text-[9px]">JOURNEY SUMMARY</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {flight.flight_number}
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${theme.pillBg}`}>
                {flight.origin} → {flight.destination}
              </div>
            </div>

            {}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-black/50 border border-slate-200 dark:border-slate-800 space-y-3 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[11px] text-aero-t2 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-500" />
                  Flight Route
                </span>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {flight.origin} <ArrowRight className="w-3 h-3 inline text-aero-t3" /> {flight.destination}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aero-t2 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  Total Air Time
                </span>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {durationFormatted}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-aero-t2 font-medium flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-purple-500" />
                  Est. Touchdown
                </span>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {landingTimeFormatted}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                {isDep ? (
                  <>
                    <span className="text-[11px] text-aero-t2 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      Boarding Gate
                    </span>
                    <span className="font-mono font-extrabold text-xs text-cyan-600 dark:text-cyan-400">
                      {flight.gate || "GATE 32"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-aero-t2 font-medium flex items-center gap-1.5">
                      <Luggage className="w-3.5 h-3.5 text-amber-500" />
                      Baggage Belt
                    </span>
                    <span className="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400">
                      {baggageCarousel}
                    </span>
                  </>
                )}
              </div>
            </div>

            {}
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-700 dark:text-cyan-300 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
              <span>
                Live queue intelligence active for <strong>{flight.terminal || "Terminal 3"}</strong>.
              </span>
            </div>
          </div>

          {}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={toggleSave}
              disabled={saving}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                isSaved
                  ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40"
                  : "bg-white dark:bg-slate-800 text-aero-t2 hover:text-aero-cyan border-slate-200 dark:border-slate-700 hover:border-cyan-500/40"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current text-cyan-500" : ""}`} />
              {saving ? "Saving…" : isSaved ? "Saved" : "Save Flight"}
            </button>

            {forecast?.direction === "departure" && onNotify && (
              <button
                data-testid="open-notify-btn"
                onClick={onNotify}
                className="flex-1 text-xs font-bold py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                Notify Me
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-500/40 hover:bg-rose-500/10 text-aero-t3 hover:text-rose-400 grid place-items-center transition-all cursor-pointer"
                title="Minimize Flight Dossier"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TicketSpec({ label, value, subValue, highlight, badge, icon }) {
  return (
    <div className="space-y-0.5">
      <div className="overline text-aero-t3 text-[9px] flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`font-mono text-base sm:text-lg tabular leading-tight ${highlight || "text-slate-900 dark:text-white"}`}>
          {value || "—"}
        </div>
        {badge && (
          <span className="text-[8px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 uppercase">
            {badge}
          </span>
        )}
      </div>
      {subValue && (
        <div className="text-[10px] text-aero-t3 font-mono">
          {subValue}
        </div>
      )}
    </div>
  );
}
