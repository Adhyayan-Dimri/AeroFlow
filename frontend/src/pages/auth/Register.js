import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { verifyOtp } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [isStaff, setIsStaff] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const register = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body = { ...form };
      if (isStaff) body.invite_code = inviteCode.trim();
      const { data } = await api.post("/auth/register", body);
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const u = await verifyOtp(form.email, otp);
      toast.success(`Account verified. Welcome, ${u.name}`);
      nav(u.role === "passenger" ? "/" : "/ops");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setErr("");
    try {
      await api.post("/auth/otp/resend", { email: form.email });
      toast.success("A new verification code was sent to your email");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };

  if (step === "otp") {
    return (
      <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${form.email}.`}>
        <div className="space-y-5" data-testid="otp-form">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="otp-input">
            <InputOTPGroup className="w-full justify-between">
              {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} className="w-12 h-12 text-lg" />)}
            </InputOTPGroup>
          </InputOTP>
          {err && <div className="text-sm text-aero-rose" data-testid="otp-error">{err}</div>}
          <Button data-testid="otp-verify-btn" disabled={busy || otp.length < 6} onClick={verify}
            className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
            {busy ? "Verifying…" : "Verify & continue"}
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
    <AuthShell title="Create account" subtitle="Passengers get journey forecasts. Staff need an invite code.">
      <form onSubmit={register} className="space-y-4" data-testid="register-form">
        <div><Label>Full name <span className="text-aero-rose">*</span></Label><Input data-testid="reg-name" value={form.name} onChange={set("name")} required /></div>
        <div><Label>Email <span className="text-aero-rose">*</span></Label><Input data-testid="reg-email" type="email" value={form.email} onChange={set("email")} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Label>Password <span className="text-aero-rose">*</span></Label>
            <Input data-testid="reg-password" type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-7 text-aero-t3 hover:text-aero-t1">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div><Label>Phone</Label><Input data-testid="reg-phone" value={form.phone} onChange={set("phone")} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-aero-border px-3 py-2.5 bg-aero-elevated/40">
          <div className="flex items-center gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-aero-cyan" /> I am airport staff</div>
          <Switch data-testid="reg-staff-toggle" checked={isStaff} onCheckedChange={setIsStaff} />
        </div>
        {isStaff && (
          <div className="space-y-1">
            <Label>Staff Authorization Key <span className="text-aero-rose">*</span></Label>
            <Input
              data-testid="reg-invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter official staff authorization key"
              required
            />
            <div className="text-[11px] text-aero-t3 leading-tight mt-1">
              Authorized key issued by Airport Operations & Security Directorate. Contact your station supervisor for access.
            </div>
          </div>
        )}
        {err && <div className="text-sm text-aero-rose" data-testid="register-error">{err}</div>}
        <Button data-testid="register-submit" disabled={busy} className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
      <div className="flex justify-between text-sm text-aero-t2 mt-5">
        <Link to="/" className="text-aero-t3 hover:text-aero-t1" data-testid="goto-home">← Back to home</Link>
        <span>Already have an account? <Link to="/login" className="text-aero-cyan hover:underline" data-testid="goto-login">Sign in</Link></span>
      </div>
    </AuthShell>
  );
}
