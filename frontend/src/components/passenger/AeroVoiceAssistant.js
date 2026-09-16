import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Clock,
  Navigation,
  ShieldCheck,
  Plane,
  Luggage,
  HelpCircle,
  Accessibility,
  ArrowRight,
  RotateCcw,
  Volume1,
  MessageSquare,
  Compass,
  MapPin,
  Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtTime } from "@/lib/format";

// Web Audio Earcon Synthesizer (Zero asset dependency, instant sound feedback)
class EarconAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playStartListening() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  playResponseReady() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.2);
      });
    } catch (e) {}
  }

  playClose() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }
}

const earcon = new EarconAudio();

// Wayfinding database for DEL Terminal 3
const T3_LOCATIONS = {
  gates: {
    domestic: "Gates 27 through 62 on Departure Concourse Level 2.",
    international: "Gates 1 through 26 on International Pier Level 2.",
    gate32: "Walk past the central duty-free atrium, take the moving walkway towards Pier B. Gate 32 is on your left with tactile paving.",
    gate34: "Continue down Concourse B for 90 meters past the central food court. Gate 34 is on your right.",
    gate15: "After International Immigration and Security, proceed down Pier A for 110 meters. Gate 15 is on the right."
  },
  amenities: {
    wheelchair: "Special Assistance and PRM (Persons with Reduced Mobility) Desk is located adjacent to Departure Entry Gate 4 at the curb, and immediately after Security SHA.",
    prm: "Special Assistance counters are available at Forecourt Gate 4 and Check-in Island B.",
    washrooms: "Accessible restrooms with emergency call buttons are located every 45 meters along both departure piers and next to all boarding gates.",
    security: "Domestic Security Hold Area (SHA) is located straight ahead after Check-in Islands A through D. DigiYatra express biometric lanes are on the extreme right.",
    digiyatra: "DigiYatra biometric e-gates are available at Forecourt Gate 2 and Gate 6, offering seamless touchless entry in under 2 minutes.",
    baggage: "Arrival baggage reclaim belts 1 through 14 are located on Ground Level. Belts 1 through 8 are High-Capacity belts for widebody arrivals.",
    food: "The Central Food Court and accessible dining hub is located on Mezzanine Level, accessible via central glass elevators next to Gate 30."
  }
};

export default function AeroVoiceAssistant({
  selectedFlight,
  forecast,
  savedFlights = [],
  allFlights = [],
  zones = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [transitAdvice, setTransitAdvice] = useState(null);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [originCity, setOriginCity] = useState("Delhi NCR");
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);
  const speechSynthRef = useRef(null);

  const handleVoiceQueryRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          earcon.playStartListening();
        };

        recognition.onresult = (event) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
          if (event.results[current].isFinal && handleVoiceQueryRef.current) {
            handleVoiceQueryRef.current(text);
          }
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error !== "no-speech") {
            toast.error(`Voice Error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keyboard Shortcut: Press 'V' to toggle Voice Assistant
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid triggering when user is typing in form inputs
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            earcon.playStartListening();
            setTimeout(() => {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (err) {}
              }
            }, 400);
          } else {
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            earcon.playClose();
          }
          return next;
        });
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        earcon.playClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Text to Speech
  const speakText = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceRate;
    utterance.pitch = 1.0;
    utterance.lang = "en-IN";

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.lang === "en-IN" || v.lang === "en-GB" || v.lang === "en-US") && v.name.includes("Natural")
    ) || voices.find((v) => v.lang.includes("en"));

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      earcon.playResponseReady();
    };
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceRate]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    stopSpeaking();
    if (!recognitionRef.current) {
      toast.info("Voice Input not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    try {
      setTranscript("");
      recognitionRef.current.start();
    } catch (e) {
      recognitionRef.current.stop();
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (err) {}
      }, 200);
    }
  };

  // Calculate Intelligent Leave Home & Curb-to-Gate Breakdown
  const calculateLeaveHomeAdvice = useCallback((flight) => {
    if (!flight) return null;

    const isIntl = (flight.flight_type || "").toLowerCase() === "international" || (flight.destination || "").length > 3;
    const depTimeStr = flight.departure_time || flight.scheduled_departure;
    
    // Base times in minutes
    const forecourtTime = 3; // DigiYatra entry average
    const checkinTime = isIntl ? 14 : 9;
    const securityTime = 7;
    const immigrationTime = isIntl ? 12 : 0;
    const gateWalkTime = 10;
    const boardingBuffer = isIntl ? 35 : 20;
    const totalTerminalTime = forecourtTime + checkinTime + securityTime + immigrationTime + gateWalkTime + boardingBuffer;

    // City drive time estimation (minutes)
    let cityDriveTime = 45;
    if (originCity.toLowerCase().includes("gurugram") || originCity.toLowerCase().includes("gurgaon")) {
      cityDriveTime = 30;
    } else if (originCity.toLowerCase().includes("noida") || originCity.toLowerCase().includes("greater noida")) {
      cityDriveTime = 65;
    } else if (originCity.toLowerCase().includes("south delhi") || originCity.toLowerCase().includes("vasant")) {
      cityDriveTime = 25;
    }

    const totalPreFlightMinutes = cityDriveTime + totalTerminalTime;

    // Compute Leave Home Timestamp
    let depDate = new Date();
    if (depTimeStr) {
      const parts = depTimeStr.split(":");
      if (parts.length >= 2) {
        depDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      }
    } else {
      depDate.setHours(depDate.getHours() + 3);
    }

    const leaveHomeDate = new Date(depDate.getTime() - totalPreFlightMinutes * 60000);
    const curbArrivalDate = new Date(depDate.getTime() - totalTerminalTime * 60000);

    const formatClock = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

    return {
      flightNumber: flight.flight_number || "AI-102",
      destination: flight.destination || "Destination",
      departureTimeFormatted: formatClock(depDate),
      leaveHomeTimeFormatted: formatClock(leaveHomeDate),
      curbArrivalTimeFormatted: formatClock(curbArrivalDate),
      cityDriveTime,
      totalTerminalTime,
      totalPreFlightMinutes,
      isIntl,
      gateNumber: flight.gate || "Gate 32B",
      breakdown: [
        { label: "Drive to Delhi T3", time: `${cityDriveTime} mins`, desc: `From ${originCity}` },
        { label: "Forecourt Entry", time: `${forecourtTime} mins`, desc: "Gate 2 / DigiYatra E-Gate" },
        { label: "Check-in & Bag Drop", time: `${checkinTime} mins`, desc: isIntl ? "Island C (Intl)" : "Island B (Domestic)" },
        { label: "CISF Security Screening", time: `${securityTime} mins`, desc: "Security Hold Area" },
        ...(isIntl ? [{ label: "Immigration Clearance", time: `${immigrationTime} mins`, desc: "Bureau of Immigration" }] : []),
        { label: "Walk to Gate", time: `${gateWalkTime} mins`, desc: flight.gate ? `To ${flight.gate}` : "To Concourse B" },
        { label: "Boarding Buffer", time: `${boardingBuffer} mins`, desc: "Gate closes before departure" }
      ]
    };
  }, [originCity]);

  // Voice Query Processing Brain
  const handleVoiceQuery = useCallback((queryText) => {
    const q = queryText.toLowerCase().trim();
    if (!q) return;

    // Determine target flight
    const activeFlight = selectedFlight || savedFlights[0] || (allFlights.length > 0 ? allFlights[0] : {
      flight_number: "AI-805",
      destination: "Mumbai (BOM)",
      departure_time: "18:45",
      gate: "Gate 34B",
      carousel_number: "AC-04"
    });

    let spokenAnswer = "";
    let generatedAdvice = null;

    // 1. Leave Home & Transit Timing Intent
    if (
      q.includes("leave home") ||
      q.includes("when should i leave") ||
      q.includes("how much time") ||
      q.includes("transit time") ||
      q.includes("time will it take") ||
      q.includes("when to go") ||
      q.includes("timing") ||
      q.includes("departure advice")
    ) {
      const advice = calculateLeaveHomeAdvice(activeFlight);
      generatedAdvice = advice;
      setTransitAdvice(advice);

      spokenAnswer = `For flight ${advice.flightNumber} to ${advice.destination} departing at ${advice.departureTimeFormatted}: ` +
        `Your total estimated time inside Terminal 3 is ${advice.totalTerminalTime} minutes. ` +
        `With an estimated ${advice.cityDriveTime} minute drive from ${originCity}, we recommend you leave home by ${advice.leaveHomeTimeFormatted}, ` +
        `arriving at the T3 curb by ${advice.curbArrivalTimeFormatted}. ` +
        `This includes 3 minutes for DigiYatra entry, ${advice.breakdown[2].time} for check-in and security, and 10 minutes walk to ${advice.gateNumber}.`;
    }

    // 2. Flight Status & Gate Guidance
    else if (q.includes("flight") || q.includes("gate") || q.includes("where is my") || q.includes("status")) {
      const gateStr = activeFlight.gate || "Gate 32B";
      const depTime = activeFlight.departure_time || activeFlight.scheduled_departure || "06:45 PM";
      spokenAnswer = `Your flight ${activeFlight.flight_number} to ${activeFlight.destination} is on schedule for departure at ${depTime} from ${gateStr}, Terminal 3. ` +
        `Security screening queue is currently running smoothly with an average 4-minute wait time.`;
    }

    // 3. Directions & Wayfinding
    else if (q.includes("direction") || q.includes("how to reach") || q.includes("where is gate") || q.includes("way to")) {
      if (q.includes("gate 34") || q.includes("gate 32") || q.includes("gate 30")) {
        spokenAnswer = T3_LOCATIONS.gates.gate34;
      } else if (q.includes("international") || q.includes("pier a")) {
        spokenAnswer = T3_LOCATIONS.gates.gate15;
      } else {
        spokenAnswer = `To reach domestic boarding gates 27 through 62, proceed straight through Security Hold Area North and follow the illuminated tactile walkway towards the central atrium. Elevator and ramp access are available at every gate.`;
      }
    }

    // 4. Accessibility / PRM Assistance
    else if (q.includes("wheelchair") || q.includes("blind") || q.includes("assistance") || q.includes("help") || q.includes("prm") || q.includes("special assistance")) {
      spokenAnswer = T3_LOCATIONS.amenities.wheelchair + " You can also request an electric buggy or assistance officer at Departure Gate 4.";
    }

    // 5. Security & Queues
    else if (q.includes("security") || q.includes("queue") || q.includes("rush") || q.includes("crowd") || q.includes("digiyatra") || q.includes("wait")) {
      spokenAnswer = `Security Hold Area North has 6 lanes open with a 4-minute wait time. DigiYatra biometric e-gates at Gate 2 and Gate 6 are clear with zero wait time.`;
    }

    // 6. Baggage & Reclaim Belts
    else if (q.includes("baggage") || q.includes("belt") || q.includes("carousel") || q.includes("luggage")) {
      const beltNum = activeFlight.carousel_number || "Belt 4";
      spokenAnswer = `Baggage for arrival flight ${activeFlight.flight_number} is scheduled at High-Capacity ${beltNum} on Ground Reclaim Floor. Estimated bag arrival is within 12 minutes of touchdown.`;
    }

    // 7. General Airport FAQ Fallback
    else {
      spokenAnswer = `I understand you are asking about ${queryText}. Delhi Terminal 3 is operating smoothly. Your flight ${activeFlight.flight_number} departs from ${activeFlight.gate || "Gate 32B"}. You can ask me when to leave home, for step-by-step directions to your gate, or where to find wheelchair assistance.`;
    }

    setResponse(spokenAnswer);
    setHistory((prev) => [{ query: queryText, answer: spokenAnswer, time: new Date() }, ...prev.slice(0, 5)]);
    speakText(spokenAnswer);
  }, [selectedFlight, savedFlights, allFlights, calculateLeaveHomeAdvice, originCity, speakText]);

  useEffect(() => {
    handleVoiceQueryRef.current = handleVoiceQuery;
  }, [handleVoiceQuery]);

  // Trigger quick prompt
  const handleQuickPrompt = (promptText) => {
    setTranscript(promptText);
    handleVoiceQuery(promptText);
  };

  return (
    <>
      {/* 1. Floating High-Contrast Accessible Voice Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              earcon.playStartListening();
              setTimeout(() => startListening(), 350);
            } else {
              setIsOpen(false);
              stopSpeaking();
              earcon.playClose();
            }
          }}
          className={`relative group flex items-center gap-3 px-4 py-3.5 rounded-full shadow-2xl transition-all border-2 cursor-pointer ${
            isOpen
              ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/40"
              : "bg-slate-950/95 text-white border-cyan-500/60 hover:border-cyan-400 shadow-black/60"
          }`}
          aria-label="AeroFlow Accessibility Voice Assistant for Blind and Visually Impaired Passengers"
          title="Press 'V' or click to activate Voice Assistant"
        >
          {/* Animated Neon Pulse Waves */}
          <div className="relative flex items-center justify-center">
            <span className={`absolute w-8 h-8 rounded-full bg-cyan-400/30 ${isListening || isSpeaking ? "animate-ping" : "group-hover:animate-ping"}`} />
            <div className="w-9 h-9 rounded-full bg-cyan-500 text-slate-950 grid place-items-center font-bold">
              {isListening ? (
                <Mic className="w-5 h-5 text-slate-950 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-5 h-5 text-slate-950 animate-bounce" />
              ) : (
                <Accessibility className="w-5 h-5 text-slate-950" />
              )}
            </div>
          </div>

          <div className="flex flex-col items-start pr-1">
            <span className="font-display font-black text-xs sm:text-sm tracking-tight leading-none flex items-center gap-1.5">
              Voice Assistant
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                Press V
              </span>
            </span>
            <span className="text-[10px] opacity-80 text-left font-medium mt-0.5">
              {isListening ? "Listening now..." : isSpeaking ? "Speaking answer..." : "Blind & Accessibility Audio Guide"}
            </span>
          </div>
        </motion.button>
      </div>

      {/* 2. Full High-Contrast Voice Assistant Interface Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[95vw] sm:w-[480px] max-h-[85vh] bg-slate-950/98 backdrop-blur-2xl border-2 border-cyan-500/50 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white p-5 sm:p-6 overflow-y-auto space-y-4 font-sans"
            role="dialog"
            aria-modal="true"
            aria-label="AeroFlow Voice Companion for Blind Passengers"
          >
            {/* Header: Title, Controls, Close */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 grid place-items-center text-cyan-400">
                  <Accessibility className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-base sm:text-lg flex items-center gap-2">
                    AeroVoice Passenger Guide
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Accessibility
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Spoken directions, transit times & gate guidance for DEL T3
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-all cursor-pointer"
                    title="Stop Audio Speech"
                    aria-label="Stop speech"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                    earcon.playClose();
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                  aria-label="Close Voice Assistant (Escape)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Audio Interaction Visualizer & Mic Control */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isListening ? "bg-rose-500 animate-ping" : isSpeaking ? "bg-cyan-400 animate-pulse" : "bg-emerald-400"}`} />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    {isListening ? "Listening to your voice..." : isSpeaking ? "Speaking response..." : "Ready for voice query"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>Speed:</span>
                  <button
                    onClick={() => setVoiceRate((r) => (r === 1.0 ? 1.2 : r === 1.2 ? 0.85 : 1.0))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer text-[11px]"
                  >
                    {voiceRate}x
                  </button>
                </div>
              </div>

              {/* Live Transcript / Speech Wave */}
              <div className="min-h-[52px] flex items-center justify-center p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                {isListening ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      {[40, 80, 50, 90, 60, 100, 70, 45, 85].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h * 0.22}px` }}
                          className="w-1 rounded-full bg-cyan-400 animate-pulse"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-cyan-300 italic font-mono">{transcript || "Speak clearly into microphone..."}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {transcript ? `"${transcript}"` : "Tap microphone below or press 'V' to ask a question."}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <Button
                  onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
                  className={`flex-1 font-bold text-xs sm:text-sm py-2.5 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-1.5" /> Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1.5" /> Tap to Speak
                    </>
                  )}
                </Button>

                {response && !isSpeaking && (
                  <Button
                    variant="outline"
                    onClick={() => speakText(response)}
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold py-2.5 px-3 rounded-xl cursor-pointer"
                    title="Repeat Last Response"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Replay
                  </Button>
                )}
              </div>
            </div>

            {/* Spoken Response Container */}
            {response && (
              <div
                className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2 text-left"
                aria-live="assertive"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Voice Response:
                  </span>
                  {isSpeaking && <span className="text-[10px] animate-pulse">Playing audio...</span>}
                </div>
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                  {response}
                </p>
              </div>
            )}

            {/* Transit & Leave Home Detailed Timeline Card */}
            {transitAdvice && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-display font-bold text-xs text-white">
                      Leave Home Advisory ({transitAdvice.flightNumber})
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Leave by {transitAdvice.leaveHomeTimeFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Terminal 3 Time</div>
                    <div className="font-black text-sm text-cyan-400 font-mono mt-0.5">{transitAdvice.totalTerminalTime} mins</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">T3 Curb Arrival</div>
                    <div className="font-black text-sm text-emerald-400 font-mono mt-0.5">{transitAdvice.curbArrivalTimeFormatted}</div>
                  </div>
                </div>

                {/* Step Breakdown */}
                <div className="space-y-1.5 pt-1 text-xs">
                  {transitAdvice.breakdown.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>{b.label}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-300">{b.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Accessible Questions Chips */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                Quick Spoken Inquiries:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  "When should I leave home for my flight?",
                  "How much time will it take inside T3?",
                  "Where is my flight and gate?",
                  "How to reach Gate 34?",
                  "How crowded is Security right now?",
                  "Where is wheelchair assistance?"
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(q)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white text-left text-[11px] leading-tight transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* City Origin Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-cyan-400" /> Origin:
              </span>
              <select
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-300 rounded-lg px-2 py-1 text-[11px] font-mono cursor-pointer"
              >
                <option value="Delhi NCR">Delhi NCR (45 mins drive)</option>
                <option value="Gurugram">Gurugram / CyberCity (30 mins drive)</option>
                <option value="Noida">Noida / Greater Noida (65 mins drive)</option>
                <option value="South Delhi">South Delhi / Vasant Kunj (25 mins drive)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
