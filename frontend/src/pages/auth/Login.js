import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, UserCircle, Plane, Sparkles } from "lucide-react";
import AuthShell from "./AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login, verifyOtp, formatApiError } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const loginType = params.get("type") || (params.get("next")?.startsWith("/ops") ? "staff" : "passenger");
  const next = params.get("next") || (loginType === "staff" ? "/ops" : "/");
  const isStaffFlow = loginType === "staff" || next.startsWith("/ops");

  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePostLogin = async (u) => {
    toast.success(`Welcome back, ${u.name}`);
    const pendingSave = sessionStorage.getItem("pending_save_flight") || params.get("save_flight");
    if (pendingSave) {
      sessionStorage.removeItem("pending_save_flight");
      let fid = pendingSave;
      let fnum = "";
      try {
        const parsed = JSON.parse(pendingSave);
        fid = parsed.flight_id;
        fnum = parsed.flight_number;
      } catch {}
      try {
        await api.post("/users/me/saved-flights", { flight_id: fid });
        toast.success(`Flight ${fnum || ''} saved to your account!`);
      } catch {}
    }

    if (u.role === "passenger") {
      nav(next && !next.startsWith("/ops") ? next : "/");
    } else {
      nav(next.startsWith("/ops") ? next : "/ops");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await login(email, password);
      if (res?.otp_required) {
        setStep("otp");
        if (res?.dev_otp) {
          setOtp(res.dev_otp);
          toast.success(`Verification code: ${res.dev_otp}`, { duration: 10000 });
        } else {
          toast.info("Please enter the 6-digit verification code sent to your email.");
        }
        return;
      }
      await handlePostLogin(res);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const u = await verifyOtp(email, otp);
      await handlePostLogin(u);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/auth/otp/resend", { email });
      if (data?.dev_otp) {
        setOtp(data.dev_otp);
        toast.success(`Verification code: ${data.dev_otp}`, { duration: 10000 });
      } else {
        toast.success("A new verification code was sent to your email");
      }
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  if (step === "otp") {
    return (
      <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email}.`}>
        <div className="space-y-5" data-testid="otp-form">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="otp-input">
            <InputOTPGroup className="w-full justify-between">
              {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} className="w-12 h-12 text-lg" />)}
            </InputOTPGroup>
          </InputOTP>
          {err && <div className="text-sm text-aero-rose" data-testid="otp-error">{err}</div>}
          <Button data-testid="otp-verify-btn" disabled={busy || otp.length < 6} onClick={verify}
            className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
            {busy ? "Verifying…" : "Verify & Continue"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep("form")} className="text-aero-t2 hover:text-aero-t1">← Back</button>
            <button type="button" onClick={resend} disabled={busy} className="text-aero-cyan hover:underline disabled:opacity-50" data-testid="otp-resend-btn">
              Resend code
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isStaffFlow ? "Airport Operations Login" : "Passenger Sign in"}
      subtitle={isStaffFlow ? "Authorized staff, terminal duty managers, and baggage operators." : "Track your flights, live queue predictions, and baggage alerts."}>

      {}
      <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold mb-4 ${isStaffFlow ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"}`}>
        <div className="flex items-center gap-2">
          {isStaffFlow ? <ShieldCheck className="w-4 h-4 text-amber-400" /> : <Plane className="w-4 h-4 text-cyan-400" />}
          <span>{isStaffFlow ? "Staff & Operations Console Access" : "Passenger Travel Portal"}</span>
        </div>
        <Link
          to={isStaffFlow ? "/login?type=passenger&next=/" : "/login?type=staff&next=/ops"}
          className="text-aero-t2 hover:text-aero-cyan underline">
          Switch to {isStaffFlow ? "Passenger" : "Staff"}
        </Link>
      </div>

      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div>
          <Label>Email <span className="text-aero-rose">*</span></Label>
          <Input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Password <span className="text-aero-rose">*</span></Label>
            <Link to="/forgot-password" className="text-xs text-aero-cyan hover:underline" data-testid="forgot-link">Forgot?</Link>
          </div>
          <div className="relative">
            <Input
              data-testid="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="font-sans text-sm tracking-normal pr-10"
              style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-aero-t3 hover:text-aero-t1 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {err && <div className="text-sm text-aero-rose" data-testid="login-error">{err}</div>}
        <Button data-testid="login-submit" disabled={busy} className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
          {busy ? "Signing in…" : (isStaffFlow ? "Access Operations Console" : "Sign in as Passenger")}
        </Button>
      </form>

      <div className="flex flex-col gap-2 mt-5 text-sm text-center">
        <p className="text-aero-t2">
          New here? <Link to={isStaffFlow ? "/register?type=staff" : "/register?type=passenger"} className="text-aero-cyan hover:underline" data-testid="goto-register">
            {isStaffFlow ? "Create staff account (invite code required)" : "Create a Passenger Account"}
          </Link>
        </p>
        <Link to="/" className="text-xs text-aero-t3 hover:text-aero-t1 mt-1">← Return to Passenger Portal</Link>
      </div>
    </AuthShell>
  );
}
