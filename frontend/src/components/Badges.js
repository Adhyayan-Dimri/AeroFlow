import React from "react";

const MAP = {
  normal: { label: "Normal", cls: "text-aero-emerald bg-emerald-500/10 border-emerald-500/30" },
  medium: { label: "Moderate", cls: "text-aero-amber bg-amber-500/10 border-amber-500/30" },
  heavy: { label: "Heavy Rush", cls: "text-aero-rose bg-rose-500/10 border-rose-500/30" },
};

export function CrowdBadge({ level, className = "", testId }) {
  const m = MAP[level] || MAP.normal;
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {m.label}
    </span>
  );
}

const SEV = {
  info: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  warning: "text-aero-amber bg-amber-500/10 border-amber-500/30",
  critical: "text-aero-rose bg-rose-500/10 border-rose-500/30",
};
export function SeverityBadge({ severity, testId }) {
  return (
    <span data-testid={testId} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold ${SEV[severity] || SEV.info}`}>
      {severity}
    </span>
  );
}
