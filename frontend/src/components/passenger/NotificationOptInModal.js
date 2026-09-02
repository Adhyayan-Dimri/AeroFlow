import React, { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, MessageCircle, Luggage } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationOptInModal({ open, onOpenChange, flight }) {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState({ email: true, sms: true, whatsapp: true, belt: true });
  const [busy, setBusy] = useState(false);
  const [availableChannels, setAvailableChannels] = useState({ sms: false, whatsapp: false, email: true });
  const [phone, setPhone] = useState(user?.phone || "");

  useEffect(() => {
    if (open) {
      fetchAvailableChannels();
      setPhone(user?.phone || "");
    }
  }, [open, user]);

  const fetchAvailableChannels = async () => {
    try {
      const { data } = await api.get("/notification-channels");
      setAvailableChannels(data || { sms: false, whatsapp: false, email: true });
    } catch (e) {
      console.error("Failed to fetch available channels:", e);
    }
  };

  const subscribe = async () => {
    if (!user) { onOpenChange(false); nav("/login?next=/"); return; }

    if (phone && phone !== user?.phone) {
      try {
        await api.patch("/users/me", { phone });
      } catch (e) {
        toast.error("Failed to update phone number");
        return;
      }
    }

    setBusy(true);
    try {
      await api.patch("/users/me/notify-preferences", {
        notify_pre_flight: true,
        notify_whatsapp: prefs.whatsapp,
        notify_baggage_belt: prefs.belt,
        notify_sms: prefs.sms
      });
      if (flight) {
        await api.post("/users/me/saved-flights", { flight_id: flight.flight_id });
        await api.post("/users/me/preflight-nudge", { flight_id: flight.flight_id });
      }
      await refresh();
      toast.success("Subscribed. Pre-flight nudge sent to your email", { description: "You'll get a reminder about 5 to 6 hours before departure." });
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not subscribe. Please try again.");
    } finally { setBusy(false); }
  };

  const channels = [
    ["email", Mail, "Email", true],
    ["sms", Smartphone, "SMS", availableChannels.sms],
    ["belt", Luggage, "Baggage belt started", true],
    ["whatsapp", MessageCircle, "WhatsApp", availableChannels.whatsapp]
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E131F]/95 backdrop-blur-xl border border-white/10 text-aero-t1" data-testid="notify-modal">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Bell className="w-5 h-5 text-aero-cyan" /> Pre-flight nudge</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-aero-t2">
          Get a smart reminder <b className="text-aero-t1">5–6 hours before departure</b> with your suggested arrival time and live crowd levels.
        </p>

        {(availableChannels.sms || availableChannels.whatsapp) && (
          <div className="mt-4">
            <label className="text-xs text-aero-t2 mb-2 block">Phone Number (for SMS/WhatsApp)</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 ***"
              className="bg-aero-surface border border-aero-border text-aero-t1"
            />
          </div>
        )}

        <div className="space-y-2 mt-4">
          {channels.map(([k, Icon, label, avail]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-aero-border px-3 py-2.5 bg-aero-elevated/40">
              <div className="flex items-center gap-2.5 text-sm">
                <Icon className="w-4 h-4 text-aero-cyan" /> {label}
                {!avail && <span className="text-[9px] font-mono text-aero-t3 bg-aero-surface px-1.5 rounded">not available</span>}
              </div>
              <Switch data-testid={`notify-channel-${k}`} checked={prefs[k]} disabled={!avail}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))} />
            </div>
          ))}
        </div>
        <Button data-testid="notify-subscribe-btn" onClick={subscribe} disabled={busy}
          className="w-full mt-4 bg-aero-cyan text-[#041014] hover:bg-aero-cyan/90 font-semibold">
          {busy ? "Subscribing…" : user ? "Subscribe & send preview" : "Sign in to subscribe"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
