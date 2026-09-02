import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ staffOnly, children }) {
  const { user, checked, isStaff } = useAuth();
  const loc = useLocation();
  if (!checked || user === null) {
    return <div className="min-h-[60vh] grid place-items-center text-aero-t2"><Loader2 className="w-6 h-6 animate-spin text-aero-cyan" /></div>;
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;
  return children;
}
