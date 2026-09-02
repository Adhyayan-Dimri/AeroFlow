import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "./AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated. Please sign in.");
      nav("/login");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      {!token ? (
        <div className="text-sm text-aero-rose" data-testid="reset-no-token">Invalid reset link. <Link to="/forgot-password" className="text-aero-cyan underline">Request a new one</Link>.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
          <div><Label>New password <span className="text-aero-rose">*</span></Label><Input data-testid="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {err && <div className="text-sm text-aero-rose" data-testid="reset-error">{err}</div>}
          <Button data-testid="reset-submit" disabled={busy} className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
            {busy ? "Updating…" : "Update password"}
          </Button>
          <Link to="/login" className="text-aero-cyan hover:underline text-sm block text-center" data-testid="back-to-signin">← Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}
