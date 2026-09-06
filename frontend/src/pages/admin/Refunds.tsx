// frontend/src/pages/admin/Refunds.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  RefreshCw,
  Clock,
  FileText,
} from "lucide-react";
import { apiGet, apiPatch } from "../../lib/apiClient";
import { formatMoney } from "../../lib/constants";

interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  reason: string;
  additional_info?: string;
  proof_url?: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  admin_note: string | null;
  refund_reference: string | null;
  orders: {
    id: string;
    payment_reference: string;
    buyer_name: string;
    buyer_email: string;
    amount_total: number;
    events: {
      title: string;
      start_at: string;
    };
  };
  profiles: {
    email: string;
    full_name: string;
  };
}

const STATUS_COLORS = {
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  rejected: "text-red-400 bg-red-400/10 border-red-400/20",
};

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminRefunds() {
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const fetchRefunds = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/refunds${filter !== "all" ? `?status=${filter}` : ""}`;
      const data = await apiGet<{ refunds: Refund[] }>(url);
      setRefunds(data.refunds || []);
    } catch (err) {
      console.error("Failed to fetch refunds:", err);
      setError(err instanceof Error ? err.message : "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  };

  const processRefund = async (refundId: string, action: "approve" | "reject") => {
    setProcessing(refundId);
    try {
      await apiPatch(`/api/admin/refunds/${refundId}`, {
        action,
        note: adminNote.trim() || undefined,
      });
      await fetchRefunds();
      setModalOpen(false);
      setSelectedRefund(null);
      setAdminNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} refund`);
    } finally {
      setProcessing(null);
    }
  };

  const openModal = (refund: Refund) => {
    setSelectedRefund(refund);
    setAdminNote("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRefund(null);
    setAdminNote("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "approved": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "rejected": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-smoke bg-panel border-line";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl tracking-wide">Refund Requests</h1>
          <p className="text-smoke mt-2">Review and process user refund requests.</p>
        </div>
        <button
          onClick={fetchRefunds}
          className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-panel border border-line rounded-xl p-1 mb-6">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === status ? "bg-gold text-ink" : "text-smoke hover:text-bone"
            }`}
          >
            {status === "all" ? "All" : STATUS_LABELS[status]}
            {status !== "all" && (
              <span
                className={`ml-2 text-xs ${
                  filter === status ? "text-ink/60" : "text-smoke/60"
                }`}
              >
                {refunds.filter((r) => r.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {refunds.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center">
          <Check className="w-12 h-12 text-gold/30 mx-auto mb-4" />
          <p className="text-smoke">No refund requests found.</p>
          <p className="text-xs text-smoke/60 mt-1">
            {filter !== "all" ? `No ${filter} requests at the moment.` : "All clear!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => {
            const statusColor = STATUS_COLORS[refund.status];
            const statusLabel = STATUS_LABELS[refund.status];
            const event = refund.orders?.events;

            return (
              <div
                key={refund.id}
                className="bg-panel border border-line rounded-2xl p-5 hover:border-gold/40 transition-all"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="font-bold text-bone truncate">{event?.title || "Event"}</h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="text-sm text-smoke space-y-1">
                      <p>
                        <strong className="text-bone">Order:</strong> #{refund.orders?.payment_reference || "N/A"}
                      </p>
                      <p>
                        <strong className="text-bone">Buyer:</strong>{" "}
                        {refund.profiles?.full_name || refund.orders?.buyer_name || "Unknown"}
                        <span className="text-smoke/60 ml-2">
                          ({refund.profiles?.email || refund.orders?.buyer_email})
                        </span>
                      </p>
                      <p>
                        <strong className="text-bone">Amount:</strong>{" "}
                        <span className="text-gold font-bold">{formatMoney(refund.amount, refund.orders?.amount_total ? "NGN" : "NGN")}</span>
                      </p>
                      <p>
                        <strong className="text-bone">Reason:</strong> {refund.reason}
                      </p>
                      {refund.additional_info && (
                        <p>
                          <strong className="text-bone">Details:</strong>{" "}
                          <span className="text-smoke/80">{refund.additional_info}</span>
                        </p>
                      )}
                      {refund.proof_url && (
                        <div className="flex items-center gap-2">
                          <strong className="text-bone">Proof:</strong>
                          <a
                            href={refund.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:text-gold-bright flex items-center gap-1 text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Attachment
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-smoke/60">
                      Requested: {new Date(refund.requested_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {refund.status === "pending" && (
                      <button
                        onClick={() => openModal(refund)}
                        className="inline-flex items-center gap-1.5 bg-gold/10 text-gold hover:bg-gold/20 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Review
                      </button>
                    )}
                    {refund.status === "approved" && refund.refund_reference && (
                      <span className="text-xs text-smoke/60 font-mono">
                        Ref: {refund.refund_reference}
                      </span>
                    )}
                    {refund.admin_note && (
                      <span className="text-xs text-smoke/60 italic max-w-[200px] truncate">
                        Note: {refund.admin_note}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for review */}
      {modalOpen && selectedRefund && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={closeModal}>
          <div
            className="bg-panel border border-line rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl tracking-wide mb-4">Review Refund Request</h2>

            <div className="space-y-3 text-sm mb-6">
              <div>
                <p className="text-xs text-smoke">Event</p>
                <p className="font-semibold text-bone">{selectedRefund.orders?.events?.title || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-smoke">Order</p>
                <p className="font-mono text-sm text-bone">#{selectedRefund.orders?.payment_reference}</p>
              </div>
              <div>
                <p className="text-xs text-smoke">Buyer</p>
                <p className="text-bone">{selectedRefund.profiles?.full_name || selectedRefund.orders?.buyer_name}</p>
                <p className="text-smoke/60 text-xs">{selectedRefund.profiles?.email || selectedRefund.orders?.buyer_email}</p>
              </div>
              <div>
                <p className="text-xs text-smoke">Amount</p>
                <p className="font-bold text-gold">{formatMoney(selectedRefund.amount, "NGN")}</p>
              </div>
              <div>
                <p className="text-xs text-smoke">Reason</p>
                <p className="text-smoke">{selectedRefund.reason}</p>
              </div>
              {selectedRefund.additional_info && (
                <div>
                  <p className="text-xs text-smoke">Additional Details</p>
                  <p className="text-smoke/80 text-sm">{selectedRefund.additional_info}</p>
                </div>
              )}
              {selectedRefund.proof_url && (
                <div>
                  <p className="text-xs text-smoke">Proof Attachment</p>
                  <a
                    href={selectedRefund.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:text-gold-bright flex items-center gap-1 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Attachment
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-smoke mb-1.5 block font-semibold">
                Admin Note (optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Add any internal note or reason for approval/rejection..."
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => processRefund(selectedRefund.id, "approve")}
                disabled={processing === selectedRefund.id}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {processing === selectedRefund.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve Refund
              </button>
              <button
                onClick={() => processRefund(selectedRefund.id, "reject")}
                disabled={processing === selectedRefund.id}
                className="flex-1 bg-red-500/80 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {processing === selectedRefund.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Reject
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-panel border border-line hover:border-gold/40 text-smoke hover:text-bone font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>

            <p className="text-[11px] text-smoke/60 text-center mt-4">
              Approving will credit the user's wallet. Rejecting will send a rejection email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
