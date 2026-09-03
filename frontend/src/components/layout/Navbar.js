import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Sun, Moon, Radar, LogOut, UserCircle2, LayoutDashboard, Info, Menu, X, ShieldAlert, Sparkles, Plane } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv); }, []);
  const ist = t.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-300">
      <Radar className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
      <span className="tabular-nums font-semibold">{ist}</span>
      <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">IST · DEL T3</span>
    </div>
  );
}

const SCROLL_THRESHOLD_DOWN = 60;
const SCROLL_THRESHOLD_UP = 20;
const LERP_SPEED = 0.12;
const SCROLL_END_MS = 120;

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, isStaff, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [, forceUpdate] = useState({});
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const onOps = loc.pathname.startsWith("/ops");

  const headerRef = useRef(null);
  const innerRef = useRef(null);
  const rafId = useRef(0);
  const currentScale = useRef(1);
  const targetScale = useRef(1);
  const scrollEndTimer = useRef(null);
  const isAnimating = useRef(false);

  const [scrolled, setScrolled] = useState(false);

  const SCALE_FULL = 1;
  const SCALE_SHRUNK = 0.98;

  const animate = useCallback(() => {
    if (window.innerWidth < 768) return;
    const diff = targetScale.current - currentScale.current;
    if (Math.abs(diff) < 0.001) {
      currentScale.current = targetScale.current;
      isAnimating.current = false;
    } else {
      currentScale.current += diff * LERP_SPEED;
      rafId.current = requestAnimationFrame(animate);
    }

    if (innerRef.current) {
      const s = currentScale.current;
      innerRef.current.style.transform = `scale(${s})`;
      innerRef.current.style.transformOrigin = "center center";
    }

    if (headerRef.current) {
      const shrunk = currentScale.current < (SCALE_FULL + SCALE_SHRUNK) / 2;
      headerRef.current.style.boxShadow = shrunk
        ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)"
        : "0 1px 2px 0 rgba(0,0,0,0.05)";
    }
  }, []);

  const startAnimating = useCallback(() => {
    if (window.innerWidth < 768) return;
    if (!isAnimating.current) {
      isAnimating.current = true;
      rafId.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  useEffect(() => {
    const onScroll = () => {
      const sy = window.scrollY;
      if (sy > SCROLL_THRESHOLD_DOWN) {
        targetScale.current = SCALE_SHRUNK;
        setScrolled(true);
      } else if (sy < SCROLL_THRESHOLD_UP) {
        targetScale.current = SCALE_FULL;
        setScrolled(false);
      }

      startAnimating();

      clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = setTimeout(() => {
        currentScale.current = targetScale.current;
        if (innerRef.current && window.innerWidth >= 768) {
          innerRef.current.style.transform = `scale(${targetScale.current})`;
          innerRef.current.style.transformOrigin = "center center";
        }
        isAnimating.current = false;
        cancelAnimationFrame(rafId.current);
      }, SCROLL_END_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
      clearTimeout(scrollEndTimer.current);
    };
  }, [startAnimating]);

  useEffect(() => {
    forceUpdate({});
    setMobileMenuOpen(false);
  }, [loc.pathname]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-[99999] backdrop-blur-xl bg-white/95 dark:bg-[#071318]/95 border-b border-slate-200 dark:border-slate-800 py-1.5 sm:py-2.5 shadow-xs"
      data-testid="navbar"
    >
      <div
        ref={innerRef}
        className="max-w-[1400px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-18"
      >
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0" data-testid="nav-logo">
          <img
            src="/logo.png"
            alt="AeroFlow Logo"
            className="object-contain w-9 h-9 sm:w-14 sm:h-14 transition-transform duration-300 ease-out group-hover:scale-105"
          />
          <div className="leading-tight">
            <div className="font-display font-black tracking-tight text-slate-900 dark:text-white text-base sm:text-2xl">
              AERO<span className="text-cyan-600 dark:text-cyan-400">FLOW</span>
            </div>
            <div className="overline text-slate-500 dark:text-slate-400 font-bold text-[8px] sm:text-[10px] tracking-wider hidden xs:block">
              DELHI · IGI T3
            </div>
          </div>
        </Link>

        <div
          className={`hidden md:flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 shadow-inner transition-all duration-300 ${
            scrolled ? "p-0.5" : "p-1.5"
          }`}
        >
          <NavLink
            to="/"
            data-testid="nav-mode-passenger-toggle"
            className={({ isActive }) =>
              `rounded-full font-semibold transition-all ${
                scrolled ? "px-4 py-1 text-xs sm:text-sm" : "px-4 sm:px-5 py-1.5 text-xs sm:text-sm"
              } ${
                isActive && !onOps
                  ? "bg-cyan-500 text-slate-950 shadow-sm font-bold scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`
            }
          >
            Passenger Portal
          </NavLink>
          <NavLink
            to={isStaff ? "/ops" : "/login?type=staff&next=/ops"}
            data-testid="nav-mode-ops-toggle"
            className={({ isActive }) =>
              `rounded-full font-semibold transition-all ${
                scrolled ? "px-4 py-1 text-xs sm:text-sm" : "px-4 sm:px-5 py-1.5 text-xs sm:text-sm"
              } ${
                onOps
                  ? "bg-cyan-500 text-slate-950 shadow-sm font-bold scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`
            }
          >
            Airport Operations
          </NavLink>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden lg:block mr-1">
            <Clock />
          </div>

          <button
            data-testid="about-btn"
            onClick={() => setAboutOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors shadow-xs cursor-pointer"
            title="About AeroFlow"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            data-testid="theme-toggle"
            onClick={toggle}
            className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40 transition-colors shadow-xs cursor-pointer"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isStaff && !onOps && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => nav("/ops")}
                  data-testid="nav-goto-ops"
                  className="hidden md:flex text-xs font-semibold border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 h-8"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1" /> Ops
                </Button>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-200 shadow-xs">
                <UserCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="max-w-[70px] sm:max-w-[110px] truncate font-medium">{user.name}</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    isStaff
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-500/30"
                      : "bg-cyan-500/20 text-cyan-800 dark:text-cyan-400 border border-cyan-500/30"
                  }`}
                >
                  {user.role === "ground_staff" ? "Ground" : isStaff ? "Staff" : "Pax"}
                </span>
              </div>
              <button
                data-testid="nav-logout"
                onClick={async () => {
                  await logout();
                  nav("/");
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {onOps ? (
                <Button
                  size="sm"
                  onClick={() => nav("/login?type=staff&next=/ops")}
                  data-testid="nav-signin-staff"
                  className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs sm:text-sm px-2.5 sm:px-4 h-8 sm:h-9 rounded-full shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Staff Login
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => nav("/login?type=passenger&next=/")}
                  data-testid="nav-signin-passenger"
                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold text-xs sm:text-sm px-2.5 sm:px-4 h-8 sm:h-9 rounded-full shadow-xs"
                >
                  <UserCircle2 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  Sign in
                </Button>
              )}
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 grid place-items-center rounded-xl border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer shrink-0"
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-[#071318]/98 backdrop-blur-xl px-4 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive && !onOps
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4" />
                <span>Passenger Portal</span>
              </div>
              <span className="text-[11px] opacity-75 font-mono">Flights & Journey</span>
            </NavLink>

            <NavLink
              to={isStaff ? "/ops" : "/login?type=staff&next=/ops"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  onOps
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Airport Operations</span>
              </div>
              <span className="text-[11px] opacity-75 font-mono">Staff Console</span>
            </NavLink>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Clock />
            {!user && (
              <Button
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  nav(onOps ? "/login?type=staff&next=/ops" : "/login?type=passenger&next=/");
                }}
                className={`${
                  onOps ? "bg-amber-500 text-slate-950" : "bg-cyan-500 text-slate-950"
                } text-xs font-bold rounded-full h-8 px-3.5`}
              >
                {onOps ? "Staff Login" : "Sign in"}
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-display font-black">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-600 dark:text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span>AeroFlow</span>
                <span className="text-xs block text-slate-500 dark:text-slate-400 font-mono font-normal">
                  Next-Gen Predictive Airport Digital Twin
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            <p>
              AeroFlow is an AI-powered terminal orchestration and passenger journey platform built specifically for Delhi Indira Gandhi International Airport (Terminal 3).
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <span>Real-time Queues</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Physics-based queuing models predict bottleneck congestion 15–30 minutes in advance.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                  <span>Smart Baggage</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Machine learning model for carousel arrival and claim time SLA prediction.
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
