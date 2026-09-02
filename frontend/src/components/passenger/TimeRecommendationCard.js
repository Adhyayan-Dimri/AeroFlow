import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Home,
  MapPin,
  TimerReset,
  AlertTriangle,
  Car,
  PlaneTakeoff,
  ShieldCheck,
  Luggage,
  Sparkles,
  ArrowRight,
  Navigation,
  Compass,
  CheckCircle2
} from "lucide-react";
import { fmtTime } from "@/lib/format";

export default function TimeRecommendationCard({ forecast, userLocation }) {
  const [countdownText, setCountdownText] = useState("");

  const forecastSafe = forecast || {};
  const isDeparture = forecastSafe.direction === "departure";
  const suggestedAirportArrival = forecastSafe.suggested_airport_arrival;
  const total = forecastSafe.total_journey_minutes || 90;
  const travelTime = forecastSafe.travel_time_minutes || 45;
  const inTerminalTime = Math.max(0, total - travelTime);
  const travelTimeInfo = forecastSafe.travel_time_info;
  const isTooFar = travelTimeInfo?.status === "TOO_FAR" || travelTimeInfo?.warning;

  const leaveHome = suggestedAirportArrival
    ? new Date(new Date(suggestedAirportArrival).getTime() - travelTime * 60000).toISOString()
    : null;
  const departureTime = forecastSafe.etd || forecastSafe.std;
  const terminal = forecastSafe.flight?.terminal || "T3";
  const flightNum = forecastSafe.flight?.flight_number || "Flight";

  useEffect(() => {
    if (!leaveHome) return;
    const updateCountdown = () => {
      const target = new Date(leaveHome).getTime();
      const now = new Date().getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setCountdownText("Departure window active");
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
          setCountdownText(`Leave in ${hours}h ${mins}m`);
        } else {
          setCountdownText(`Leave in ${mins}m`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [leaveHome]);

  if (!isDeparture) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="aero-card p-5 sm:p-7 relative overflow-hidden transition-all duration-500 shadow-xl"
      data-testid="time-recommendation-card"
    >
      {}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-3xl pointer-events-none" />

      {}
      {isTooFar && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 relative z-10"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold text-amber-600 dark:text-amber-400">You appear to be in a different city</div>
            <div className="text-slate-600 dark:text-slate-300 mt-0.5">
              Travel time estimate is calculated for Delhi NCR local access. For live door-to-gate guidance, use your current airport vicinity location.
            </div>
          </div>
        </motion.div>
      )}

      {}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-aero-border relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Intelligent Door-To-Gate Itinerary
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Terminal {terminal} · {flightNum}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
            Smart Departure Plan
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {countdownText && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 shadow-sm text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{countdownText}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>STD {fmtTime(departureTime)}</span>
          </div>
        </div>
      </div>

      {}
      <div className="my-6 p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50 relative z-10">
        <div className="relative flex items-center justify-between gap-2 sm:gap-4">
          {}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 rounded-full"
            />
          </div>

          {}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white shadow-md grid place-items-center mb-1.5">
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Leave</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {fmtTime(leaveHome)}
            </span>
          </div>

          {}
          <div className="relative z-10 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-mono text-slate-500">
            <Car className="w-3 h-3 text-cyan-500" />
            <span>~{Math.round(travelTime)}m drive</span>
          </div>

          {}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-cyan-500 text-white shadow-md grid place-items-center mb-1.5">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">Arrive T{terminal}</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {fmtTime(suggestedAirportArrival)}
            </span>
          </div>

          {}
          <div className="relative z-10 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-mono text-slate-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>~{Math.round(inTerminalTime)}m inside</span>
          </div>

          {}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white shadow-md grid place-items-center mb-1.5">
              <PlaneTakeoff className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Takeoff</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {fmtTime(departureTime)}
            </span>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 relative z-10">
        {}
        <motion.div
          whileHover={{ y: -8, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 450, damping: 24 }}
          className="group rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.06] hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/20 flex flex-col justify-between transition-colors duration-200 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Stage 1 · Origin
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 grid place-items-center text-amber-600 dark:text-amber-400 group-hover:scale-115 transition-transform duration-200 shadow-sm">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Leave Home By</div>
            <div className="font-display text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 tracking-tight">
              {fmtTime(leaveHome)}
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-amber-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
            <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>~{Math.round(travelTime)} mins highway drive</span>
          </div>
        </motion.div>

        {}
        <motion.div
          whileHover={{ y: -8, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 450, damping: 24 }}
          className="group rounded-2xl p-4 sm:p-5 border border-cyan-500/50 bg-cyan-500/[0.05] dark:bg-cyan-500/[0.08] hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/25 ring-1 ring-cyan-500/30 flex flex-col justify-between transition-colors duration-200 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Stage 2 · Airport Entry
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 grid place-items-center text-cyan-600 dark:text-cyan-400 group-hover:scale-115 transition-transform duration-200 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Reach Terminal By</div>
            <div className="font-display text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 tracking-tight">
              {fmtTime(suggestedAirportArrival)}
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-cyan-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Target: Gate 4 (Departures)</span>
          </div>
        </motion.div>

        {}
        <motion.div
          whileHover={{ y: -8, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 450, damping: 24 }}
          className="group rounded-2xl p-4 sm:p-5 border border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/20 flex flex-col justify-between transition-colors duration-200 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Stage 3 · Terminal Flow
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 grid place-items-center text-emerald-600 dark:text-emerald-400 group-hover:scale-115 transition-transform duration-200 shadow-sm">
                <TimerReset className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">In-Terminal Clearance</div>
            <div className="font-display text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
              {Math.round(inTerminalTime)}m
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Bag Drop + Security + Buffer</span>
          </div>
        </motion.div>
      </div>

      {}
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 relative z-10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Calculated using live highway traffic and Terminal {terminal} security lane throughput.</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Boarding Buffer: {forecast.boarding_buffer_minutes || 20} mins
        </div>
      </div>
    </motion.div>
  );
}
