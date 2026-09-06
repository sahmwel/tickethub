// frontend/src/pages/VerifyEmail.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyOtp, sendWelcomeOtp } from "../lib/apiClient";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function VerifyEmail() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  // ─── Send OTP on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const sendOtp = async () => {
      setSendingOtp(true);
      setError(null);
      try {
        await sendWelcomeOtp();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send OTP. You can try resending.");
      } finally {
        setSendingOtp(false);
      }
    };
    sendOtp();
  }, [user]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerify();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the 6‑digit OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(code);
      setSuccess(true);
      setTimeout(() => {
        const role = profile?.role || "attendee";
        if (role === "organizer") navigate("/organizer");
        else if (role === "admin") navigate("/admin");
        else navigate("/");
      }, 1500);
    } catch (err) {
      // Show the exact error message from the backend
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
      // If the OTP is invalid/expired, allow resend
      if (msg.includes("expired") || msg.includes("used") || msg.includes("not found")) {
        // Optionally auto‑resend after a moment?
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    try {
      await sendWelcomeOtp();
      setResendCooldown(60);
      // Focus first input
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95 flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
          <p className="text-smoke text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // will redirect

  if (profile?.is_verified) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wide text-bone mb-2">Verify your email</h1>
          <p className="text-smoke text-sm">
            We sent a 6‑digit OTP to{" "}
            <span className="text-bone font-medium">{profile?.email || user?.email}</span>
          </p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-bone mb-2">Verified!</h2>
              <p className="text-smoke text-sm">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              {sendingOtp ? (
                <div className="text-center py-6">
                  <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto mb-2" />
                  <p className="text-smoke text-sm">Sending OTP…</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-2 mb-6">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`w-12 h-14 text-center text-xl font-bold bg-ink border rounded-xl outline-none transition-colors
                          ${error ? "border-red-400 focus:border-red-400" : "border-line focus:border-gold/50"}
                          text-bone`}
                      />
                    ))}
                  </div>

                  {error && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3 flex items-start gap-2 mb-4">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400 whitespace-pre-wrap">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleVerify}
                    disabled={loading || otp.join("").length !== 6}
                    className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying…
                      </span>
                    ) : (
                      "Verify OTP"
                    )}
                  </button>

                  <div className="mt-4 text-center">
                    <button
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || sendingOtp}
                      className="text-sm text-smoke hover:text-bone transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                    >
                      <RefreshCw className={`w-4 h-4 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend OTP"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-sm text-smoke text-center mt-6">
          <Link to="/login" className="text-gold font-semibold hover:text-gold-bright transition-colors">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}