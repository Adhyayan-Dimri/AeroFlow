import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function GoogleAuthButton({ onAuthSuccess, onError, disabled = false, text = "Continue with Google" }) {
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initGoogle();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    };

    const initGoogle = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: btnRef.current.offsetWidth || 340,
            logo_alignment: "left"
          });
        }
      } catch (err) {
        console.warn("Google Sign-In initialization:", err);
      }
    };

    const handleGoogleResponse = async (response) => {
      if (!response?.credential) {
        toast.error("Google authentication failed. No token received.");
        return;
      }
      setLoading(true);
      try {
        await onAuthSuccess({ credential: response.credential });
      } catch (err) {
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    loadGoogleScript();
  }, [clientId, onAuthSuccess, onError]);

  const handleManualClick = async () => {
    if (clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("OneTap not displayed or skipped:", notification.getNotDisplayedReason());
          }
        });
        return;
      } catch (e) {
        console.warn("One tap prompt error:", e);
      }
    }

    // If client ID is not yet provided by the user in .env
    toast.info("Google OAuth Ready", {
      description: "Provide your Google Client ID in REACT_APP_GOOGLE_CLIENT_ID or backend GOOGLE_CLIENT_ID to link live credentials.",
      duration: 5000,
    });
  };

  return (
    <div className="w-full">
      <div ref={btnRef} className="w-full hidden" />
      <button
        type="button"
        onClick={handleManualClick}
        disabled={disabled || loading}
        data-testid="google-auth-btn"
        className="w-full relative flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-semibold transition-all duration-200 shadow-sm hover:border-cyan-500/40 hover:text-white disabled:opacity-50 group cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
        )}
        <span>{text}</span>
      </button>
    </div>
  );
}
