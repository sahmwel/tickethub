import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Check } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "../../lib/apiClient";

interface OrganizerSummary {
  organizerId: string;
  fullName: string;
  email: string;
  totalRevenue: number;
  totalPaidOut: number;
  totalPending: number;
  outstanding: number;
}

interface PayoutRow {
  id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: "pending" | "paid";
  notes: string | null;
  paid_at: string | null;
}

export default function Payouts() {
  const [summaries, setSummaries] = useState<OrganizerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payoutRows, setPayoutRows] = useState<Record<string, PayoutRow[]>>({});
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ summaries: OrganizerSummary[] }>("/api/admin/payouts/summary")
      .then((data) => setSummaries(data.summaries))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load payout summary"))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (organizerId: string) => {
    if (expandedId === organizerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(organizerId);
    if (!payoutRows[organizerId]) {
      const data = await apiGet<{ payouts: PayoutRow[] }>(`/api/admin/payouts/${organizerId}`);
      setPayoutRows((prev) => ({ ...prev, [organizerId]: data.payouts }));
    }
  };

  const createPayout = async (organizerId: string) => {
    if (!amount || !periodStart || !periodEnd) return;
    setBusyId(organizerId);
    try {
      await apiPost("/api/admin/payouts", {
        organizerId,
        amount: Number(amount),
        periodStart,
        periodEnd,
      });
      const data = await apiGet<{ payouts: PayoutRow[] }>(`/api/admin/payouts/${organizerId}`);
      setPayoutRows((prev) => ({ ...prev, [organizerId]: data.payouts }));
      setFormOpenFor(null);
      setAmount("");
      setPeriodStart("");
      setPeriodEnd("");
      const summaryData = await apiGet<{ summaries: OrganizerSummary[] }>("/api/admin/payouts/summary");
      setSummaries(summaryData.summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payout");
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (organizerId: string, payoutId: string) => {
    setBusyId(payoutId);
    try {
      await apiPatch(`/api/admin/payouts/${payoutId}/mark-paid`);
      const data = await apiGet<{ payouts: PayoutRow[] }>(`/api/admin/payouts/${organizerId}`);
      setPayoutRows((prev) => ({ ...prev, [organizerId]: data.payouts }));
      const summaryData = await apiGet<{ summaries: OrganizerSummary[] }>("/api/admin/payouts/summary");
      setSummaries(summaryData.summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark payout as paid");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-10">Payouts</h1>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-smoke text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading payout summary…
        </div>
      ) : summaries.length === 0 ? (
        <p className="text-smoke text-sm">No organizers with sales yet.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <div key={s.organizerId} className="bg-panel border border-line rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleExpand(s.organizerId)}
                className="w-full flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <div>
                  <p className="font-bold text-sm">{s.fullName}</p>
                  <p className="text-xs text-smoke">{s.email}</p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-smoke">Revenue</p>
                    <p className="text-sm font-bold">₦{s.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-smoke">Paid out</p>
                    <p className="text-sm font-bold text-gold">₦{s.totalPaidOut.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-smoke">Outstanding</p>
                    <p className="text-sm font-bold">₦{s.outstanding.toLocaleString()}</p>
                  </div>
                </div>
              </button>

              {expandedId === s.organizerId && (
                <div className="border-t border-line px-6 py-4 space-y-3">
                  {(payoutRows[s.organizerId] ?? []).map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 bg-ink border border-line rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">₦{Number(p.amount).toLocaleString()}</p>
                        <p className="text-[11px] text-smoke">
                          {p.period_start} → {p.period_end}
                        </p>
                      </div>
                      {p.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold">
                          <Check className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => markPaid(s.organizerId, p.id)}
                          disabled={busyId === p.id}
                          className="text-xs font-semibold bg-gold text-ink px-3 py-1.5 rounded-full disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  ))}

                  {formOpenFor === s.organizerId ? (
                    <div className="bg-ink border border-line rounded-xl p-4 space-y-3">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          type="number"
                          placeholder="Amount (₦)"
                          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold/50"
                        />
                        <input
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          type="date"
                          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold/50"
                        />
                        <input
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          type="date"
                          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-gold/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => createPayout(s.organizerId)}
                          disabled={busyId === s.organizerId}
                          className="text-xs font-semibold bg-gold text-ink px-4 py-2 rounded-full disabled:opacity-50"
                        >
                          Create payout record
                        </button>
                        <button
                          onClick={() => setFormOpenFor(null)}
                          className="text-xs font-semibold border border-line text-smoke px-4 py-2 rounded-full"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setFormOpenFor(s.organizerId)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-bright"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record a payout
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
