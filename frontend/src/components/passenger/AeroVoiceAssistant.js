import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
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
  Car,
  Languages
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtTime } from "@/lib/format";

// Web Audio Earcon Synthesizer (Instant sound cues)
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

// Wayfinding database for DEL Terminal 3 (English & Hindi)
const T3_LOCATIONS = {
  gate34: {
    en: "To reach Gate 34, proceed past the central duty-free atrium down Concourse B for 90 meters. Gate 34 has tactile paving, elevator, and ramp access.",
    hi: "गेट 34 जाने के लिए ड्यूटी फ्री से आगे कॉनकोर्स B में 90 मीटर सीधे चलें। गेट 34 पर लिफ्ट और रैंप की सुविधा उपलब्ध है।"
  },
  gate15: {
    en: "After International Immigration and Security, proceed down Pier A for 110 meters. Gate 15 is on your right.",
    hi: "इंटरनेशनल इमिग्रेशन और सिक्योरिटी के बाद पियर A में 110 मीटर आगे बढ़ें। गेट 15 दाईं ओर स्थित है।"
  },
  generalGates: {
    en: "To reach boarding gates, proceed through Security Hold Area North and follow the illuminated tactile walkway towards the central atrium. Elevators are available at every gate.",
    hi: "बोर्डिंग गेट्स तक पहुंचने के लिए सिक्योरिटी एरिया नॉर्थ से सीधे सेंट्रल एट्रियम की ओर बढ़ें। सभी गेट्स पर लिफ्ट उपलब्ध है।"
  },
  wheelchair: {
    en: "Special Assistance and PRM desk is located adjacent to Departure Entry Gate 4 at the curb, and immediately after Security SHA. Assistance officers and electric buggies are on duty.",
    hi: "व्हीलचेयर और विशेष सहायता डेस्क डिपार्चर गेट 4 और सिक्योरिटी एरिया के तुरंत बाद उपलब्ध है। सहायता अधिकारी और इलेक्ट्रिक बग्गी तैनात हैं।"
  },
  security: {
    en: "Security screening currently has 6 active lanes with an average 4-minute wait. DigiYatra biometric e-gates at Gate 2 and Gate 6 are clear with zero wait.",
    hi: "सुरक्षा जांच में 6 लेन खुली हैं और औसतन 4 मिनट का समय लग रहा है। गेट 2 पर डिजीयात्रा ई-गेट पूरी तरह खाली है।"
  },
  baggage: {
    en: "Arrival baggage reclaim belts are on the Ground Floor. High-Capacity belts 1 to 8 handle widebody arrivals. Bags arrive within 12 minutes of touchdown.",
    hi: "आगमन बैगेज बेल्ट ग्राउंड फ्लोर पर स्थित हैं। बेल्ट 1 से 8 पर बड़े विमानों का सामान आता है। बैग 12 मिनट में पहुंच जाएंगे।"
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
  const [response, setResponse] = useState(null); // { en: string, hi: string }
  const [transitAdvice, setTransitAdvice] = useState(null);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [inputLang, setInputLang] = useState("hi-IN"); // 'hi-IN' supports both Hindi & English seamlessly
  const [originCity, setOriginCity] = useState("Delhi NCR");
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
        recognition.lang = inputLang;

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
  }, [inputLang]);

  // Keyboard Shortcut: Press 'V' to toggle Voice Assistant
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

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
            }, 350);
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

  // Dual-Language Speech Synthesis: First speaks English, then Hindi!
  const speakBilingual = useCallback((englishText, hindiText) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();

    // 1. English Utterance
    const utterEn = new SpeechSynthesisUtterance(englishText);
    utterEn.rate = voiceRate;
    utterEn.pitch = 1.0;
    utterEn.lang = "en-IN";

    const enVoice = voices.find(
      (v) => (v.lang === "en-IN" || v.lang === "en-GB" || v.lang === "en-US") && v.name.includes("Natural")
    ) || voices.find((v) => v.lang.includes("en"));
    if (enVoice) utterEn.voice = enVoice;

    // 2. Hindi Utterance
    const utterHi = new SpeechSynthesisUtterance(hindiText);
    utterHi.rate = Math.max(0.85, voiceRate * 0.95);
    utterHi.pitch = 1.0;
    utterHi.lang = "hi-IN";

    const hiVoice = voices.find((v) => v.lang === "hi-IN" || v.lang.includes("hi")) || enVoice;
    if (hiVoice) utterHi.voice = hiVoice;

    utterEn.onstart = () => {
      setIsSpeaking(true);
      earcon.playResponseReady();
    };

    utterEn.onend = () => {
      if (hindiText) {
        window.speechSynthesis.speak(utterHi);
      } else {
        setIsSpeaking(false);
      }
    };

    utterHi.onend = () => setIsSpeaking(false);
    utterHi.onerror = () => setIsSpeaking(false);
    utterEn.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterEn);
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
      toast.info("Voice recognition supported in Chrome, Edge, and Safari.");
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

function AudioEqualizerIcon({ active, isSpeaking, className = "w-4 h-4" }) {
  return (
    <div className={`flex items-center justify-center gap-[2.5px] ${className}`} aria-hidden="true">
      <span className={`w-[2.5px] rounded-full bg-current transition-all duration-200 ${active || isSpeaking ? "h-3.5 animate-pulse" : "h-2"}`} />
      <span className={`w-[2.5px] rounded-full bg-current transition-all duration-200 ${active || isSpeaking ? "h-5 animate-bounce" : "h-4"}`} />
      <span className={`w-[2.5px] rounded-full bg-current transition-all duration-200 ${active || isSpeaking ? "h-3 animate-pulse" : "h-2.5"}`} />
      <span className={`w-[2.5px] rounded-full bg-current transition-all duration-200 ${active || isSpeaking ? "h-4.5 animate-bounce" : "h-3.5"}`} />
    </div>
  );
}

  // Calculate Intelligent Leave Home & Curb-to-Gate Breakdown
  const calculateLeaveHomeAdvice = useCallback((flight) => {
    if (!flight) return null;

    const isIntl = (flight.flight_type || "").toLowerCase() === "international" || (flight.destination || "").length > 3;
    const depTimeStr = flight.departure_time || flight.scheduled_departure;
    
    const forecourtTime = 3;
    const checkinTime = isIntl ? 12 : 8;
    const securityTime = 6;
    const immigrationTime = isIntl ? 10 : 0;
    const gateWalkTime = 9;
    const boardingBuffer = isIntl ? 30 : 20;
    const totalTerminalTime = forecourtTime + checkinTime + securityTime + immigrationTime + gateWalkTime + boardingBuffer;

    let cityDriveTime = 45;
    if (originCity.toLowerCase().includes("gurugram") || originCity.toLowerCase().includes("gurgaon")) {
      cityDriveTime = 30;
    } else if (originCity.toLowerCase().includes("noida")) {
      cityDriveTime = 60;
    } else if (originCity.toLowerCase().includes("south delhi")) {
      cityDriveTime = 25;
    }

    const totalPreFlightMinutes = cityDriveTime + totalTerminalTime;

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
        { label: "Drive to T3", time: `${cityDriveTime}m`, desc: `From ${originCity}` },
        { label: "DigiYatra Entry", time: `${forecourtTime}m`, desc: "Gate 2 / E-Gate" },
        { label: "Check-in", time: `${checkinTime}m`, desc: isIntl ? "Island C" : "Island B" },
        { label: "CISF Security", time: `${securityTime}m`, desc: "Security Area" },
        ...(isIntl ? [{ label: "Immigration", time: `${immigrationTime}m`, desc: "Immigration Hall" }] : []),
        { label: "Walk to Gate", time: `${gateWalkTime}m`, desc: flight.gate || "Gate 32B" },
        { label: "Boarding Buffer", time: `${boardingBuffer}m`, desc: "Pre-departure" }
      ]
    };
  }, [originCity]);

  // Voice Query Brain with Dual-Language Generation & Hindi NLP Recognition
  const handleVoiceQuery = useCallback((queryText) => {
    const q = queryText.toLowerCase().trim();
    if (!q) return;

    const activeFlight = selectedFlight || savedFlights[0] || (allFlights.length > 0 ? allFlights[0] : {
      flight_number: "AI-805",
      destination: "Mumbai (BOM)",
      departure_time: "18:45",
      gate: "Gate 34B",
      carousel_number: "AC-04"
    });

    let answerEn = "";
    let answerHi = "";

    // 1. Leave Home & Transit Timing Intent (English, Hindi Devanagari, Hinglish)
    if (
      q.includes("leave home") ||
      q.includes("when should i leave") ||
      q.includes("how much time") ||
      q.includes("transit time") ||
      q.includes("time will it take") ||
      q.includes("when to go") ||
      q.includes("timing") ||
      q.includes("departure advice") ||
      q.includes("घर") ||
      q.includes("निकल") ||
      q.includes("समय") ||
      q.includes("टाइम") ||
      q.includes("वक्त") ||
      q.includes("kab nikle") ||
      q.includes("kab nikalna") ||
      q.includes("kitna time") ||
      q.includes("kitna samay") ||
      q.includes("ghar se")
    ) {
      const advice = calculateLeaveHomeAdvice(activeFlight);
      setTransitAdvice(advice);

      answerEn = `For flight ${advice.flightNumber} to ${advice.destination} departing at ${advice.departureTimeFormatted}: ` +
        `Your total time in Terminal 3 is approximately ${advice.totalTerminalTime} minutes. ` +
        `With a ${advice.cityDriveTime}-minute drive from ${originCity}, please leave home by ${advice.leaveHomeTimeFormatted} ` +
        `to reach the T3 curb by ${advice.curbArrivalTimeFormatted}.`;

      answerHi = `फ्लाइट ${advice.flightNumber} (${advice.destination}) के लिए: ` +
        `टर्मिनल 3 में कुल ${advice.totalTerminalTime} मिनट लगेंगे। ` +
        `${originCity} से कृपया ${advice.leaveHomeTimeFormatted} बजे तक घर से निकलें ताकि ${advice.curbArrivalTimeFormatted} तक टी3 पहुंच सकें।`;
    }

    // 2. Flight Status & Gate Guidance
    else if (
      q.includes("flight") ||
      q.includes("gate") ||
      q.includes("where is my") ||
      q.includes("status") ||
      q.includes("गेट") ||
      q.includes("फ्लाइट") ||
      q.includes("विमान") ||
      q.includes("उड़ान") ||
      q.includes("उड़ान") ||
      q.includes("कहाँ") ||
      q.includes("किधर") ||
      q.includes("kahan") ||
      q.includes("kidhar") ||
      q.includes("mera flight")
    ) {
      const gateStr = activeFlight.gate || "Gate 32B";
      const depTime = activeFlight.departure_time || activeFlight.scheduled_departure || "06:45 PM";
      
      answerEn = `Flight ${activeFlight.flight_number} to ${activeFlight.destination} departs at ${depTime} from ${gateStr}, Terminal 3. Security queue is currently 4 minutes.`;
      answerHi = `फ्लाइट ${activeFlight.flight_number} ${activeFlight.destination} के लिए समय ${depTime} पर ${gateStr}, टर्मिनल 3 से रवाना होगी। सुरक्षा जांच में 4 मिनट का समय लग रहा है।`;
    }

    // 3. Directions & Wayfinding
    else if (
      q.includes("direction") ||
      q.includes("how to reach") ||
      q.includes("where is gate") ||
      q.includes("way to") ||
      q.includes("रास्ता") ||
      q.includes("दिशा") ||
      q.includes("कैसे पहुंचे") ||
      q.includes("कैसे जाऊं") ||
      q.includes("rasta") ||
      q.includes("kaise pauhchu") ||
      q.includes("kaise jau")
    ) {
      if (q.includes("gate 34") || q.includes("gate 32") || q.includes("gate 30") || q.includes("34") || q.includes("32")) {
        answerEn = T3_LOCATIONS.gate34.en;
        answerHi = T3_LOCATIONS.gate34.hi;
      } else if (q.includes("international") || q.includes("pier a") || q.includes("15") || q.includes("इमिग्रेशन")) {
        answerEn = T3_LOCATIONS.gate15.en;
        answerHi = T3_LOCATIONS.gate15.hi;
      } else {
        answerEn = T3_LOCATIONS.generalGates.en;
        answerHi = T3_LOCATIONS.generalGates.hi;
      }
    }

    // 4. Accessibility / PRM Assistance
    else if (
      q.includes("wheelchair") ||
      q.includes("blind") ||
      q.includes("assistance") ||
      q.includes("help") ||
      q.includes("prm") ||
      q.includes("special assistance") ||
      q.includes("व्हीलचेयर") ||
      q.includes("सहायता") ||
      q.includes("मदद") ||
      q.includes("दिव्यांग") ||
      q.includes("नेत्रहीन") ||
      q.includes("madad") ||
      q.includes("sahayata")
    ) {
      answerEn = T3_LOCATIONS.wheelchair.en;
      answerHi = T3_LOCATIONS.wheelchair.hi;
    }

    // 5. Security & Queues
    else if (
      q.includes("security") ||
      q.includes("queue") ||
      q.includes("rush") ||
      q.includes("crowd") ||
      q.includes("digiyatra") ||
      q.includes("wait") ||
      q.includes("सुरक्षा") ||
      q.includes("सिक्योरिटी") ||
      q.includes("जांच") ||
      q.includes("कतार") ||
      q.includes("लाइन") ||
      q.includes("भीड़") ||
      q.includes("भीड") ||
      q.includes("डिजीयात्रा") ||
      q.includes("bheed") ||
      q.includes("suraksha")
    ) {
      answerEn = T3_LOCATIONS.security.en;
      answerHi = T3_LOCATIONS.security.hi;
    }

    // 6. Baggage & Reclaim Belts
    else if (
      q.includes("baggage") ||
      q.includes("belt") ||
      q.includes("carousel") ||
      q.includes("luggage") ||
      q.includes("सामान") ||
      q.includes("बैग") ||
      q.includes("बैगेज") ||
      q.includes("बेल्ट") ||
      q.includes("कैरउसेल") ||
      q.includes("saman") ||
      q.includes("luggage")
    ) {
      const beltNum = activeFlight.carousel_number || "Belt 4";
      answerEn = `Arrival baggage for ${activeFlight.flight_number} is scheduled at ${beltNum} on Ground Reclaim. Bags arrive within 12 minutes of touchdown.`;
      answerHi = `फ्लाइट ${activeFlight.flight_number} का बैगेज ग्राउंड फ्लोर पर ${beltNum} पर आएगा। बैग 12 मिनट में पहुंच जाएंगे।`;
    }

    // 7. General Airport FAQ Fallback
    else {
      answerEn = `Terminal 3 is operating smoothly. Flight ${activeFlight.flight_number} departs from ${activeFlight.gate || "Gate 32B"}. Ask me when to leave home or for directions to your gate.`;
      answerHi = `टर्मिनल 3 सामान्य रूप से संचालित है। फ्लाइट ${activeFlight.flight_number} गेट ${activeFlight.gate || "32B"} से छूटेगी। आप घर से निकलने का समय या रास्ता पूछ सकते हैं।`;
    }

    const fullResponse = { en: answerEn, hi: answerHi };
    setResponse(fullResponse);
    speakBilingual(answerEn, answerHi);
  }, [selectedFlight, savedFlights, allFlights, calculateLeaveHomeAdvice, originCity, speakBilingual]);

  useEffect(() => {
    handleVoiceQueryRef.current = handleVoiceQuery;
  }, [handleVoiceQuery]);

  const handleQuickPrompt = (promptText) => {
    setTranscript(promptText);
    handleVoiceQuery(promptText);
  };

  return (
    <>
      {/* Floating High-Definition Voice Assistant Trigger Pill */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              earcon.playStartListening();
              setTimeout(() => startListening(), 300);
            } else {
              setIsOpen(false);
              stopSpeaking();
              earcon.playClose();
            }
          }}
          className={`relative group flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-2xl transition-all border-2 cursor-pointer ${
            isOpen
              ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/30"
              : "bg-white dark:bg-[#071318] text-slate-900 dark:text-white border-cyan-500/80 hover:border-cyan-400 shadow-slate-900/15 dark:shadow-black/60"
          }`}
          aria-label="AeroFlow Accessibility Voice Assistant"
          title="Press 'V' or click for Voice Assistant"
        >
          <div className="relative flex items-center justify-center">
            <span className={`absolute w-7 h-7 rounded-full bg-cyan-400/30 ${isListening || isSpeaking ? "animate-ping" : "group-hover:animate-ping"}`} />
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 grid place-items-center font-black shrink-0 shadow-sm">
              <AudioEqualizerIcon active={isListening} isSpeaking={isSpeaking} className="text-slate-950" />
            </div>
          </div>

          <div className="flex flex-col items-start pr-0.5">
            <span className="font-display font-black text-xs sm:text-sm tracking-tight leading-none flex items-center gap-1.5">
              Voice Assistant
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Press V
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <Languages className="w-2.5 h-2.5 text-cyan-500" />
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "EN + हिंदी Audio Guide"}
            </span>
          </div>
        </motion.button>
      </div>

      {/* Compact, Light & Dark Responsive Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[380px] max-h-[70vh] bg-white/95 dark:bg-[#071318]/95 backdrop-blur-2xl border-2 border-slate-200 dark:border-cyan-500/40 rounded-3xl shadow-2xl text-slate-900 dark:text-white p-4 sm:p-5 flex flex-col font-sans overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="AeroVoice Assistant Dialog"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-600 dark:text-cyan-400">
                  <AudioEqualizerIcon active={isListening} isSpeaking={isSpeaking} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-display font-black text-sm sm:text-base flex items-center gap-1.5 leading-none">
                    AeroVoice Audio Guide
                  </h2>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Bilingual (English + हिंदी) Navigation
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                    title="Stop Audio"
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
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  aria-label="Close Voice Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3 scrollbar-thin">
              {/* Mic & Wave Box */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <span className={`w-2 h-2 rounded-full ${isListening ? "bg-rose-500 animate-ping" : isSpeaking ? "bg-cyan-500 animate-pulse" : "bg-emerald-500"}`} />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      {isListening ? "Listening to your voice..." : isSpeaking ? "Speaking bilingual response..." : "Ready for voice query"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInputLang((l) => (l === "hi-IN" ? "en-IN" : "hi-IN"))}
                      className="px-1.5 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 font-mono text-[9px] cursor-pointer"
                      title="Switch Voice Input Language"
                    >
                      {inputLang === "hi-IN" ? "🇮🇳 हिंदी" : "🇬🇧 English"}
                    </button>
                    <button
                      onClick={() => setVoiceRate((r) => (r === 1.0 ? 1.2 : r === 1.2 ? 0.85 : 1.0))}
                      className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px] cursor-pointer"
                      title="Speech Speed"
                    >
                      {voiceRate}x
                    </button>
                  </div>
                </div>

                {/* Live Transcript / Prompt */}
                <div className="min-h-[42px] flex items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-center">
                  {isListening ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        {[30, 70, 45, 80, 50, 90, 60, 40].map((h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h * 0.18}px` }}
                            className="w-1 rounded-full bg-cyan-500 animate-pulse"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400 italic font-mono">{transcript || "Listening in Hindi & English..."}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                      {transcript ? `"${transcript}"` : "Tap speak or press 'V' to ask in Hindi (हिंदी) or English."}
                    </p>
                  )}
                </div>

                {/* Speak Button & Replay */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
                    className={`flex-1 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 hover:bg-rose-600 text-white"
                        : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-sm"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 mr-1" /> Stop Listening
                      </>
                    ) : (
                      <>
                        <AudioEqualizerIcon active={false} className="mr-1.5" /> Tap to Speak (हिंदी / English)
                      </>
                    )}
                  </Button>

                  {response && !isSpeaking && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => speakBilingual(response.en, response.hi)}
                      className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 text-xs px-2.5 rounded-xl cursor-pointer"
                      title="Replay Audio"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Replay
                    </Button>
                  )}
                </div>
              </div>

              {/* Spoken Response Container (Clean, no shiny symbol, bilingual output) */}
              {response && (
                <div
                  className="p-3.5 rounded-2xl bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 space-y-2 text-left"
                  aria-live="assertive"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> Assistant Response:
                    </span>
                    {isSpeaking && <span className="text-[9px] animate-pulse">Playing audio...</span>}
                  </div>

                  {/* English Response */}
                  <div className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                    <span className="font-bold text-cyan-700 dark:text-cyan-400 mr-1.5">English:</span>
                    {response.en}
                  </div>

                  {/* Hindi Response */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium pt-2 border-t border-cyan-200/60 dark:border-cyan-500/20">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">हिंदी:</span>
                    {response.hi}
                  </div>
                </div>
              )}

              {/* Leave Home & Transit Timing Card */}
              {transitAdvice && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold font-display text-slate-900 dark:text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Leave Home Advisory ({transitAdvice.flightNumber})
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {transitAdvice.leaveHomeTimeFormatted}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase font-mono">T3 Time</div>
                      <div className="font-black text-xs text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{transitAdvice.totalTerminalTime} mins</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 uppercase font-mono">Curb Arrival</div>
                      <div className="font-black text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{transitAdvice.curbArrivalTimeFormatted}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                    {transitAdvice.breakdown.slice(0, 6).map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1 rounded bg-white dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/60">
                        <span className="text-slate-600 dark:text-slate-400 truncate pr-1">{b.label}</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{b.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Questions */}
              <div className="space-y-1.5 pt-0.5">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Quick Inquiries:
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { en: "When should I leave home for my flight?", hi: "घर से कब निकलना चाहिए?" },
                    { en: "How much time will it take inside T3?", hi: "टर्मिनल में कितना समय लगेगा?" },
                    { en: "Where is my flight and gate?", hi: "मेरी फ्लाइट और गेट कहाँ है?" },
                    { en: "Where is wheelchair assistance?", hi: "व्हीलचेयर सहायता कहाँ मिलेगी?" }
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(inputLang === "hi-IN" ? q.hi : q.en)}
                      className="p-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-left text-[11px] leading-tight transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{q.en}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">· {q.hi}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer: City Origin */}
            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <MapPin className="w-3 h-3 text-cyan-500" /> Origin:
              </span>
              <select
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-cyan-300 rounded-lg px-2 py-1 text-[10px] font-mono cursor-pointer"
              >
                <option value="Delhi NCR">Delhi NCR (45m drive)</option>
                <option value="Gurugram">Gurugram (30m drive)</option>
                <option value="Noida">Noida (60m drive)</option>
                <option value="South Delhi">South Delhi (25m drive)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
