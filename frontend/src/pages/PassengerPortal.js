import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plane, ArrowRight, Bell, Sparkles, Gauge, Radar, ShieldCheck, Loader2, ChevronUp, MonitorPlay, Bookmark, Trash2, X, Search, Clock } from "lucide-react";
import api from "@/lib/api";
import Spotlight from "@/components/Spotlight";
import FlightSearchHero from "@/components/passenger/FlightSearchHero";
import AeroJourneyTimeline from "@/components/passenger/AeroJourneyTimeline";
import TerminalJourneyStory from "@/components/passenger/TerminalJourneyStory";
import TimeRecommendationCard from "@/components/passenger/TimeRecommendationCard";
import BaggageTrackerCard from "@/components/passenger/BaggageTrackerCard";
import NotificationOptInModal from "@/components/passenger/NotificationOptInModal";
import WeatherWidget from "@/components/passenger/WeatherWidget";
import FidsBoard from "@/components/passenger/FidsBoard";
import BoardingPassDossier from "@/components/passenger/BoardingPassDossier";
import { Button } from "@/components/ui/button";
import { fmtTime, fmtDateTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1520437358207-323b43b50729?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwxfHxhaXJwbGFuZSUyMHJ1bndheSUyMG5pZ2h0fGVufDB8fHx8MTc4NzgwNjMxOHww&ixlib=rb-4.1.0&q=85";

function getBezierPath(p0, p3, steps = 24, dip = 0.35) {
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;

  const c1 = { x: p0.x + dx * 0.25, y: p0.y + Math.abs(dx) * dip };
  const c2 = { x: p0.x + dx * 0.7, y: p3.y - Math.abs(dy) * 0.1 };

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    let p = {
      x: uuu * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * p3.y,
    };
    points.push(p);
  }
  return points;
}

export default function PassengerPortal() {
  const [selected, setSelected] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [journeyViewMode, setJourneyViewMode] = useState("timeline");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFids, setShowFids] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [params] = useSearchParams();
  const [userPrefs, setUserPrefs] = useState({ saved_flights: [], recently_viewed: [] });
  const [recentFlights, setRecentFlights] = useState([]);
  const [dossierOpen, setDossierOpen] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const flightParam = params.get("flight");
    if (flightParam && !selected) {
      api.get(`/flights?q=${encodeURIComponent(flightParam)}`)
        .then(({ data }) => {
          const matched = (data.flights || []).find(
            (f) => f.flight_number.toLowerCase() === flightParam.toLowerCase() || f.flight_id === flightParam
          ) || (data.flights || [])[0];
          if (matched) {
            loadFlight(matched);
          }
        })
        .catch(() => { });
    }

  }, [params]);

  useEffect(() => {
    if (user) {
      api.get("/user/preferences").then(({ data }) => {
        setUserPrefs(data);
      }).catch(() => { });
      api.get("/user/recently-viewed").then(({ data }) => {
        setRecentFlights(data.flights || []);
      }).catch(() => { });
    }
  }, [user]);

  const handleClearRecentlyViewed = async () => {
    try {
      await api.delete("/user/recently-viewed");
      setRecentFlights([]);
      setUserPrefs((prev) => ({ ...prev, recently_viewed: [] }));
      toast.success("Recently viewed flights cleared");
    } catch (err) {
      toast.error("Failed to clear recently viewed flights");
    }
  };

  const handleCloseFlight = () => {
    setSelected(null);
    setForecast(null);
    setDossierOpen(true);
  };

  const triggerPlaneFlight = () => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const height = typeof window !== "undefined" ? window.innerHeight : 800;

    const p0 = { x: -80, y: height * 0.72 };
    const p3 = { x: width + 100, y: -80 };

    const points = getBezierPath(p0, p3, 28, 0.25);
    const xPath = points.map((pt) => pt.x);
    const yPath = points.map((pt) => pt.y);

    const anglePath = [];
    for (let i = 0; i < points.length; i++) {
      const next = points[Math.min(i + 1, points.length - 1)];
      const prev = points[Math.max(i - 1, 0)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      anglePath.push(angle);
    }

    const newPlane = {
      id: `${Date.now()}-${Math.random()}`,
      xPath,
      yPath,
      anglePath,
    };
    setPlanes((prev) => [...prev, newPlane]);
  };

  const removePlane = (id) => {
    setPlanes((prev) => prev.filter((p) => p.id !== id));
  };

  const loadFlight = async (f, loc = null, fromSearch = false) => {
    if (fromSearch) {
      triggerPlaneFlight();
    }
    setDossierOpen(true);
    setSelected(f);
    setLoading(true);
    setUserLocation(loc);
    try {
      const params = loc ? { user_location: loc } : {};
      const { data } = await api.get(`/flights/${f.flight_id}/journey-forecast`, { params });
      setForecast(data);
      if (data.direction === "arrival" && data.baggage) {
        const first = new Date(data.baggage.first_bag_time).getTime();
        const last = new Date(data.baggage.last_bag_time).getTime();
        if (Date.now() >= first && Date.now() <= last) {
          toast.success(`🧳 Baggage belt has started for ${data.flight.flight_number}`, { description: "Bags are arriving on the belt now." });
        }
      }
      if (user) {
        api.post("/user/recently-viewed", { flight_id: f.flight_id })
          .then(() => api.get("/user/recently-viewed"))
          .then(({ data }) => { if (data?.flights) setRecentFlights(data.flights); })
          .catch(() => { });
      }
      window.scrollTo({ top: 380, behavior: "smooth" });
    } catch (e) {
      console.error("Error loading flight:", e);
      toast.error(e.response?.data?.detail || "Failed to load flight details");
    } finally { setLoading(false); }
  };

  const handleLocationChange = (loc) => {
    setUserLocation(loc);
    if (selected) {
      loadFlight(selected, loc, false);
    }
  };

  const toggleSaveFlight = async (flightId) => {
    if (!user) return;
    const isSaved = userPrefs.saved_flights.includes(flightId);
    try {
      if (isSaved) {
        await api.delete(`/user/saved-flights/${flightId}`);
        setUserPrefs(prev => ({
          ...prev,
          saved_flights: prev.saved_flights.filter(id => id !== flightId)
        }));
        toast.success("Flight removed from saved");
      } else {
        await api.post("/user/saved-flights", { flight_id: flightId });
        setUserPrefs(prev => ({
          ...prev,
          saved_flights: [...prev.saved_flights, flightId]
        }));
        toast.success("Flight saved");
      }
    } catch (e) {
      toast.error("Failed to update saved flights");
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-12 right-4 sm:right-6 hidden lg:block z-10">
        <WeatherWidget />
      </div>
      { }
      <section className="relative overflow-hidden aero-grain">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="runway" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-aero-bg/70 via-aero-bg/85 to-aero-bg" />
          <div className="absolute inset-0 aero-grid opacity-20" />
        </div>
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 pt-16 pb-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-aero-cyan/30 bg-aero-cyan/[0.07] px-3 py-1 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-aero-cyan" />
              <span className="overline text-aero-cyan text-[10px]">International Airport · Terminal 3</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl">
              Know your airport <span className="text-aero-cyan">before you go.</span>
            </h1>
            <p className="text-base sm:text-lg text-aero-t2 mt-4 max-w-2xl">
              Search your flight for a live, step-by-step journey forecast with queue waits at every checkpoint,
              a smart leave home by time, and First/Last bag predictions on arrival.
            </p>
            <Button
              onClick={() => setShowFids(!showFids)}
              variant="outline"
              className="mt-4 border-aero-cyan/50 text-aero-cyan hover:bg-aero-cyan/10"
            >
              <MonitorPlay className="w-4 h-4 mr-2" />
              {showFids ? "Hide FIDS Board" : "View Live FIDS Board"}
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-8">
            <FlightSearchHero onSelect={loadFlight} onLocationChange={handleLocationChange} />
          </motion.div>

          {user && recentFlights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-aero-t2">Recently Viewed</div>
                <button
                  data-testid="clear-recently-viewed-btn"
                  onClick={handleClearRecentlyViewed}
                  className="text-xs text-aero-t3 hover:text-rose-400 font-medium flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recentFlights.slice(0, 8).map((flight) => (
                  <button
                    key={flight.flight_id}
                    onClick={() => loadFlight(flight)}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-aero-surface border border-aero-border hover:border-aero-cyan/40 text-left transition-colors group"
                  >
                    <div className="font-mono font-bold text-xs group-hover:text-aero-cyan">{flight.flight_number}</div>
                    <div className="text-[10px] text-aero-t3">{flight.origin} → {flight.destination}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <FlightDossierSkeleton />
            </motion.div>
          )}

          {!loading && forecast && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8 space-y-6">
              <AnimatePresence mode="wait">
                {dossierOpen ? (
                  <motion.div
                    key="dossier-card"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <BoardingPassDossier
                      flight={forecast.flight}
                      forecast={forecast}
                      onNotify={() => setNotifyOpen(true)}
                      onClose={() => setDossierOpen(false)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dossier-collapsed"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#071318]/95 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center">
                        <Plane className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{forecast.flight?.flight_number}</span>
                          <span className="text-xs text-aero-t2 font-semibold">({forecast.flight?.origin} → {forecast.flight?.destination})</span>
                        </div>
                        <div className="text-[11px] text-aero-t3 font-medium flex items-center gap-2 mt-0.5">
                          <span>{forecast.direction === "departure" ? "Outbound Flight · T3" : "Inbound Flight · T3"}</span>
                          <span>•</span>
                          <span>{forecast.direction === "departure" ? `Gate: ${forecast.flight?.gate || "GATE 32"}` : `Baggage Belt: ${forecast.flight?.carousel_number || "Carousel AC-04"}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDossierOpen(true)}
                        className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Show Flight Dossier
                      </button>
                      <button
                        data-testid="close-flight-view-btn"
                        onClick={handleCloseFlight}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Close Flight
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 1. Smart Departure Plan (Departure) or Baggage Claim Forecast (Arrival) */}
              {forecast.direction === "departure"
                ? <TimeRecommendationCard forecast={forecast} userLocation={userLocation} />
                : <BaggageTrackerCard baggage={forecast.baggage} flight={forecast.flight} />}

              {/* 2. Terminal Journey Experience (Path Through The Terminal) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 pl-1">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Terminal Journey Experience</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Choose between compact overview or detailed interactive story</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto">
                  <button
                    data-testid="switch-view-timeline"
                    onClick={() => setJourneyViewMode("timeline")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      journeyViewMode === "timeline"
                        ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 scale-[1.02]"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Standard Timeline
                  </button>
                  <button
                    data-testid="switch-view-story"
                    onClick={() => setJourneyViewMode("story")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      journeyViewMode === "story"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 scale-[1.02]"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Terminal Journey Story
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {journeyViewMode === "timeline" ? (
                  <motion.div
                    key="timeline-view"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                  >
                    <AeroJourneyTimeline forecast={forecast} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="story-view"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                  >
                    <TerminalJourneyStory forecast={forecast} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {showFids && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
              <FidsBoard />
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              [Radar, "15–30 min", "ahead forecast", "Real-time queue modeling across checkpoints"],
              [Gauge, "Smart", "staffing", "Predictive terminal counter optimization"],
              [ShieldCheck, "250+", "daily flights", "Live synchronized operations at IGI T3"]
            ].map(([Icon, a, b, desc], i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 35, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass rounded-xl p-5 border border-aero-border hover:border-aero-cyan/50 transition-all duration-300 relative group overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgba(0,229,255,0.12)] cursor-default"
              >
                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-aero-cyan/5 group-hover:bg-aero-cyan/10 blur-xl transition-all duration-500 pointer-events-none" />
                <div className="w-10 h-10 rounded-lg bg-aero-cyan/10 border border-aero-cyan/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-aero-cyan/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-aero-cyan" />
                </div>
                <div className="font-display font-bold text-2xl mt-3 text-aero-t1 group-hover:text-aero-cyan transition-colors">{a}</div>
                <div className="text-sm font-semibold text-aero-t2 mt-0.5">{b}</div>
                <div className="text-xs text-aero-t3 mt-1.5 line-clamp-2">{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      { }
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-24 -mt-2">
        {!loading && !forecast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-16">
            <HowItWorks />
          </motion.div>
        )}
      </section>

      <NotificationOptInModal open={notifyOpen} onOpenChange={setNotifyOpen} flight={selected} />

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 rounded-full p-3 shadow-lg transition-all hover:scale-110"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      { }
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <AnimatePresence>
          {planes.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: p.xPath[0],
                y: p.yPath[0],
                opacity: 0,
                scale: 0.7,
                rotate: p.anglePath[0],
              }}
              animate={{
                x: p.xPath,
                y: p.yPath,
                opacity: [0, 1, 1, 0.95, 0],
                scale: [0.7, 1.1, 1.15, 1.0, 0.85],
                rotate: p.anglePath,
              }}
              exit={{ opacity: 0 }}
              transition={{
                x: { duration: 2.2, ease: "easeInOut" },
                y: { duration: 2.2, ease: "easeInOut" },
                rotate: { duration: 2.2, ease: "easeInOut" },
                opacity: { duration: 2.2, ease: "easeInOut" },
                scale: { duration: 2.2, ease: "easeOut" },
              }}
              onAnimationComplete={() => removePlane(p.id)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transformOrigin: "center center",
              }}
            >
              <div
                style={{
                  transform: "translate(-50%, -50%)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                { }
                <div className="relative flex items-center justify-center">
                  { }
                  <div className="absolute right-[52%] top-[34%] -translate-y-1/2 w-[180px] h-[3px] bg-gradient-to-l from-cyan-400 via-cyan-400/50 to-transparent blur-[1px] pointer-events-none -z-10" />
                  <div className="absolute right-[52%] top-[66%] -translate-y-1/2 w-[180px] h-[3px] bg-gradient-to-l from-cyan-400 via-cyan-400/50 to-transparent blur-[1px] pointer-events-none -z-10" />

                  { }
                  <div className="absolute -left-4 w-10 h-10 rounded-full bg-cyan-400/30 blur-md pointer-events-none" />

                  { }
                  <svg width="74" height="74" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_0_24px_rgba(0,229,255,0.95)]">
                    { }
                    <path d="M34 26 L16 5 L10 6 L22 26 Z" fill="#0A1E34" stroke="#00E5FF" strokeWidth="1.5" strokeLinejoin="round" />
                    { }
                    <path d="M34 38 L16 59 L10 58 L22 38 Z" fill="#0A1E34" stroke="#00E5FF" strokeWidth="1.5" strokeLinejoin="round" />
                    { }
                    <rect x="22" y="13" width="10" height="4.5" rx="2" fill="#00E5FF" />
                    <rect x="22" y="46.5" width="10" height="4.5" rx="2" fill="#00E5FF" />
                    { }
                    <path d="M58 32 C55 28 42 26 26 26 L12 26 C7 26 3 28 2 32 C3 36 7 38 12 38 L26 38 C42 38 55 36 58 32 Z" fill="#071526" stroke="#00E5FF" strokeWidth="1.8" />
                    { }
                    <path d="M52 30.5 C50 29 47 29 45 30 L45 34 C47 35 50 35 52 33.5 Z" fill="#00E5FF" />
                    { }
                    <path d="M10 26 L3 13 L0.5 13 L4 26 Z" fill="#0A1E34" stroke="#00E5FF" strokeWidth="1.2" />
                    <path d="M10 38 L3 51 L0.5 51 L4 38 Z" fill="#0A1E34" stroke="#00E5FF" strokeWidth="1.2" />
                    { }
                    {[38, 33, 28, 23, 18, 13].map((cx, i) => (
                      <circle key={i} cx={cx} cy="32" r="1" fill="#E2E8F0" />
                    ))}
                    { }
                    <circle cx="56" cy="32" r="1.5" fill="#FFFFFF" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FlightDossier({ flight, forecast, onNotify, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userPrefs, setUserPrefs] = useState({ saved_flights: [] });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/user/preferences").then(({ data }) => {
        setUserPrefs(data);
        setIsSaved(data.saved_flights.includes(flight.flight_id));
      }).catch(() => { });
    }
  }, [user, flight.flight_id]);

  const toggleSave = async () => {
    if (!user) {
      toast.info("Please sign in to save flights");
      navigate("/login");
      return;
    }
    try {
      if (isSaved) {
        await api.delete(`/user/saved-flights/${flight.flight_id}`);
        setIsSaved(false);
        toast.success("Flight removed from saved");
      } else {
        await api.post("/user/saved-flights", { flight_id: flight.flight_id });
        setIsSaved(true);
        toast.success("Flight saved to your account");
      }
    } catch (e) {
      if (e.response?.status === 401) {
        toast.info("Please sign in to save flights");
        navigate("/login");
      } else {
        toast.error(e.response?.data?.detail || "Failed to update saved flights");
      }
    }
  };

  const isDelayed = flight.status === "delayed" || (flight.flight_delay_minutes && flight.flight_delay_minutes > 0);
  const isDep = flight.direction === "departure";
  const schedTime = flight.std || flight.sta;
  const expTime = isDep ? (flight.etd || flight.std) : (flight.eta || flight.ata || flight.sta);

  return (
    <Spotlight className="aero-card p-4 sm:p-6 rounded-2xl space-y-4">
      { }
      {isDelayed && (
        <div className="p-3 rounded-xl border border-amber-400 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-xs flex items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-300">
          <div className="flex items-start sm:items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-400/50 uppercase text-[10px] shrink-0">
              DELAYED +{flight.flight_delay_minutes}M
            </span>
            <div>
              <span className="font-bold text-aero-t1">Operational Schedule Revision: </span>
              <span>{flight.delay_reason || "Flight timing revised by airport operational control."}</span>
            </div>
          </div>
          <div className="font-mono text-right shrink-0 hidden md:block">
            <span className="line-through text-aero-t3 mr-2">{fmtTime(schedTime)}</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{fmtTime(expTime)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-aero-cyan/10 border border-aero-cyan/30 grid place-items-center shrink-0">
            <Plane className={`w-6 h-6 sm:w-7 sm:h-7 text-aero-cyan ${flight.direction === "arrival" ? "rotate-[135deg]" : "rotate-45"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-xl sm:text-2xl font-black">{flight.flight_number}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${flight.is_international ? "bg-blue-100 text-blue-800 dark:bg-aero-blue/15 dark:text-aero-blue" : "bg-emerald-100 text-emerald-800 dark:bg-aero-emerald/15 dark:text-aero-emerald"}`}>
                {flight.is_international ? "INTERNATIONAL" : "DOMESTIC"}
              </span>
              {isDelayed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  +{flight.flight_delay_minutes}M
                </span>
              )}
            </div>
            <div className="text-aero-t2 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
              {flight.origin} <ArrowRight className="w-3.5 h-3.5" /> {flight.destination} · {flight.airline_name}
            </div>
            <div className="text-[11px] text-aero-cyan font-mono mt-0.5">{fmtDateTime(schedTime)}</div>
          </div>
        </div>

        { }
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-aero-border/60">
          <Stat
            label={isDep ? "Departs" : "Arrives"}
            value={fmtTime(expTime)}
            subValue={isDelayed ? `Sched: ${fmtTime(schedTime)}` : null}
            highlight={isDelayed ? "text-amber-400" : null}
          />
          <Stat label="Gate" value={flight.gate} />
          <Stat label="Aircraft" value={flight.aircraft_type?.split("-")[0]} />

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 justify-end sm:justify-start">
            <button onClick={toggleSave} className="text-xs text-aero-t2 hover:text-aero-cyan font-semibold px-3 py-2 rounded-lg border border-aero-border hover:border-aero-cyan/40 flex items-center gap-1.5 h-9">
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current text-aero-cyan" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </button>
            {forecast.direction === "departure" && (
              <Button data-testid="open-notify-btn" onClick={onNotify} className="bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-bold text-xs rounded-full h-9 px-4">
                <Bell className="w-3.5 h-3.5 mr-1" /> Notify
              </Button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-aero-t3 hover:text-rose-400 font-semibold px-2.5 py-2 rounded-lg border border-aero-border hover:border-rose-400/40 hover:bg-rose-500/10 flex items-center gap-1 h-9 transition-colors"
                title="Close Flight View"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Spotlight>
  );
}

function Stat({ label, value, subValue, highlight }) {
  return (
    <div className="text-left sm:text-center px-2 sm:px-0">
      <div className="overline text-aero-t3 text-[9px]">{label}</div>
      <div className={`font-mono font-bold text-base sm:text-lg tabular ${highlight || "text-aero-t1"}`}>{value || "—"}</div>
      {subValue && <div className="text-[9px] text-aero-t3 font-mono line-through">{subValue}</div>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Search your flight",
      desc: "By flight number or destination route — no boarding pass scan required.",
      tag: "Instant Lookup",
      icon: Search,
    },
    {
      num: "02",
      title: "See every step",
      desc: "Live queue waits at check-in, security, immigration & gate, 15–30 min ahead.",
      tag: "Queue Intelligence",
      icon: Sparkles,
    },
    {
      num: "03",
      title: "Leave at the right time",
      desc: "Smart arrival recommendation works backwards from departure so you never rush.",
      tag: "Stress-Free Journey",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xl mx-auto mb-8"
      >
        <span className="overline text-aero-cyan text-[11px] font-mono uppercase tracking-widest bg-aero-cyan/10 border border-aero-cyan/30 px-3 py-1 rounded-full">
          How AeroFlow Works
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mt-3 text-aero-t1">
          Predictive airport intelligence, <span className="text-aero-cyan">simplified.</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5">
        {steps.map(({ num, title, desc, tag, icon: StepIcon }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="aero-card p-6 rounded-2xl border border-aero-border hover:border-aero-cyan/50 transition-all duration-300 relative group overflow-hidden shadow-md hover:shadow-[0_12px_30px_rgba(0,229,255,0.15)] flex flex-col justify-between"
          >
            { }
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-aero-cyan/10 via-transparent to-transparent rounded-bl-full pointer-events-none group-hover:from-aero-cyan/20 transition-all duration-500" />

            <div>
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl sm:text-5xl font-black bg-gradient-to-br from-cyan-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                  {num}
                </span>
                <div className="w-10 h-10 rounded-xl bg-aero-surface border border-aero-border/80 flex items-center justify-center text-aero-cyan group-hover:border-aero-cyan/50 group-hover:bg-aero-cyan/10 transition-colors">
                  <StepIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-aero-cyan/10 text-aero-cyan border border-aero-cyan/20">
                {tag}
              </div>

              <div className="font-display font-bold text-lg sm:text-xl mt-3 text-aero-t1 group-hover:text-aero-cyan transition-colors">
                {title}
              </div>
              <div className="text-sm text-aero-t2 mt-2 leading-relaxed">
                {desc}
              </div>
            </div>

            { }
            <div className="mt-6 pt-4 border-t border-aero-border/50 flex items-center gap-2 text-xs font-mono text-aero-t3 group-hover:text-aero-cyan transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-aero-cyan/50 group-hover:bg-aero-cyan group-hover:animate-ping" />
              <span>Step {i + 1} of 3</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FlightDossierSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white/80 dark:bg-[#071318]/80 border-2 border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl animate-pulse p-6 sm:p-7 space-y-6">
      { }
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-300/70 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="w-40 h-5 rounded-lg bg-slate-300/70 dark:bg-slate-800" />
            <div className="w-24 h-3.5 rounded bg-slate-200 dark:bg-slate-800/60" />
          </div>
        </div>
        <div className="w-28 h-7 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>

      { }
      <div className="flex items-center justify-between py-2">
        <div className="space-y-1.5">
          <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-24 h-8 bg-slate-300/70 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="flex-1 max-w-[200px] h-2 bg-slate-200 dark:bg-slate-800 rounded mx-4 sm:mx-8" />
        <div className="space-y-1.5 text-right">
          <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
          <div className="w-24 h-8 bg-slate-300/70 dark:bg-slate-800 rounded-xl ml-auto" />
        </div>
      </div>

      { }
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-slate-200 dark:border-slate-800">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-24 h-6 bg-slate-300/70 dark:bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
