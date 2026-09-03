import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const STAFF_ROLES = ["ops_manager", "security_lead", "baggage_ops", "admin", "ground_staff"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(false);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) {
      try { localStorage.setItem("aero_token", data.access_token); } catch {}
    }
    setUser(data.user);
    return data.user;
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post("/auth/otp/verify", { email, otp });
    if (data.access_token) {
      try { localStorage.setItem("aero_token", data.access_token); } catch {}
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      localStorage.removeItem("aero_token");
      await api.post("/auth/logout");
    } catch {}
    setUser(false);
  };

  const isStaff = user && STAFF_ROLES.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, checked, refresh, login, verifyOtp, logout, isStaff, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}
