// frontend/src/pages/RequestRefund.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ticket,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiUpload } from "../lib/apiClient";
import { formatMoney, formatEventDateTime } from "../lib/constants";

interface Order {
  id: string;
  payment_reference: string;
  status: string;
  amount_total: number;
  currency_code: string;
  created_at: string;
  paid_at: string | null;
  events: {
    id: string;
    title: string;
    slug: string;
    venue_name: string;
    address: string;
    city: string;
    country: string;
    start_at: string;
    end_at: string | null;
    cover_image: string | null;
    timezone: string;
  };
  tickets: {
    id: string;
    holder_name: string;
    checked_in: boolean;
  }[];
}

const REFUND_REASONS = [
  { value: "event_cancelled", label: "Event was cancelled" },
  { value: "event_rescheduled", label: "Event was rescheduled" },
  { value: "venue_changed", label: "Venue changed significantly" },
  { value: "duplicate_purchase", label: "Duplicate purchase" },
  { value: "technical_issue", label: "Technical issue prevented attendance" },
  { value: "other", label: "Other" },
];

export default function RequestRefund() {
  const { orderRef } = useParams<{ orderRef: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [reason, setReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!orderRef) {
      setError("Missing order reference");
      setLoading(false);
      return;
    }
    fetchOrder(orderRef);
  }, [orderRef, user, navigate]);

  const fetchOrder = async (ref: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ order: Order }>(`/api/orders/${ref}`);
      setOrder(data.order);
    } catch (err) {
      console.error("Failed to fetch order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setProofFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      setError("Please select a reason for the refund.");
      return;
    }
    if (!additionalInfo.trim()) {
      setError("Please provide additional details about your request.");
      return;
    }
    if (!proofFile) {
      setError("Please upload a proof document (screenshot, receipt, etc.).");
      return;
    }
    if (!order) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("orderId", order.id);
      formData.append("reason", reason);
      formData.append("additionalInfo", additionalInfo.trim());
      formData.append("proof", proofFile);

      const response = await apiUpload<{ success: boolean }>("/api/refunds/request", formData);
      setSuccess(true);
    } catch (err) {
      console.error("Refund request failed:", err);
      setError(err instanceof Error ? err.message : "Failed to submit refund request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 flex items-center justify-center gap-2 text-smoke">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-3">Order not found</h1>
        <p className="text-smoke mb-6">{error || "This order doesn't exist or you don't have access."}</p>
        <Link to="/orders" className="text-gold font-semibold hover:text-gold-bright transition-colors">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const event = order.events;

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <CheckCircle2 className="w-16 h-16 text-gold mx-auto mb-6" />
        <h1 className="font-display text-4xl tracking-wide mb-4">Refund Request Submitted</h1>
        <p className="text-smoke max-w-md mx-auto mb-2">
          Your refund request for <strong className="text-bone">{event?.title}</strong> has been received.
        </p>
        <p className="text-smoke/60 text-sm mb-8">
          We'll review your proof and credit your <strong>Sahm wallet</strong> within 3–5 business days.
          Wallet funds are <strong>non‑withdrawable</strong> and can only be used for future purchases on the platform.
        </p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const canRequestRefund = order.status === "paid" || order.status === "partial";

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
      <Link
        to={`/orders/${orderRef}`}
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to order
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">Request Refund</h1>
          <p className="text-smoke text-sm mt-1">
            Order #{order.payment_reference} – {event?.title}
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-panel border border-line rounded-2xl p-6 mb-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-smoke mb-1">Event</p>
            <p className="font-bold text-bone">{event?.title}</p>
            <div className="text-sm text-smoke mt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {event?.start_at &&
                  formatEventDateTime(event.start_at, event.timezone || "Africa/Lagos", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event?.venue_name}, {event?.city}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-smoke mb-1">Order total</p>
            <p className="text-2xl font-display text-gold">
              {formatMoney(order.amount_total, order.currency_code || "NGN")}
            </p>
            <p className="text-xs text-smoke mt-1">Status: {order.status}</p>
          </div>
        </div>
      </div>

      {!canRequestRefund ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Refund not available</p>
            <p className="text-sm text-smoke">
              This order cannot be refunded. Only paid or partially paid orders are eligible.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Reason for refund <span className="text-red-400">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
              required
            >
              <option value="">Select a reason</option>
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Additional details <span className="text-red-400">*</span>
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={4}
              placeholder="Please explain your situation in detail (required)."
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors resize-none"
              required
            />
          </div>

          <div>
            <label className="text-xs text-smoke mb-1.5 block font-semibold">
              Upload proof <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-ink border border-line hover:border-gold/50 rounded-xl px-4 py-2.5 text-sm text-bone transition-colors"
              >
                <Upload className="w-4 h-4 text-gold" />
                Choose file
              </button>
              {proofFile ? (
                <div className="flex items-center gap-2 bg-ink/50 border border-line/50 rounded-xl px-3 py-2 text-sm text-bone">
                  <FileText className="w-4 h-4 text-gold" />
                  <span className="truncate max-w-[200px]">{proofFile.name}</span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-smoke hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-smoke/60">No file selected</span>
              )}
            </div>
            <p className="text-[11px] text-smoke/60 mt-1.5">
              Upload a screenshot, receipt, or any document that supports your request (max 5MB).
            </p>
          </div>

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold py-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Refund Request
              </>
            )}
          </button>

          <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-center">
            <p className="text-[11px] text-smoke/80">
              Refunds are credited to your <strong>Sahm wallet</strong> (non‑withdrawable). You can use the balance for future purchases on the platform.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}