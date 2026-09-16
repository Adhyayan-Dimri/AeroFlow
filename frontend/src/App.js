import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import PassengerPortal from "@/pages/PassengerPortal";
import OpsConsole from "@/pages/OpsConsole";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AeroFlow UI Error Boundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem("aero_token");
      localStorage.removeItem("aero-theme");
      sessionStorage.clear();
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 text-2xl font-bold">
            ✈
          </div>
          <h1 className="text-2xl font-bold mb-2">AeroFlow Reconnecting</h1>
          <p className="text-slate-400 max-w-md mb-6 text-sm">
            {this.state.error?.message ? String(this.state.error.message) : "Click below to refresh and load AeroFlow."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg text-sm cursor-pointer"
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-all text-sm cursor-pointer"
            >
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <div className="App min-h-screen bg-slate-50 dark:bg-[#071017] text-slate-900 dark:text-slate-100 font-body transition-colors duration-200">
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
            <Toaster position="top-right" richColors closeButton theme="dark" />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

