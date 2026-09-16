import React, { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import CinematicLoader from "@/components/CinematicLoader";
import ProtectedRoute from "@/components/ProtectedRoute";
import PassengerPortal from "@/pages/PassengerPortal";
import OpsConsole from "@/pages/OpsConsole";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

function Shell() {
  const location = useLocation();
  const isAuthPage = ["/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/" element={<PassengerPortal />} />
        <Route path="/ops" element={<ProtectedRoute staffOnly><OpsConsole /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [booted, setBooted] = useState(() =>
    sessionStorage.getItem("aero-booted") === "1" || new URLSearchParams(window.location.search).has("fast")
  );
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App min-h-screen bg-aero-bg text-aero-t1 font-body">
          <AnimatePresence>
            {!booted && <CinematicLoader onDone={() => { sessionStorage.setItem("aero-booted", "1"); setBooted(true); }} />}
          </AnimatePresence>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
          <Toaster position="top-right" richColors closeButton theme="dark" />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
