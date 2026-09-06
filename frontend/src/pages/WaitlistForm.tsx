import { useState } from "react";
import { Loader2, Bell, Check, Mail } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

interface WaitlistFormProps {
  ticketTypeId: string;
}

export default function WaitlistForm({ ticketTypeId }: WaitlistFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!name.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid name and email");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId, name, email, quantityWanted: quantity }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to join waitlist");
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="flex flex-col gap-2 text-sm bg-panel border border-gold/30 rounded-xl px-4 py-4">
        <div className="flex items-center gap-2 text-gold">
          <Check className="w-4 h-4" />
          <span className="font-semibold">You're on the waitlist!</span>
        </div>
        <p className="text-smoke">
          We'll email you at <strong className="text-bone">{email}</strong> when tickets become available.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-smoke/60 mt-1">
          <Mail className="w-3.5 h-3.5" />
          <span>Check your inbox (and spam folder) for updates.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-line rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-bone flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-gold" />
        Sold out — join the waitlist
      </p>
      <p className="text-[11px] text-smoke/70">
        Get notified when tickets are available again. No obligation.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold/50"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Your email"
        className="w-full bg-ink border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold/50"
      />
      <div className="flex items-center gap-2">
        <input
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          type="number"
          min={1}
          className="w-16 bg-ink border border-line rounded-lg px-2 py-2 text-sm outline-none focus:border-gold/50"
        />
        <span className="text-xs text-smoke">tickets wanted</span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify me"}
      </button>
    </div>
  );
}
