import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AeroFlow React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#040D12] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            The application encountered an issue while rendering. Please click below to reset the cache and reload cleanly.
          </p>
          {this.state.error && (
            <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 text-rose-300 text-xs font-mono max-w-lg overflow-x-auto text-left">
              {this.state.error.toString()}
            </div>
          )}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch {}
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-md shadow-cyan-500/20"
            >
              <RefreshCw className="w-4 h-4" /> Reset & Reload Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2"
            >
              <Home className="w-4 h-4" /> Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
