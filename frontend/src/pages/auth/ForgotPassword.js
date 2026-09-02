import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "./AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api, { formatApiError } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/auth/forgot-password", { email }); } catch {}
    setSent(true); setBusy(false);
  };
  return (
    <AuthShell title="Reset password" subtitle="We'll email you a secure reset link.">
      {sent ? (
        <div className="space-y-4" data-testid="forgot-sent">
          <p className="text-sm text-aero-t2">If that email is registered, a reset link has been sent. It expires in 1 hour.</p>
          <Link to="/login" className="text-aero-cyan hover:underline text-sm" data-testid="back-to-signin">← Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <div><Label>Email</Label><Input data-testid="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <Button data-testid="forgot-submit" disabled={busy} className="w-full bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
            {busy ? "Sending…" : "Send reset link"}
          </Button>
          <Link to="/login" className="text-aero-cyan hover:underline text-sm block text-center" data-testid="back-to-signin">← Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}
