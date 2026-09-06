import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiGet } from "../../lib/apiClient";

interface Settlement {
  provider: string;
  id: string | number;
  amount: number;
  status: string;
  settledAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  period_start: string;
  period_end: string;
  profiles?: { full_name: string };
}

export default function Reconciliation() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ providerSettlements: Settlement[]; recordedPayouts: Payout[] }>("/api/admin/reconciliation")
      .then((data) => {
        setSettlements(data.providerSettlements);
        setPayouts(data.recordedPayouts);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reconciliation data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>
      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-10">Payout reconciliation</h1>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-smoke text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl tracking-wide mb-5">Provider settlements</h2>
          <div className="space-y-2 mb-14">
            {settlements.length === 0 ? (
              <p className="text-sm text-smoke">No settlement records found.</p>
            ) : (
              settlements.map((s) => (
                <div key={`${s.provider}-${s.id}`} className="flex items-center justify-between bg-panel border border-line rounded-xl px-5 py-3">
                  <div>
                    <p className="text-sm font-bold capitalize">{s.provider}</p>
                    <p className="text-xs text-smoke">{new Date(s.settledAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₦{s.amount.toLocaleString()}</p>
                    <p className="text-xs text-smoke capitalize">{s.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 className="font-display text-2xl tracking-wide mb-5">Recorded organizer payouts</h2>
          <div className="space-y-2">
            {payouts.length === 0 ? (
              <p className="text-sm text-smoke">No payouts recorded yet.</p>
            ) : (
              payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-panel border border-line rounded-xl px-5 py-3">
                  <div>
                    <p className="text-sm font-bold">{p.profiles?.full_name}</p>
                    <p className="text-xs text-smoke">
                      {p.period_start} → {p.period_end}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₦{Number(p.amount).toLocaleString()}</p>
                    <p className={`text-xs ${p.status === "paid" ? "text-gold" : "text-smoke"}`}>{p.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
