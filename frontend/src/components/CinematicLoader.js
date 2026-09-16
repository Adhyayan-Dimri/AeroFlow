import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";

const LINES = [
  "INITIALIZING RADAR ARRAY...",
  "CALIBRATING M/M/c QUEUE ENGINE...",
  "SYNCING FLIGHT SCHEDULE FEED · DEL T3...",
  "LOADING BAGGAGE TELEMETRY...",
  "AEROFLOW ONLINE",
];

export default function CinematicLoader({ onDone }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx((i) => Math.min(i + 1, LINES.length - 1)), 150);
    const t = setTimeout(() => onDone && onDone(), 800);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-aero-bg aero-grain overflow-hidden"
      exit={{ opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 aero-grid opacity-30" />
      <div className="relative w-40 h-40 mb-8">
        <div className="absolute inset-0 rounded-full border border-aero-cyan/30" />
        <div className="absolute inset-4 rounded-full border border-aero-cyan/20" />
        <div className="absolute inset-8 rounded-full border border-aero-cyan/10" />
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-70">
          <div className="radar-sweep absolute inset-0 rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Plane className="w-8 h-8 text-aero-cyan float-y" />
        </div>
      </div>
      <div className="font-display text-3xl font-black tracking-tight text-aero-t1">AERO<span className="text-aero-cyan">FLOW</span></div>
      <div className="overline text-aero-t3 mt-2">AI AIRPORT OPERATIONS</div>
      <div className="font-mono text-xs text-aero-cyan/80 mt-8 h-5 flicker-in">{LINES[idx]}</div>
      <div className="w-64 h-[3px] bg-aero-elevated mt-4 rounded-full overflow-hidden">
        <motion.div className="h-full bg-aero-cyan" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8 }} />
      </div>
    </motion.div>
  );
}
