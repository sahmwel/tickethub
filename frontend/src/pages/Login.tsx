// frontend/src/pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { signIn, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Clear any stale error when the login page loads
  useEffect(() => {
    setError(null);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && profile) {
      console.log("🔍 User already logged in:", profile.role);

      if (!profile.is_verified) {
        navigate("/verify-email", { replace: true });
        return;
      }

      if (profile.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (profile.role === "organizer") {
        navigate("/organizer", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [profile, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setLoading(false);
        setError(signInError);
        return;
      }

      await refreshProfile();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span>Checking session...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 pb-24">
      <h1 className="font-display text-4xl tracking-wide mb-2">Welcome back</h1>
      <p className="text-smoke text-sm mb-8">Log in to your account</p>

      <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs text-smoke mb-1.5 block">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors text-bone placeholder:text-smoke/40"
          />
        </div>

        <div>
          <label className="text-xs text-smoke mb-1.5 block">Password</label>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors text-bone placeholder:text-smoke/40 pr-12"
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
        </div>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold py-3.5 rounded-xl transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-ink"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Logging in…
            </span>
          ) : (
            "Log in"
          )}
        </button>
      </form>

      <p className="text-sm text-smoke text-center mt-6">
        Don't have an account?{" "}
        <Link to="/signup" className="text-gold font-semibold hover:text-gold-bright transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}