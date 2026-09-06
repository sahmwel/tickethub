// frontend/src/pages/Signup.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { COUNTRIES, getCountryConfig, getCurrencySymbol } from "../lib/constants";
import { Globe, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"attendee" | "organizer" | "admin">("attendee");
  const [country, setCountry] = useState("Nigeria");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const countryConfig = getCountryConfig(country);
  const currencySymbol = getCurrencySymbol(countryConfig.currency);

  // Password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(Math.min(strength, 5));
  }, [password]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, fullName, role, country);
      if (error) {
        setError(error);
        // Start cooldown on any error (especially rate limit)
        setCooldown(60);
        setLoading(false);
        return;
      }

      // Success – redirect to verification
      setLoading(false);
      navigate("/verify-email");
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "An error occurred");
      setCooldown(60);
    }
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return "Enter a password";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-line";
    if (passwordStrength <= 2) return "bg-red-400";
    if (passwordStrength <= 3) return "bg-yellow-400";
    if (passwordStrength <= 4) return "bg-blue-400";
    return "bg-green-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wide text-bone mb-2">Create your account</h1>
          <p className="text-smoke text-sm">Book tickets, or start selling your own events worldwide.</p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6">
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setRole("attendee")}
              className={`text-sm font-semibold py-3 rounded-xl border transition-all ${
                role === "attendee"
                  ? "bg-gold text-ink border-gold shadow-glow"
                  : "border-line text-smoke hover:text-bone hover:border-gold/40"
              }`}
            >
              🎟️ Attendee
            </button>
            <button
              type="button"
              onClick={() => setRole("organizer")}
              className={`text-sm font-semibold py-3 rounded-xl border transition-all ${
                role === "organizer"
                  ? "bg-gold text-ink border-gold shadow-glow"
                  : "border-line text-smoke hover:text-bone hover:border-gold/40"
              }`}
            >
              🎤 Organizer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amaka Johnson"
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors placeholder:text-smoke/40"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors placeholder:text-smoke/40"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors placeholder:text-smoke/40 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-bone transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      passwordStrength <= 2 ? "text-red-400" :
                      passwordStrength <= 3 ? "text-yellow-400" :
                      passwordStrength <= 4 ? "text-blue-400" :
                      "text-green-400"
                    }`}>
                      {getPasswordStrengthLabel()}
                    </span>
                  </div>
                  <p className="text-[10px] text-smoke/60">
                    Min 6 characters • Use uppercase, numbers & symbols for a strong password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Confirm password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors placeholder:text-smoke/40 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-bone transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1.5">Passwords do not match</p>
              )}
              {password && confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-400 mt-1.5">✓ Passwords match</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Country <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
                <select
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors appearance-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  countryConfig.provider === "paystack" ? "bg-green-400" : "bg-blue-400"
                }`} />
                <p className="text-[11px] text-smoke/70">
                  Payments via <span className="font-semibold text-bone">
                    {countryConfig.provider === "paystack" ? "Paystack" : "Flutterwave"}
                  </span> in <span className="font-semibold text-bone">
                    {currencySymbol}{countryConfig.currency}
                  </span>
                  {role === "organizer" && (
                    <span className="block text-[10px] text-gold/70 mt-0.5">
                      Payouts will be processed in {countryConfig.currency}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold py-3.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account…
                </span>
              ) : cooldown > 0 ? (
                `Try again in ${cooldown}s`
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-[11px] text-smoke/60 text-center">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-gold hover:text-gold-bright transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-gold hover:text-gold-bright transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>

        <p className="text-sm text-smoke text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-gold font-semibold hover:text-gold-bright transition-colors">
            Log in
          </Link>
        </p>

        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-smoke/40">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Paystack (Nigeria)
          </span>
          <span className="w-px h-3 bg-line" />
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Flutterwave (Global)
          </span>
        </div>
      </div>
    </div>
  );
}