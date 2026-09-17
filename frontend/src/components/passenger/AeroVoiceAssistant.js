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
  CheckCircle2,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

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

// Intelligent flight parsing from spoken text or inputs
function findFlightInQuery(text, flightList = []) {
  if (!text || !flightList.length) return null;
  const clean = text.trim().toLowerCase();

  // 1. Direct airline code & number matching (e.g. AI-102, 6E-2132, AI 102, 6E 2132, UK 955)
  const flightCodeRegex = /\b(ai|6e|uk|sg|ba|ek|qr|ey|lh|sq)[\s-]?(\d{2,4})\b/i;
  const codeMatch = clean.match(flightCodeRegex);
  if (codeMatch) {
    const carrier = codeMatch[1].toUpperCase();
    const num = codeMatch[2];
    const found = flightList.find((f) => {
      const fn = (f.flight_number || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return fn === `${carrier}${num}` || fn.includes(`${carrier}${num}`);
    });
    if (found) return found;
  }

  // 2. Airline name + number (e.g. "air india 102", "indigo 204", "vistara 955")
  const airlineNames = [
    { name: "air india", code: "AI" },
    { name: "indigo", code: "6E" },
    { name: "vistara", code: "UK" },
    { name: "spicejet", code: "SG" },
    { name: "emirates", code: "EK" },
    { name: "british airways", code: "BA" },
  ];
  for (const al of airlineNames) {
    if (clean.includes(al.name)) {
      const numMatch = clean.match(/\b\d{2,4}\b/);
      if (numMatch) {
        const num = numMatch[0];
        const found = flightList.find((f) => {
          const fn = (f.flight_number || "").toUpperCase();
          return (fn.includes(al.code) && fn.includes(num)) || (f.airline || "").toLowerCase().includes(al.name);
        });
        if (found) return found;
      }
    }
  }

  // 3. Just digits if explicitly mentioned with flight/नंबर (e.g. "flight 102", "flight 805")
  const digitMatch = clean.match(/\b(?:flight|विमान|उड़ान|नंबर|number)?\s*(\d{3,4})\b/);
  if (digitMatch) {
    const num = digitMatch[1];
    const found = flightList.find((f) => (f.flight_number || "").includes(num));
    if (found) return found;
  }

  // 4. Destination city match (e.g. "flight to mumbai", "london", "dubai", "goa", "bengaluru")
  const cities = [
    "mumbai", "london", "dubai", "bengaluru", "bangalore", "singapore", "toronto",
    "goa", "hyderabad", "chennai", "kolkata", "paris", "frankfurt", "doha", "new york",
    "ahmedabad", "pune", "jaipur", "lucknow", "srinagar", "kochi", "amritsar", "tokyo"
  ];
  for (const city of cities) {
    if (clean.includes(city)) {
      const found = flightList.find((f) =>
        (f.destination || "").toLowerCase().includes(city) || (f.origin || "").toLowerCase().includes(city)
      );
      if (found) return found;
    }
  }

  return null;
}

// Cleanly format any timestamp (ISO string, 24h, or formatted time) into human-readable clock format
function safeFormatTime(val) {
  if (!val) return "06:45 PM";
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(s)) return s;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    }
  } catch (e) {}
  return s;
}

// Intelligent language auto-detection (Devanagari script + Hinglish / Hindi keywords vs English)
function detectLanguage(text) {
  if (!text) return "en";

  // 1. Devanagari Unicode script range (\u0900-\u097F) -> strictly Hindi
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  const clean = text.toLowerCase().trim();

  // 2. Explicit switch requests
  if (
    clean.includes("hindi") ||
    clean.includes("हिंदी") ||
    clean.includes("hindustani") ||
    clean.includes("in hindi")
  ) {
    return "hi";
  }
  if (
    clean.includes("english") ||
    clean.includes("अंग्रेजी") ||
    clean.includes("in english")
  ) {
    return "en";
  }

  // 3. Hinglish & Hindi phonetic keywords
  const hinglishTokens = new Set([
    // Question & inquiry tokens
    "kahan", "kaha", "kidhar", "kab", "kaise", "kitna", "kitne", "kitni", "kya", "kyun", "kyu", "kaun", "kaunsa", "kaunsi",
    // Pronouns & address
    "mera", "meri", "mere", "mujhe", "mujhko", "apna", "apni", "apne", "hum", "hamein", "aap", "bhai",
    // Verbs & auxiliaries
    "nikalna", "nikal", "nikle", "niklu", "nikale", "niklegi", "niklega",
    "jana", "jaana", "jaye", "jayen", "jaun", "jaunga", "jaungi",
    "pahunchna", "pahuchna", "pahuche", "pahuchenge", "pahuchengi",
    "batao", "bataiye", "bata", "bolo", "boliye", "bataye", "batayen",
    "chhootegi", "chhutegi", "chutegi", "milegi", "milega", "aayega", "aayegi",
    "hoga", "hogi", "hoge", "hai", "hain", "ho", "hoon", "tha", "thi", "the",
    "lag", "lagega", "lagegi", "kare", "karo", "kijiye",
    // Common nouns & airport words
    "ghar", "vakt", "waqt", "samay", "rasta", "madad", "sahayata", "saman", "saaman",
    "bheed", "bhid", "baje", "kripya", "dhanyawad", "shukriya", "namaste", "namaskar",
    // Prepositions/particles
    "se", "mein", "me", "ko", "par", "pe", "ke", "ki", "ka", "liye"
  ]);

  const words = clean.split(/[^a-z0-9]+/);
  let hindiHits = 0;
  for (const w of words) {
    if (hinglishTokens.has(w)) {
      hindiHits++;
    }
  }

  // Strong signals that unambiguously indicate Hindi / Hinglish inquiry
  const strongTokens = [
    "kahan", "kaha", "kidhar", "kab", "kaise", "kitna", "kitne", "kitni", "kya", "kaunsa", "kaunsi",
    "nikalna", "nikle", "niklu", "niklegi", "niklega", "batao", "bataiye", "bata", "bataye",
    "chhootegi", "chhutegi", "milegi", "milega", "aayega", "aayegi", "lagega", "lagegi",
    "samay", "vakt", "waqt", "rasta", "madad", "ghar", "saman", "saaman", "baje"
  ];
  if (words.some((w) => strongTokens.includes(w)) || hindiHits >= 1) {
    return "hi";
  }

  return "en";
}

export default function AeroVoiceAssistant({
  selectedFlight,
  forecast,
  savedFlights = [],
  onSelectFlight
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Auto-detected language ('en' | 'hi'), updates automatically on every query
  const [currentLang, setCurrentLang] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState(null); // text in currentLang
  const [transitAdvice, setTransitAdvice] = useState(null);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [originCity, setOriginCity] = useState("Delhi NCR");
  
  // Live flight list & multi-turn conversational context
  const [liveFlights, setLiveFlights] = useState([]);
  const [activeFlight, setActiveFlight] = useState(selectedFlight || null);
  const [waitingForFlight, setWaitingForFlight] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null); // 'leave_home' | 'gate' | 'status'

  const recognitionRef = useRef(null);
  const handleVoiceQueryRef = useRef(null);

  // Sync active flight if selectedFlight prop changes from portal
  useEffect(() => {
    if (selectedFlight) {
      setActiveFlight(selectedFlight);
    }
  }, [selectedFlight]);

  // Load all active flights for live lookup across Terminal 3
  useEffect(() => {
    api.get("/flights/search", { params: { limit: 120 } })
      .then(({ data }) => {
        setLiveFlights(data.flights || []);
      })
      .catch(() => {
        setLiveFlights([]);
      });
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // en-IN natively supports both English and Hinglish dictation

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
  }, []); // Initialize only once, allowing en-IN to handle both English and Hinglish continuously

  // Speak single language based on detected query language
  const speakInLanguage = useCallback((text, targetLang = null) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();
    const lang = targetLang || currentLang || "en";
    const voices = window.speechSynthesis.getVoices();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = lang === "hi" ? Math.max(0.88, voiceRate * 0.95) : voiceRate;
    utter.pitch = 1.0;
    utter.lang = lang === "hi" ? "hi-IN" : "en-IN";

    if (lang === "hi") {
      const hiVoice = voices.find((v) => v.lang === "hi-IN" || v.lang.includes("hi"));
      if (hiVoice) utter.voice = hiVoice;
    } else {
      const enVoice = voices.find(
        (v) => (v.lang === "en-IN" || v.lang === "en-GB" || v.lang === "en-US") && v.name.includes("Natural")
      ) || voices.find((v) => v.lang.includes("en"));
      if (enVoice) utter.voice = enVoice;
    }

    utter.onstart = () => {
      setIsSpeaking(true);
      earcon.playResponseReady();
    };
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utter);
  }, [currentLang, voiceRate]);

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
            stopSpeaking();
            earcon.playClose();
          }
          return next;
        });
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        stopSpeaking();
        earcon.playClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Calculate Intelligent Leave Home & Curb-to-Gate Breakdown
  const calculateLeaveHomeAdvice = useCallback((flight) => {
    if (!flight) return null;

    let hasForecast = false;
    let forecastSafe = null;
    if (forecast && flight.flight_number === selectedFlight?.flight_number) {
      hasForecast = true;
      forecastSafe = forecast || {};
    }

    const isIntl = (flight.flight_type || "").toLowerCase() === "international" || (flight.destination || "").length > 3;
    const depTimeStr = flight.departure_time || flight.scheduled_departure || flight.etd || flight.std;

    let totalTerminalTime = 0;
    let cityDriveTime = 45;
    let totalPreFlightMinutes = 0;
    let leaveHomeDate = null;
    let curbArrivalDate = null;
    
    let depDate = new Date();
    if (depTimeStr) {
      if (typeof depTimeStr === "string" && (depTimeStr.includes("T") || depTimeStr.includes("-"))) {
        const parsed = new Date(depTimeStr);
        if (!isNaN(parsed.getTime())) {
          depDate = parsed;
        }
      } else if (typeof depTimeStr === "string") {
        const parts = depTimeStr.split(":");
        if (parts.length >= 2) {
          depDate.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
        }
      }
    } else {
      depDate.setHours(depDate.getHours() + 3);
    }

    let forecourtTime = 3, checkinTime = isIntl ? 12 : 8, securityTime = 6, immigrationTime = isIntl ? 10 : 0, gateWalkTime = 9, boardingBuffer = isIntl ? 30 : 20;

    if (hasForecast && forecastSafe.suggested_airport_arrival) {
      cityDriveTime = forecastSafe.travel_time_minutes || 45;
      totalPreFlightMinutes = forecastSafe.total_journey_minutes || 90;
      totalTerminalTime = Math.max(0, totalPreFlightMinutes - cityDriveTime);
      
      leaveHomeDate = new Date(new Date(forecastSafe.suggested_airport_arrival).getTime() - cityDriveTime * 60000);
      curbArrivalDate = new Date(forecastSafe.suggested_airport_arrival);
    } else {
      if (originCity.toLowerCase().includes("gurugram") || originCity.toLowerCase().includes("gurgaon")) {
        cityDriveTime = 30;
      } else if (originCity.toLowerCase().includes("noida")) {
        cityDriveTime = 60;
      } else if (originCity.toLowerCase().includes("south delhi")) {
        cityDriveTime = 25;
      }

      totalTerminalTime = forecourtTime + checkinTime + securityTime + immigrationTime + gateWalkTime + boardingBuffer;
      totalPreFlightMinutes = cityDriveTime + totalTerminalTime;
      leaveHomeDate = new Date(depDate.getTime() - totalPreFlightMinutes * 60000);
      curbArrivalDate = new Date(depDate.getTime() - totalTerminalTime * 60000);
    }

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
  }, [originCity, forecast, selectedFlight]);

  // Voice Query Brain: Auto-Detect Language, Dynamic Flight Parsing & Follow-Up
  const handleVoiceQuery = useCallback(
    (queryText) => {
      const q = queryText.toLowerCase().trim();
      if (!q) return;

      // 1. Auto-detect language of this query (switches dynamically if user changes language)
      const detectedLang = detectLanguage(queryText);
      setCurrentLang(detectedLang);

      // 2. Check if a specific flight is mentioned in this query
      const flightPool = liveFlights.length > 0 ? liveFlights : savedFlights;
      const mentionedFlight = findFlightInQuery(q, flightPool);

      if (mentionedFlight) {
        setActiveFlight(mentionedFlight);
        setWaitingForFlight(false);
        if (onSelectFlight) {
          onSelectFlight(mentionedFlight);
        }
      }

      const effectiveFlight = mentionedFlight || activeFlight || selectedFlight;

      // 3. If currently waiting for user to provide flight details (Follow-up handling)
      if (waitingForFlight) {
        if (mentionedFlight) {
          setWaitingForFlight(false);
          // Execute pending intent for the identified flight in detected language
          if (pendingIntent === "leave_home") {
            const advice = calculateLeaveHomeAdvice(mentionedFlight);
            setTransitAdvice(advice);

            const answer =
              detectedLang === "hi"
                ? `फ्लाइट ${advice.flightNumber} (${advice.destination}) के लिए: टर्मिनल 3 में कुल ${advice.totalTerminalTime} मिनट लगेंगे। ${originCity} से कृपया ${advice.leaveHomeTimeFormatted} बजे तक घर से निकलें ताकि ${advice.curbArrivalTimeFormatted} तक टी3 पहुंच सकें।`
                : `For flight ${advice.flightNumber} to ${advice.destination} departing at ${advice.departureTimeFormatted}: Your total time in Terminal 3 is approximately ${advice.totalTerminalTime} minutes. With a ${advice.cityDriveTime}-minute drive from ${originCity}, please leave home by ${advice.leaveHomeTimeFormatted} to reach T3 by ${advice.curbArrivalTimeFormatted}.`;

            setResponse(answer);
            speakInLanguage(answer, detectedLang);
            return;
          } else {
            const gateStr = mentionedFlight.gate || "Gate 32B";
            const rawDep = mentionedFlight.departure_time || mentionedFlight.scheduled_departure || mentionedFlight.std;
            const depTime = safeFormatTime(rawDep);
            const answer =
              detectedLang === "hi"
                ? `फ्लाइट ${mentionedFlight.flight_number} ${mentionedFlight.destination} के लिए समय ${depTime} पर ${gateStr}, टर्मिनल 3 से छूटेगी।`
                : `Flight ${mentionedFlight.flight_number} to ${mentionedFlight.destination} departs at ${depTime} from ${gateStr}, Terminal 3.`;

            setResponse(answer);
            speakInLanguage(answer, detectedLang);
            return;
          }
        } else {
          // Still couldn't find the flight
          const promptAgain =
            detectedLang === "hi"
              ? `मुझे '${queryText}' से मिलती हुई कोई उड़ान नहीं मिली। कृपया फ्लाइट नंबर जैसे AI-102 या गंतव्य जैसे मुंबई बताएं।`
              : `I couldn't find a flight matching '${queryText}'. Please tell me a flight number like AI-102 or destination like Mumbai.`;

          setResponse(promptAgain);
          speakInLanguage(promptAgain, detectedLang);
          return;
        }
      }

      let answer = "";

      // Smart Regex Intent Matching
      const isLeaveHomeIntent = /leave (home|house)|when (should i|to) (leave|go)|transit time|how much time|time (will it|to) take|departure advice|ghar( se)? nikal|kab nikalna|kab nikle|kitna time|ghar se|samay|vakt|waqt|time/i.test(q) && !/where is|kahan/i.test(q);
      const isGateIntent = /gate|where is my (flight|gate)|flight status|gate number|kaunsa gate|kahan se (niklegi|chhutegi|jayegi)|kidhar/i.test(q) || q.includes("गेट") || q.includes("कहाँ");
      const isDirectionsIntent = /direction|how to reach|where is|way to|rasta|kaise (pauhchu|jaye)|रास्ता|दिशा|कैसे (पहुंचे|जाऊं)/i.test(q) && !isGateIntent;

      // 4. Leave Home & Transit Timing Intent
      if (isLeaveHomeIntent) {
        if (!effectiveFlight) {
          setWaitingForFlight(true);
          setPendingIntent("leave_home");

          const askDetails =
            detectedLang === "hi"
              ? "बिल्कुल! कृपया अपना फ्लाइट नंबर, या गंतव्य शहर बताएं ताकि मैं सटीक समय की गणना कर सकूं।"
              : "Sure! Please tell me your flight number, or destination city so I can calculate your exact travel timing.";

          setResponse(askDetails);
          speakInLanguage(askDetails, detectedLang);
          return;
        }

        const advice = calculateLeaveHomeAdvice(effectiveFlight);
        setTransitAdvice(advice);

        answer =
          detectedLang === "hi"
            ? `फ्लाइट ${advice.flightNumber} (${advice.destination}) के लिए: आपको टर्मिनल 3 में लगभग ${advice.totalTerminalTime} मिनट लगेंगे। ${originCity} से कृपया ${advice.leaveHomeTimeFormatted} बजे तक घर से निकलें ताकि आप ${advice.curbArrivalTimeFormatted} तक टी3 पहुंच सकें।`
            : `For flight ${advice.flightNumber} to ${advice.destination} departing at ${advice.departureTimeFormatted}: Your total time in Terminal 3 is approximately ${advice.totalTerminalTime} minutes. With a ${advice.cityDriveTime}-minute drive from ${originCity}, please leave home by ${advice.leaveHomeTimeFormatted} to reach T3 by ${advice.curbArrivalTimeFormatted}.`;
      }
      // 5. Flight Status & Gate Guidance
      else if (isGateIntent) {
        if (!effectiveFlight) {
          setWaitingForFlight(true);
          setPendingIntent("gate");

          const askDetails =
            detectedLang === "hi"
              ? "आप किस उड़ान या गेट के बारे में जानना चाहते हैं? कृपया अपना फ्लाइट नंबर या गंतव्य बताएं।"
              : "Which flight would you like to check? Please tell me your flight number or destination city.";

          setResponse(askDetails);
          speakInLanguage(askDetails, detectedLang);
          return;
        }

        const gateStr = effectiveFlight.gate || "Gate 32B";
        const rawDep = effectiveFlight.departure_time || effectiveFlight.scheduled_departure || effectiveFlight.std;
        const depTime = safeFormatTime(rawDep);

        answer =
          detectedLang === "hi"
            ? `फ्लाइट ${effectiveFlight.flight_number} ${effectiveFlight.destination} के लिए समय ${depTime} पर ${gateStr}, टर्मिनल 3 से रवाना होगी। सुरक्षा जांच में 4 मिनट का समय लग रहा है।`
            : `Flight ${effectiveFlight.flight_number} to ${effectiveFlight.destination} departs at ${depTime} from ${gateStr}, Terminal 3. Security queue is currently 4 minutes.`;
      }
      // 6. Directions & Wayfinding
      else if (isDirectionsIntent) {
        if (q.includes("gate 34") || q.includes("gate 32") || q.includes("gate 30") || q.includes("34") || q.includes("32")) {
          answer = T3_LOCATIONS.gate34[detectedLang];
        } else if (q.includes("international") || q.includes("pier a") || q.includes("15") || q.includes("इमिग्रेशन")) {
          answer = T3_LOCATIONS.gate15[detectedLang];
        } else {
          answer = T3_LOCATIONS.generalGates[detectedLang];
        }
      }
      // 7. Accessibility / PRM Assistance
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
        q.includes("madad")
      ) {
        answer = T3_LOCATIONS.wheelchair[detectedLang];
      }
      // 8. Security & Queues
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
        q.includes("डिजीयात्रा")
      ) {
        answer = T3_LOCATIONS.security[detectedLang];
      }
      // 9. Baggage & Reclaim Belts
      else if (
        q.includes("baggage") ||
        q.includes("belt") ||
        q.includes("carousel") ||
        q.includes("luggage") ||
        q.includes("सामान") ||
        q.includes("बैग") ||
        q.includes("बैगेज") ||
        q.includes("बेल्ट") ||
        q.includes("saman")
      ) {
        const beltNum = effectiveFlight?.carousel_number || "Belt 4";
        const fNum = effectiveFlight ? effectiveFlight.flight_number : (detectedLang === "hi" ? "आपकी फ्लाइट" : "your flight");

        answer =
          detectedLang === "hi"
            ? `फ्लाइट ${fNum} का बैगेज ग्राउंड फ्लोर पर ${beltNum} पर आएगा। बैग 12 मिनट में पहुंच जाएंगे।`
            : `Arrival baggage for ${fNum} is scheduled at ${beltNum} on Ground Reclaim. Bags arrive within 12 minutes of touchdown.`;
      }
      // 10. General Airport Fallback
      else {
        if (effectiveFlight) {
          answer =
            detectedLang === "hi"
              ? `फ्लाइट ${effectiveFlight.flight_number} गेट ${effectiveFlight.gate || "32B"} से छूटेगी। आप घर से निकलने का समय या रास्ता पूछ सकते हैं।`
              : `Terminal 3 is operating smoothly. Flight ${effectiveFlight.flight_number} departs from ${effectiveFlight.gate || "Gate 32B"}. Ask me when to leave home or for directions.`;
        } else {
          answer =
            detectedLang === "hi"
              ? "टर्मिनल 3 सामान्य रूप से संचालित है। अपनी फ्लाइट का नंबर या शहर बताएं ताकि मैं आपको सटीक समय और गेट की जानकारी दे सकूं।"
              : "Terminal 3 is operating smoothly. Please tell me your flight number or destination to check your gate or leave-home schedule.";
        }
      }

      setResponse(answer);
      speakInLanguage(answer, detectedLang);
    },
    [liveFlights, savedFlights, activeFlight, selectedFlight, onSelectFlight, waitingForFlight, pendingIntent, calculateLeaveHomeAdvice, originCity, speakInLanguage]
  );

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
              setTimeout(() => {
                startListening();
              }, 300);
            } else {
              setIsOpen(false);
              stopSpeaking();
              earcon.playClose();
            }
          }}
          className={`relative group flex items-center gap-3 px-4 py-2.5 sm:px-4.5 sm:py-3 rounded-full shadow-2xl transition-all border-2 cursor-pointer ${
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
              <Mic className="w-4 h-4 text-slate-950" />
            </div>
          </div>

          <div className="flex flex-col items-start pr-0.5">
            <span className="font-display font-black text-xs sm:text-sm tracking-tight leading-none flex items-center gap-1.5">
              Voice Assistant
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Press V
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Terminal 3 Smart Voice
            </span>
          </div>
        </motion.button>
      </div>

      {/* Decluttered, Clean & Spacious Audio Guide Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[390px] max-h-[75vh] bg-white/95 dark:bg-[#071318]/95 backdrop-blur-2xl border-2 border-slate-200 dark:border-cyan-500/40 rounded-3xl shadow-2xl text-slate-900 dark:text-white p-5 flex flex-col font-sans overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="AeroVoice Assistant Dialog"
          >
            {/* Header: Clean & Spacious with Auto-Language Badge */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                  <Mic className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h2 className="font-display font-black text-base leading-tight">
                    AeroVoice Guide
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Terminal 3 Voice Navigation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">

                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-all cursor-pointer"
                    title="Stop Speaking"
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
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  aria-label="Close Voice Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Direct Workspace without language selection barrier */}
            <div className="flex-1 overflow-y-auto pr-1 py-3.5 space-y-3.5 scrollbar-thin">
              {/* Active Flight Indicator (If identified) */}
              {activeFlight && (
                <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-mono font-bold text-cyan-700 dark:text-cyan-300">
                    <Plane className="w-3.5 h-3.5" />
                    {activeFlight.flight_number} ({activeFlight.destination})
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Gate {activeFlight.gate || "TBD"} · {safeFormatTime(activeFlight.std || activeFlight.departure_time || activeFlight.scheduled_departure) || "Scheduled"}
                  </span>
                </div>
              )}

              {/* Primary Voice Action Hub */}
              <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="flex items-center justify-center">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                      isListening
                        ? "bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse"
                        : isSpeaking
                        ? "bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30"
                        : "bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 hover:scale-105"
                    }`}
                    title={isListening ? "Stop listening" : "Tap to speak"}
                  >
                    <Mic className="w-6 h-6" />
                  </motion.button>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isListening
                      ? currentLang === "hi" ? "आपकी आवाज़ सुनी जा रही है..." : "Listening to your voice..."
                      : isSpeaking
                      ? currentLang === "hi" ? "उत्तर बोला जा रहा है..." : "Speaking response..."
                      : currentLang === "hi" ? "बोलने के लिए ऊपर टैप करें या 'V' दबाएं" : "Tap above or press 'V' to speak"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {transcript
                      ? `"${transcript}"`
                      : waitingForFlight
                      ? currentLang === "hi"
                        ? "कृपया अपनी उड़ान संख्या (जैसे AI-102) या शहर बताएं..."
                        : "Please tell your flight number (like AI-102) or destination city..."
                      : currentLang === "hi"
                      ? "घर से निकलने का समय, गेट, व्हीलचेयर या सामान के बारे में पूछें।"
                      : "Ask when to leave home, gate directions, wheelchair, or baggage."}
                  </p>
                </div>

                {response && !isSpeaking && (
                  <div className="pt-1 flex items-center justify-center">
                    <button
                      onClick={() => speakInLanguage(response, currentLang)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 text-[11px] font-medium hover:bg-slate-100 cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {currentLang === "hi" ? "ऑडियो दोबारा सुनें" : "Replay Audio"}
                    </button>
                  </div>
                )}
              </div>

              {/* Spoken Response Container */}
              {response && (
                <div
                  className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/25 border border-cyan-200/80 dark:border-cyan-500/30 space-y-2.5 text-left"
                  aria-live="assertive"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      {currentLang === "hi" ? "सहायक उत्तर" : "Assistant Response"}
                    </span>
                    <span className="text-[9px] lowercase font-sans opacity-70">
                      ({currentLang === "hi" ? "हिंदी" : "English"})
                    </span>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                    {response}
                  </div>
                </div>
              )}

              {/* Leave Home Timing Pill (When available) */}
              {transitAdvice && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {currentLang === "hi" ? "घर से निकलने का समय" : "Leave Home Time"} ({transitAdvice.flightNumber})
                    </span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800">
                      {transitAdvice.leaveHomeTimeFormatted}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-mono">
                        {currentLang === "hi" ? "टी3 समय" : "T3 Process Time"}
                      </div>
                      <div className="font-bold text-xs text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                        {transitAdvice.totalTerminalTime} {currentLang === "hi" ? "मिनट" : "mins"}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-mono">
                        {currentLang === "hi" ? "एयरपोर्ट आगमन" : "Curb Arrival"}
                      </div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                        {transitAdvice.curbArrivalTimeFormatted}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Inquiry Prompts (In current detected language) */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {currentLang === "hi" ? "सुझाए गए प्रश्न:" : "Quick Inquiries:"}
                </div>
                <div className="space-y-1.5">
                  {(currentLang === "hi"
                    ? [
                        { text: "मेरी फ्लाइट के लिए घर से कब निकलना चाहिए?", desc: "घर से निकलने का समय और रूट ट्रैफ़िक" },
                        { text: "टर्मिनल 3 में कुल कितना समय लगेगा?", desc: "सुरक्षा जांच, चेक-इन और गेट वॉक" },
                        { text: "मेरी फ्लाइट और गेट कहाँ स्थित है?", desc: "उड़ान स्थिति और बोर्डिंग गेट" },
                        { text: "व्हीलचेयर और विशेष सहायता कहाँ मिलेगी?", desc: "दिव्यांग सहायता डेस्क व बग्गी" }
                      ]
                    : [
                        { text: "When should I leave home for my flight?", desc: "Calculates drive time and airport transit" },
                        { text: "How much time will it take inside T3?", desc: "Check-in, security screening, and gate walk" },
                        { text: "Where is my flight and gate?", desc: "Departure time, terminal, and boarding gate" },
                        { text: "Where is wheelchair assistance?", desc: "PRM desk, buggy, and accessible routes" }
                      ]
                  ).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(q.text)}
                      className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700/50 text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 leading-tight">
                          {q.text}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {q.desc}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean Minimal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-cyan-500" />
                <select
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  className="bg-transparent border-0 font-medium text-slate-800 dark:text-cyan-300 text-[11px] cursor-pointer p-0 focus:ring-0"
                >
                  <option value="Delhi NCR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Delhi NCR (45m drive)</option>
                  <option value="Gurugram" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Gurugram (30m drive)</option>
                  <option value="Noida" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Noida (60m drive)</option>
                  <option value="South Delhi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">South Delhi (25m drive)</option>
                </select>
              </div>

              <button
                onClick={() => setVoiceRate((r) => (r === 1.0 ? 1.2 : r === 1.2 ? 0.85 : 1.0))}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono cursor-pointer"
                title="Voice Speed"
              >
                Speed: {voiceRate}x
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
