import React from "react";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1687552626877-f4596995931c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxhaXJwb3J0JTIwdGVybWluYWwlMjBtb2Rlcm58ZW58MHx8fHwxNzg3ODA2MzE4fDA&ixlib=rb-4.1.0&q=85";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden aero-grain">
        <img src={HERO} alt="terminal" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-tr from-aero-bg via-aero-bg/70 to-transparent" />
        <div className="absolute inset-0 aero-grid opacity-20" />
        <div className="relative p-12 flex flex-col h-full justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-aero-cyan" />
            <span className="font-display font-black text-xl">AERO<span className="text-aero-cyan">FLOW</span></span>
          </div>
          <div>
            <div className="overline text-aero-cyan mb-3">Smart Airport Operations</div>
            <h2 className="font-display text-4xl font-black leading-tight max-w-md">Predict congestion. Move baggage smarter.</h2>
            <p className="text-aero-t2 mt-3 max-w-md">Queueing-theory forecasts for passengers and a tactical console for ground operations.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-black">{title}</h1>
          {subtitle && <p className="text-aero-t2 mt-2 text-sm">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
