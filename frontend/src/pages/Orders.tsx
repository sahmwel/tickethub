// frontend/src/pages/Orders.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Calendar,
  MapPin,
  ChevronRight,
  History,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../lib/apiClient";
import { formatMoney } from "../lib/constants";
import AccountNav from "../components/AccountNav";

interface Order {
  id: string;
  reference: string;
  event_title: string;
  event_slug: string;
  event_date: string;
  venue: string;
  ticket_count: number;
  amount_total: number;
  amount_paid: number;
  status: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  created_at: string;
}

const STATUS_STYLES: Record<Order["status"], string> = {
  paid: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  partial: "bg-gold/10 text-gold border-gold/20",
  refunded: "bg-sky-400/10 text-sky-400 border-sky-400/20",
  cancelled: "bg-red-400/10 text-red-400 border-red-400/20",
};

const STATUS_LABELS: Record<Order["status"], string> = {
  paid: "Paid",
  pending: "Pending",
  partial: "Partially paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

type TabKey = "all" | "upcoming" | "past" | "pending";

export default function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!profile) return;
    fetchOrders();
  }, [profile]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ orders: Order[] }>("/api/orders");
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let list = orders;

    if (tab === "upcoming") list = list.filter((o) => new Date(o.event_date) >= now);
    else if (tab === "past") list = list.filter((o) => new Date(o.event_date) < now);
    else if (tab === "pending")
      list = list.filter((o) => o.status === "pending" || o.status === "partial");

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.event_title.toLowerCase().includes(q) ||
          o.reference.toLowerCase().includes(q) ||
          o.venue?.toLowerCase().includes(q)
      );
    }

    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, tab, query]);

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      all: orders.length,
      upcoming: orders.filter((o) => new Date(o.event_date) >= now).length,
      past: orders.filter((o) => new Date(o.event_date) < now).length,
      pending: orders.filter((o) => o.status === "pending" || o.status === "partial").length,
    };
  }, [orders]);

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h1 className="font-display text-4xl mb-4">Please log in</h1>
        <p className="text-smoke mb-8">You need to be logged in to view your orders.</p>
        <Link to="/login" className="text-gold font-semibold">
          Log in →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-2">Account</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">Order History</h1>

      <AccountNav />

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 bg-panel border border-line rounded-xl p-1">
          {(
            [
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["past", "Past"],
              ["pending", "Pending"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === key ? "bg-gold text-ink" : "text-smoke hover:text-bone"
              }`}
            >
              {label}
              {tabCounts[key] > 0 && (
                <span className={`ml-1.5 ${tab === key ? "text-ink/60" : "text-smoke/60"}`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-smoke absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders..."
            className="bg-panel border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-gold/50 w-56"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-panel border border-line rounded-2xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-smoke/20 mx-auto mb-3" />
          <p className="text-smoke">No orders found</p>
          <p className="text-xs text-smoke/60 mt-1 mb-6">
            {orders.length === 0
              ? "Your ticket purchases will show up here"
              : "Try a different filter or search term"}
          </p>
          {orders.length === 0 && (
            <Link
              to="/events"
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Browse Events
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link
              key={order.reference}
              to={`/orders/${order.reference}`}
              className="group flex items-center gap-4 bg-panel border border-line hover:border-gold/40 rounded-2xl p-5 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-gold" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-bone truncate">{order.event_title}</p>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      STATUS_STYLES[order.status]
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-smoke">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.event_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {order.venue && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {order.venue}
                    </span>
                  )}
                  <span>
                    {order.ticket_count} {order.ticket_count === 1 ? "ticket" : "tickets"}
                  </span>
                  <span className="text-smoke/60">#{order.reference}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-bone">{formatMoney(order.amount_total, "NGN")}</p>
                {order.status === "partial" && (
                  <p className="text-xs text-gold">
                    {formatMoney(order.amount_total - order.amount_paid, "NGN")} due
                  </p>
                )}
                {(order.status === "paid" || order.status === "partial") && (
                  <Link
                    to={`/refund/${order.reference}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-semibold text-gold hover:text-gold-bright transition-colors"
                  >
                    Request Refund
                  </Link>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-smoke group-hover:text-gold transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
