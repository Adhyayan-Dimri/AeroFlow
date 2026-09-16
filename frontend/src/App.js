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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 text-2xl font-bold">
            ✈
          </div>
          <h1 className="text-2xl font-bold mb-2">AeroFlow Reconnecting</h1>
          <p className="text-slate-400 max-w-md mb-6 text-sm">
            The application encountered a display refresh. Click below to reload and continue your journey seamlessly.
          </p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg"
          >
            Reload AeroFlow
          </button>
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

