import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  DoorOpen,
  Luggage,
  ShieldCheck,
  PlaneTakeoff,
  PlaneLanding,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  Zap,
  Footprints,
  FileCheck,
  ArrowRight,
  ArrowDown,
  Sparkles,
  Compass,
  Check
} from "lucide-react";

const TRAFFIC_THEME = {
  normal: {
    color: "#10B981",
    cardBorder: "border-emerald-500/35 dark:border-emerald-500/30",
    cardBg: "bg-emerald-500/[0.025] dark:bg-emerald-500/[0.05]",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    glow: "rgba(16, 185, 129, 0.15)",
    label: "Fast Flow · Minimal Wait",
    statusDot: "bg-emerald-500 shadow-emerald-500/50"
  },
  medium: {
    color: "#F59E0B",
    cardBorder: "border-amber-500/40 dark:border-amber-500/35",
    cardBg: "bg-amber-500/[0.03] dark:bg-amber-500/[0.06]",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    glow: "rgba(245, 158, 11, 0.18)",
    label: "Moderate Flow · Normal Queue",
    statusDot: "bg-amber-500 shadow-amber-500/50"
  },
  heavy: {
    color: "#F43F5E",
    cardBorder: "border-rose-500/45 dark:border-rose-500/40",
    cardBg: "bg-rose-500/[0.04] dark:bg-rose-500/[0.08]",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/35",
    glow: "rgba(244, 63, 94, 0.22)",
    label: "High Volume · Extra Staff Active",
    statusDot: "bg-rose-500 shadow-rose-500/50"
  }
};

function formatCounters(rec) {
  if (!rec) return "C03, C07";
  if (Array.isArray(rec)) return rec.join(", ");
  return String(rec);
}

function formatClock(date) {
  if (!date) return "--:--";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "--:--";
  }
}

export default function TerminalJourneyStory({ forecast }) {
  const [activeStep, setActiveStep] = useState(0);
  const [viewedSteps, setViewedSteps] = useState(new Set([0]));
  const gridContainerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: gridContainerRef,
    offset: ["start 75%", "end 75%"]
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001
  });

  const [liveScrollPct, setLiveScrollPct] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const pct = Math.round(Math.min(100, Math.max(0, latest * 100)));
      setLiveScrollPct(pct);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const forecastSafe = useMemo(() => forecast || {}, [forecast]);
  const isArrival = forecastSafe.direction === "arrival";
  const flight = useMemo(() => forecastSafe.flight || {}, [forecastSafe.flight]);
  const terminal = String(flight.terminal || "T3");
  const airline = String(flight.airline_name || "Airline");
  const flightNum = String(flight.flight_number || "Flight");
  const gate = String(flight.gate || "TBD");
  const isGateB = gate.toUpperCase().startsWith("B");
  const carousel = String(forecastSafe.baggage?.carousel || flight.carousel || "Belt 5");
  const isInternational = Boolean(flight.is_international || forecastSafe.is_international);

  const storySteps = useMemo(() => {
    if (isArrival) {
      const immStep = forecastSafe.steps?.find((s) => s.zone_type === "immigration" || s.zone_id === "immigration-arr");
      const firstMs = forecastSafe.baggage?.first_bag_time ? new Date(forecastSafe.baggage.first_bag_time).getTime() : 0;
      const lastMs = forecastSafe.baggage?.last_bag_time ? new Date(forecastSafe.baggage.last_bag_time).getTime() : 0;
      const beltMin = (firstMs && lastMs) ? Math.max(6, Math.round((lastMs - firstMs) / 60000)) : 8;

      const steps = [
        {
          id: "touchdown",
          number: "01",
          icon: PlaneLanding,
          title: "Aircraft Touchdown & Stand Parking",
          subtitle: `Runway 29L → Stand ${String(flight.stand || "44")} (Terminal ${terminal})`,
          phase: "Airside Arrival",
          estimatedMinutes: 3,
          walkMinutes: 0,
          crowdLevel: "normal",
          narrative: `Your aircraft touches down at International Airport and taxies to Stand ${String(flight.stand || "44")}. The aerobridge docks automatically, initiating passenger deboarding.`,
          proTip: "Keep seatbelts fastened until the aircraft comes to a complete halt and the seatbelt sign turns off.",
          highlights: [
            { label: "Deboarding Door", value: "Aerobridge Dock" },
            { label: "Baggage Offload", value: "Ramp Team Active" },
            { label: "Arrival Level", value: "Pier Level 1" }
          ],
          amenities: ["Restrooms Ahead", "Free Wi-Fi", "Transit Help Desk"]
        }
      ];

      if (isInternational && immStep) {
        steps.push({
          id: "immigration",
          number: `0${steps.length + 1}`,
          icon: FileCheck,
          title: "Passport Control & E-Visa Screening",
          subtitle: "Arrivals Hall · Immigration Zone",
          phase: "Terminal Concourse",
          estimatedMinutes: immStep.wait_minutes,
          walkMinutes: immStep.walk_minutes || 6,
          crowdLevel: immStep.crowd_level || "normal",
          narrative: "Proceed to the central immigration hall. Foreign e-Visa holders should use dedicated biometric lanes for swift digital clearance.",
          proTip: "Have your passport, boarding pass stub, and arrival card open to the photo page.",
          highlights: [
            { label: "Walk Distance", value: "~280 meters" },
            { label: "Counters Active", value: `${immStep.counters_open || 8} Open` },
            { label: "Lane Status", value: "Open & Flowing" }
          ],
          amenities: ["Travelators", "Currency Exchange", "Medical Room"]
        });
      }

      steps.push({
        id: "baggage_reclaim",
        number: `0${steps.length + 1}`,
        icon: Luggage,
        title: `Baggage Reclaim · ${carousel}`,
        subtitle: `Ground Level Baggage Hall · Carousel ${carousel}`,
        phase: "Baggage Delivery",
        estimatedMinutes: beltMin,
        walkMinutes: 4,
        crowdLevel: "normal",
        narrative: `Checked baggage from flight ${flightNum} is transferred via automated tugs to ${carousel}. Real-time optical belt sensors track luggage delivery onto the carousel.`,
        proTip: "Verify your luggage tag number on the bag handle with your boarding card slip before exiting.",
        highlights: [
          { label: "Assigned Belt", value: carousel },
          { label: "Est. Total Bags", value: `${forecastSafe.baggage?.bag_count || 140} pieces` },
          { label: "Delivery Speed", value: "Priority Bags First" }
        ],
        amenities: ["Trolleys Available", "Lost & Found Desk", "Oversize Baggage Belt"]
      });

      steps.push({
        id: "exit_transit",
        number: `0${steps.length + 1}`,
        icon: Car,
        title: "Customs Green Channel & Ground Transport",
        subtitle: "Arrivals Forecourt · Metro & Taxi Hub",
        phase: "City Connection",
        estimatedMinutes: 0,
        walkMinutes: 0,
        crowdLevel: "normal",
        narrative: "Exit through the Customs Green Channel directly into the Arrivals Forecourt. Seamless connectivity to Airport Express Metro, Uber/Ola pickup zones, and multi-level parking.",
        proTip: "The Airport Express Metro station is on Level -1 with trains every 10 minutes reaching New Delhi Station in 19 mins.",
        highlights: [
          { label: "Metro Frequency", value: "Every 10 mins" },
          { label: "Ride-hail Hub", value: "Pillars 14–18" },
          { label: "City Transit Time", value: "~35–45 min" }
        ],
        amenities: ["Airport Express Metro", "Pre-paid Taxi Kiosk", "Forecourt Cafés", "ATM 24/7"]
      });

      return steps;
    }

    const steps = [
      {
        id: "forecourt",
        number: "01",
        icon: Car,
        title: "City Approach & Terminal Forecourt",
        subtitle: `Departures Level 2 · Pillars 4–7 (Terminal ${terminal})`,
        phase: "Arrival at Airport",
        estimatedMinutes: 0,
        walkMinutes: 0,
        crowdLevel: "normal",
        narrative: `Arrive at IGI Airport Terminal ${terminal} via the elevated departure road. Drop-off for ${airline} is optimally located between Pillars 4 and 7 for fastest terminal entry.`,
        proTip: "Use Entry Gate 4 for shortest walking distance to your airline check-in aisle.",
        highlights: [
          { label: "Recommended Gate", value: "Gate 4 (Departures)" },
          { label: "Forecourt Traffic", value: "Smooth Flowing" },
          { label: "Drop-off Zone", value: "Pillars 4–7" }
        ],
        amenities: ["Luggage Trolleys", "Curbside Porter", "Differently-Abled Assistance"]
      },
      {
        id: "digiyatra",
        number: "02",
        icon: DoorOpen,
        title: "Terminal Entry & DigiYatra Biometric Gate",
        subtitle: "Automated 1:1 Facial Scan · CISF Entry Post",
        phase: "Biometric Security",
        estimatedMinutes: forecastSafe.entry_wait_minutes ?? 4,
        walkMinutes: 0,
        crowdLevel: "normal",
        narrative: "Step up to the DigiYatra smart biometric e-gate. The high-speed infrared camera scans your facial token and matches your boarding record in under 3 seconds without paperwork.",
        proTip: "Remove face masks or dark sunglasses momentarily and look directly into the camera lens at the gate.",
        highlights: [
          { label: "DigiYatra Fast Gate", value: "Gate 4B (Biometric)" },
          { label: "Scan Time", value: "< 3.2 seconds" },
          { label: "Paperless Entry", value: "100% Digital Token" }
        ],
        amenities: ["DigiYatra Enrolment Kiosk", "CISF Assistance Desk", "Priority Lane"]
      }
    ];

    (forecastSafe.steps || []).forEach((s) => {
      const isGate = s.zone_type === "gate" || (s.zone_id && s.zone_id.startsWith("gate"));
      const isCheckin = s.zone_type === "checkin" || (s.zone_id && s.zone_id.startsWith("checkin"));
      const isSec = s.zone_type === "security" || (s.zone_id && s.zone_id.startsWith("security"));
      const isEmig = s.zone_type === "immigration" || (s.zone_id && s.zone_id.startsWith("emigration"));

      if (isCheckin) {
        steps.push({
          id: s.zone_id,
          number: `0${steps.length + 1}`,
          icon: Luggage,
          title: "Airline Check-in & Smart Bag Drop",
          subtitle: `${airline} · Island Row C (Counters C01–C14)`,
          phase: "Luggage Induction",
          estimatedMinutes: s.wait_minutes,
          walkMinutes: s.walk_minutes || 0,
          crowdLevel: s.crowd_level || "normal",
          narrative: "Head to Island C. Use the self-service bag drop kiosks to scan your digital boarding pass, weigh your bags, and place them on the automated induction belt.",
          proTip: `Counters ${formatCounters(s.recommended_counters)} currently have the fastest clearing speeds.`,
          highlights: [
            { label: "Aisle Location", value: "Row C · Counters 01–14" },
            { label: "Active Counters", value: `${s.counters_open || 6} Open` },
            { label: "Self Bag Drop", value: "Kiosks K1–K8 Available" }
          ],
          amenities: ["Self-Bag Drop Kiosks", "Luggage Tag Dispensers", "Baggage Wrapping", "Oversize Bag Counter"]
        });
      } else if (isSec) {
        steps.push({
          id: s.zone_id,
          number: `0${steps.length + 1}`,
          icon: ShieldCheck,
          title: "Security Screening & ATRS Lanes",
          subtitle: "Zone 2 Central Security · Millimeter-Wave Scanner",
          phase: "Aviation Security",
          estimatedMinutes: s.wait_minutes,
          walkMinutes: s.walk_minutes || 0,
          crowdLevel: s.crowd_level || "medium",
          narrative: "Proceed through the automated tray return system (ATRS). Place all metallic objects, laptops, and liquid containers in separate dedicated bins before passing through the scanner.",
          proTip: "Lanes 4–7 have dual-view CT scanners where large laptops do not need to be removed from bags.",
          highlights: [
            { label: "ATRS Lanes Open", value: `${s.counters_open || 8} Active Lanes` },
            { label: "Recommended Lane", value: "Lane 5 & 6 (Fast Flow)" },
            { label: "Screening Queue", value: `~${s.wait_minutes} mins wait` }
          ],
          amenities: ["Tray Return Assist", "CISF Women's Enclosure", "Special Needs Lane", "Tray Packing Benches"]
        });
      } else if (isEmig) {
        steps.push({
          id: s.zone_id,
          number: `0${steps.length + 1}`,
          icon: FileCheck,
          title: "Passport Control & Emigration",
          subtitle: "International Departures · Emigration Hall",
          phase: "Border Control",
          estimatedMinutes: s.wait_minutes,
          walkMinutes: s.walk_minutes || 0,
          crowdLevel: s.crowd_level || "normal",
          narrative: "Present your passport and boarding token at the emigration counter or smart e-Gate for departure clearance.",
          proTip: "Keep boarding pass barcode face up on your mobile device.",
          highlights: [
            { label: "Emigration Hall", value: "Central Pier T3" },
            { label: "Active Counters", value: `${s.counters_open || 6} Open` },
            { label: "Wait Time", value: `~${s.wait_minutes} mins` }
          ],
          amenities: ["Priority Counter", "Assistance Desk", "Travel Documents Help"]
        });
      } else if (isGate) {
        steps.push({
          id: s.zone_id,
          number: `0${steps.length + 1}`,
          icon: PlaneTakeoff,
          title: `Boarding Gate ${gate} & Aerobridge`,
          subtitle: `Pier ${isGateB ? "B" : "A"} · Group Boarding`,
          phase: "Flight Boarding",
          estimatedMinutes: s.wait_minutes || 0,
          walkMinutes: s.walk_minutes || 0,
          crowdLevel: "normal",
          narrative: `Arrive at Gate ${gate}. Boarding commences 45 minutes prior to departure with zoned passenger queues. Gates close strictly 15 minutes before STD.`,
          proTip: "Have your boarding pass QR code open on your phone at full brightness for the optical gate scanner.",
          highlights: [
            { label: "Boarding Gate", value: `Gate ${gate}` },
            { label: "Boarding Window", value: "STD -45m to STD -15m" },
            { label: "Gate Status", value: "Standby & Pre-boarding" }
          ],
          amenities: ["Gate Area USB Seating", "Priority Boarding Lane", "Gate Information Display"]
        });
      }
    });

    return steps;
  }, [forecastSafe, isArrival, flight, terminal, airline, flightNum, gate, isGateB, carousel, isInternational]);

  const rawAnchor = isArrival
    ? (forecastSafe.ata || forecastSafe.sta)
    : (forecastSafe.etd || forecastSafe.std);
  const anchorTime = rawAnchor ? new Date(rawAnchor) : new Date();

  const totalJourneyTime = Math.round(
    storySteps.reduce((acc, s) => acc + (s.estimatedMinutes || 0) + (s.walkMinutes || 0), 0)
  );

  const departureStartTime = new Date(anchorTime.getTime() - (totalJourneyTime + (forecastSafe.boarding_buffer_minutes || 25)) * 60000);
  const baseTime = isArrival ? anchorTime : departureStartTime;

  let runningTime = new Date(baseTime);
  const timeMoments = storySteps.map((step) => {
    runningTime = new Date(runningTime.getTime() + (step.walkMinutes || 0) * 60000);
    const arrive = new Date(runningTime);
    runningTime = new Date(runningTime.getTime() + (step.estimatedMinutes || 0) * 60000);
    return {
      startTime: arrive,
      endTime: runningTime
    };
  });

  const handleStepEnter = (idx) => {
    setActiveStep(idx);
    setViewedSteps((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleStepLeave = (idx) => {
    setViewedSteps((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const stepPairs = [];
  for (let i = 0; i < storySteps.length; i += 2) {
    stepPairs.push({
      left: { step: storySteps[i], index: i, timing: timeMoments[i] },
      right: storySteps[i + 1]
        ? { step: storySteps[i + 1], index: i + 1, timing: timeMoments[i + 1] }
        : null
    });
  }

  if (!forecast) {
    return (
      <div className="aero-card p-6 text-center text-aero-t3">
        No journey forecast data available for this flight.
      </div>
    );
  }

  return (
    <div
      className="aero-card p-4 sm:p-7 relative overflow-hidden transition-all duration-500"
      data-testid="terminal-journey-story"
    >
      {}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none bg-cyan-500/10 dark:bg-cyan-500/15" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none bg-emerald-500/10 dark:bg-emerald-500/15" />

      {}
      <div className="pb-5 border-b border-aero-border relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Terminal {terminal} · Flight {flightNum}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isArrival ? `${flight.origin} to Delhi` : `Delhi to ${flight.destination}`}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">
            The Terminal Journey Story
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isArrival
              ? "Sequential stage-by-stage walkthrough from touchdown to baggage claim and airport exit."
              : "Sequential stage-by-stage walkthrough from airport arrival through security to your gate."}
          </p>
        </div>

        {}
        <div className="flex items-center gap-4 p-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-sm shrink-0">
          <div>
            <div className="text-[9px] uppercase font-semibold text-slate-400">Total Duration</div>
            <div className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-baseline gap-0.5">
              <span>{totalJourneyTime}</span>
              <span className="text-[10px] font-medium text-slate-500">mins</span>
            </div>
          </div>
          <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-[9px] uppercase font-semibold text-slate-400">Live Progress</div>
            <div className="text-lg font-black font-display text-cyan-600 dark:text-cyan-400 flex items-baseline gap-0.5">
              <span>{liveScrollPct}%</span>
              <span className="text-[10px] font-medium text-slate-500">read</span>
            </div>
          </div>
        </div>
      </div>

      {}
      <div ref={gridContainerRef} className="mt-8 space-y-8 relative z-10">
        {}
        {}
        {}
        {}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-8 pointer-events-none z-10">
          {}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[3px] rounded-full bg-slate-200/80 dark:bg-slate-800/80" />

          {}
          <motion.div
            style={{ scaleY, originY: 0 }}
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[3px] rounded-full bg-gradient-to-b from-cyan-400 via-blue-500 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
          />
        </div>

        {}
        {stepPairs.map((pair, pairIdx) => {
          const leftItem = pair.left;
          const rightItem = pair.right;
          const isLastPair = pairIdx === stepPairs.length - 1;
          const isLeftViewed = viewedSteps.has(leftItem.index);
          const isRightViewed = rightItem ? viewedSteps.has(rightItem.index) : false;

          return (
            <div key={pairIdx} className="space-y-8 relative">
              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-stretch relative">
                {}
                {renderCard(
                  leftItem.step,
                  leftItem.index,
                  leftItem.timing,
                  isLeftViewed,
                  () => handleStepEnter(leftItem.index),
                  () => handleStepLeave(leftItem.index)
                )}

                {}
                {rightItem && (
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center pointer-events-none">
                    {}
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-slate-950/95 border-2 border-cyan-400/70 shadow-xl shadow-cyan-500/25 backdrop-blur-xl">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-[10px] font-mono font-black text-cyan-300 uppercase tracking-wider">
                        Direct Link
                      </span>
                      <div className="flex items-center -space-x-1 text-cyan-400">
                        <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                        <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                      </div>
                    </div>
                  </div>
                )}

                {}
                {rightItem &&
                  renderCard(
                    rightItem.step,
                    rightItem.index,
                    rightItem.timing,
                    isRightViewed,
                    () => handleStepEnter(rightItem.index),
                    () => handleStepLeave(rightItem.index)
                  )}
              </div>

              {}
              {!isLastPair && (
                <div className="py-3 flex items-center justify-center relative">
                  {}
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 dark:via-cyan-400/40 to-transparent" />
                  </div>

                  {}
                  <div className="relative z-20 flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-slate-900 border-2 border-cyan-500/60 shadow-xl shadow-cyan-500/20 backdrop-blur-2xl text-xs font-semibold text-slate-800 dark:text-slate-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <Footprints className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                      Proceed to {storySteps[leftItem.index + (rightItem ? 2 : 1)]?.title.split("·")[0].split("&")[0].trim()}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30">
                      ~{storySteps[leftItem.index + (rightItem ? 2 : 1)]?.walkMinutes || 2} min walk
                    </span>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 grid place-items-center text-white shadow-md">
                      <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {}
      <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-500/15 border border-emerald-500/30 text-center relative z-10 shadow-sm">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display">
          {isArrival ? "Welcome to Delhi!" : "Smooth Travels & Safe Flight!"}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-md mx-auto leading-relaxed">
          {isArrival
            ? "Your terminal journey forecast is complete. Enjoy your stay or transit through IGI Airport Terminal 3."
            : `All ${storySteps.length} checkpoints charted. Have your boarding pass ready at Gate ${gate}.`}
        </p>
      </div>
    </div>
  );
}

function renderCard(step, idx, timing, isViewed, onEnterView, onLeaveView) {
  const Icon = step.icon;
  const theme = TRAFFIC_THEME[step.crowdLevel] || TRAFFIC_THEME.normal;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-50px" }}
      onViewportEnter={onEnterView}
      onViewportLeave={onLeaveView}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl p-4 sm:p-5 border backdrop-blur-xl transition-all duration-300 relative overflow-hidden shadow-sm flex flex-col justify-between ${theme.cardBorder
        } ${theme.cardBg} ${isViewed ? "ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10 scale-[1.01]" : ""
        } hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700`}
    >
      {}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-400"
        style={{ background: theme.color }}
      />

      <div>
        {}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${theme.color}, #0284c7)`
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                  {step.phase}
                </span>
                {isViewed && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 animate-fadeIn">
                    <Check className="w-2.5 h-2.5" /> In View
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold font-display text-slate-900 dark:text-white leading-snug truncate">
                {step.title}
              </h3>
            </div>
          </div>

          <span className="text-base sm:text-lg font-black font-mono text-slate-300 dark:text-slate-700 shrink-0">
            {step.number}
          </span>
        </div>

        {}
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
          <span className="truncate">{step.subtitle}</span>
        </div>

        {}
        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          {step.narrative}
        </p>

        {}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
          {step.highlights.map((h, hIdx) => (
            <div
              key={hIdx}
              className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40"
            >
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                {h.label}
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {h.value}
              </div>
            </div>
          ))}
        </div>

        {}
        <div className="mt-3 p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 text-xs flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-slate-900 dark:text-white">Pro Tip: </span>
            <span className="text-slate-600 dark:text-slate-300">{step.proTip}</span>
          </div>
        </div>

        {}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {step.amenities.map((amenity, aIdx) => (
            <span
              key={aIdx}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
            >
              ✓ {amenity}
            </span>
          ))}
        </div>
      </div>

      {}
      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyan-500" />
          <span>Passage: {formatClock(timing?.startTime)} → {formatClock(timing?.endTime)}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${theme.badgeBg}`}>
          {theme.label}
        </span>
      </div>
    </motion.div>
  );
}
