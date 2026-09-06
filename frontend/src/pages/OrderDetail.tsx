// frontend/src/pages/OrderDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ticket,
  Calendar,
  MapPin,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../lib/apiClient";
import { formatMoney, formatEventDateTime } from "../lib/constants";
import QRCode from "qrcode";

interface Ticket {
  id: string;
  code: string;
  holder_name: string;
  holder_email: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  transferred_at: string | null;
  transferred_to_name: string | null;
  ticket_type: {
    id: string;
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  payment_reference: string;
  status: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  amount_total: number;
  amount_paid: number;
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
  tickets: Ticket[];
}

const STATUS_STYLES: Record<Order["status"], { color: string; label: string; icon: JSX.Element }> = {
  paid: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "Paid", icon: <CheckCircle2 className="w-4 h-4" /> },
  pending: { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", label: "Pending", icon: <Clock className="w-4 h-4" /> },
  partial: { color: "text-gold bg-gold/10 border-gold/20", label: "Partially paid", icon: <AlertTriangle className="w-4 h-4" /> },
  refunded: { color: "text-sky-400 bg-sky-400/10 border-sky-400/20", label: "Refunded", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { color: "text-red-400 bg-red-400/10 border-red-400/20", label: "Cancelled", icon: <XCircle className="w-4 h-4" /> },
};

export default function OrderDetail() {
  const { orderRef } = useParams<{ orderRef: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile) {
      navigate("/login");
      return;
    }
    if (!orderRef) {
      setError("Missing order reference");
      setLoading(false);
      return;
    }
    fetchOrder(orderRef);
  }, [orderRef, profile, navigate]);

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

  useEffect(() => {
    if (!order?.tickets?.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        order.tickets.map(async (ticket) => {
          try {
            const dataUrl = await QRCode.toDataURL(ticket.code, { width: 160, margin: 1 });
            return [ticket.id, dataUrl] as const;
          } catch (err) {
            console.error(`Failed to generate QR code for ticket ${ticket.id}:`, err);
            return null;
          }
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setQrDataUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [order]);

  const downloadTicketQR = (ticket: Ticket) => {
    const dataUrl = qrDataUrls[ticket.id];
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `${ticket.code}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (loading) {
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
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-3">Order not found</h1>
        <p className="text-smoke mb-6">{error || "This order doesn't exist or you don't have access."}</p>
        <Link to="/orders" className="text-gold font-semibold hover:text-gold-bright transition-colors">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const event = order.events;
  const balanceDue = order.status === "partial" ? order.amount_total - order.amount_paid : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">{event?.title || "Order"}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm text-smoke">#{order.payment_reference}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-smoke">Total</p>
          <p className="text-2xl font-display text-gold">{formatMoney(order.amount_total, order.currency_code || "NGN")}</p>
          {order.status === "partial" && (
            <p className="text-xs text-gold">
              {formatMoney(balanceDue, order.currency_code || "NGN")} remaining
            </p>
          )}
        </div>
      </div>

      {/* Event & Order Info */}
      <div className="bg-panel border border-line rounded-2xl p-6 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-smoke mb-1">Event</p>
            <p className="font-bold text-bone">{event?.title}</p>
            <div className="text-sm text-smoke mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {event?.start_at && formatEventDateTime(event.start_at, event.timezone || "Africa/Lagos", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {event?.end_at && ` — ${formatEventDateTime(event.end_at, event.timezone || "Africa/Lagos", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event?.venue_name}, {event?.city}, {event?.country}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-smoke mb-1">Order details</p>
            <div className="text-sm text-bone space-y-1">
              <p>Placed: {new Date(order.created_at).toLocaleString()}</p>
              {order.paid_at && <p>Paid: {new Date(order.paid_at).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-line">
          <h2 className="font-bold text-sm uppercase tracking-widest text-gold flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Tickets ({order.tickets?.length || 0})
          </h2>
        </div>

        {order.tickets?.length === 0 ? (
          <div className="p-12 text-center text-smoke">
            <Ticket className="w-12 h-12 text-smoke/20 mx-auto mb-3" />
            <p>No tickets issued for this order yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {order.tickets.map((ticket) => (
              <div key={ticket.id} className="p-6 flex flex-wrap items-start gap-6">
                <div className="shrink-0 bg-white p-2 rounded-xl border border-line w-20 h-20 flex items-center justify-center">
                  {qrDataUrls[ticket.id] ? (
                    <img
                      src={qrDataUrls[ticket.id]}
                      alt={`QR code for ticket ${ticket.code}`}
                      className="w-16 h-16"
                    />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-ink/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-bone">{ticket.holder_name}</p>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/5">
                      {ticket.ticket_type?.name || "Ticket"}
                    </span>
                    {ticket.checked_in ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                        Checked in
                      </span>
                    ) : ticket.transferred_at ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-sky-400/10 text-sky-400 border-sky-400/20">
                        Transferred
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-400/10 text-yellow-400 border-yellow-400/20">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-smoke space-y-1">
                    {ticket.holder_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {ticket.holder_email}
                      </div>
                    )}
                    {ticket.transferred_at && (
                      <div className="flex items-center gap-1.5 text-sky-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Transferred to {ticket.transferred_to_name || "someone"} on {new Date(ticket.transferred_at).toLocaleString()}
                      </div>
                    )}
                    {ticket.checked_in_at && (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Checked in at {new Date(ticket.checked_in_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    to={`/tickets/${ticket.code}`}
                    className="text-xs text-smoke hover:text-gold transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => downloadTicketQR(ticket)}
                    disabled={!qrDataUrls[ticket.id]}
                    className="text-xs text-smoke hover:text-gold transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={`/events/${event?.slug}`}
          className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Eye className="w-4 h-4" />
          View Event
        </Link>
        {order.status === "partial" && balanceDue > 0 && event?.slug && (
          <Link
            to={`/checkout/${event.slug}`}
            state={{
              isBalancePayment: true,
              orderRef: order.payment_reference, // ✅ Use the payment reference (string), not the numeric id
              amountDueNow: balanceDue,
              eventId: event.id,
            }}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Pay Remaining Balance
          </Link>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          Print
        </button>
      </div>
    </div>
  );
}