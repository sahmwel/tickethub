// frontend/src/pages/organizer/EventStats.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Calendar,
  MapPin,
  Ticket,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  ScanLine,
  Eye,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Download,
  Clock,
  Percent,
  Activity,
  Award,
  Gift,
  Sparkles,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { formatEventDateTime, formatMoney } from "../../lib/constants";

interface StatsResponse {
  success: boolean;
  event: {
    id: string;
    title: string;
    slug: string;
    start_at: string;
    venue_name: string;
    status: string;
    country: string;
    currency: string;
    fee_bearer: "organizer" | "attendee";
  };
  stats: {
    revenue: number;
    ordersCount: number;
    ticketsIssued: number;
    checkedInCount: number;
    transferredCount: number;
    ticketTypeBreakdown: Array<{
      id: string;
      name: string;
      price: number;
      sold: number;
      total: number;
      revenue: number;
    }>;
    salesByDay: Record<string, number>;
  };
  orders: Array<any>;
}

// ─── Stat Card ──────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon,
  value,
  label,
  sublabel,
  trend,
  color = "gold",
}: {
  icon: any;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: number;
  color?: string;
}) => {
  const colorClasses = {
    gold: "bg-gold/10 text-gold group-hover:bg-gold/20",
    green: "bg-green-400/10 text-green-400 group-hover:bg-green-400/20",
    blue: "bg-blue-400/10 text-blue-400 group-hover:bg-blue-400/20",
    purple: "bg-purple-400/10 text-purple-400 group-hover:bg-purple-400/20",
  };

  return (
    <div className="group bg-panel border border-line hover:border-gold/40 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-2.5 rounded-xl transition-colors ${
            colorClasses[color as keyof typeof colorClasses] || colorClasses.gold
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              trend > 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>{trend > 0 ? "+" : ""} {trend}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-display tracking-wide text-bone">{value}</p>
      <p className="text-xs text-smoke mt-1">{label}</p>
      {sublabel && <p className="text-[10px] text-smoke/60 mt-0.5">{sublabel}</p>}
    </div>
  );
};

// ─── Progress Ring ──────────────────────────────────────────────────
const ProgressRing = ({ percentage, size = 70 }: { percentage: number; size?: number }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-line/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-gold transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-sm font-bold text-bone">{percentage}%</span>
    </div>
  );
};

// ─── Status Badge ───────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const configs = {
    published: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: "bg-green-400/10 text-green-400 border-green-400/20",
      label: "Published",
    },
    draft: {
      icon: <Clock className="w-3.5 h-3.5" />,
      color: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
      label: "Draft",
    },
    cancelled: {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      color: "bg-red-400/10 text-red-400 border-red-400/20",
      label: "Cancelled",
    },
  };

  const config = configs[status as keyof typeof configs] || configs.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────
export default function EventStats() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventId) {
      navigate("/organizer");
      return;
    }

    (async () => {
      try {
        const response = await apiGet<StatsResponse>(`/api/organizer/events/${eventId}/stats`);
        if (!response.event) {
          throw new Error("Event not found");
        }
        setStatsData(response);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event stats");
        setLoading(false);
      }
    })();
  }, [eventId, navigate]);

  const copyEventLink = () => {
    if (!statsData) return;
    const url = `${window.location.origin}/events/${statsData.event.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: string, timezone?: string) => {
    return formatEventDateTime(date, timezone || "Africa/Lagos", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-line rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-gold rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-smoke text-sm animate-pulse">Loading event statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !statsData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <div className="bg-panel border border-line rounded-2xl p-12">
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-display text-3xl mb-3 text-bone">Event not found</h2>
            <p className="text-smoke mb-6">{error || "This event doesn't exist or you don't have access."}</p>
            <Link
              to="/organizer"
              className="inline-flex items-center gap-2 text-gold font-semibold hover:text-gold-bright transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { event, stats } = statsData;

  // ─── Ticket types breakdown ──────────────────────────────────────
  const ticketTypes = stats.ticketTypeBreakdown || [];
  const totalTicketsSold = stats.ticketsIssued || 0;
  const totalTicketsAvailable = ticketTypes.reduce((sum, t) => sum + t.total, 0);
  const totalRevenue = stats.revenue || 0;
  const soldPercentage = totalTicketsAvailable > 0 ? Math.round((totalTicketsSold / totalTicketsAvailable) * 100) : 0;
  const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
  const activeTiers = ticketTypes.filter((t) => t.sold > 0).length;

  // If we have tickets sold but no breakdown, we still show the table with a message.
  const hasBreakdownData = ticketTypes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-24">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <Link
              to="/organizer"
              className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to dashboard
            </Link>

            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">{event.title}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={event.status} />
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-smoke">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gold" />
                {formatDate(event.start_at, "Africa/Lagos")}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gold" />
                {event.venue_name}
              </span>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              to={`/organizer/event/${event.id}/edit`}
              className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-semibold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <Link
              to={`/organizer/scan/${event.id}`}
              className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-semibold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow text-sm"
            >
              <ScanLine className="w-4 h-4" />
              Scan
            </Link>
            <Link
              to={`/events/${event.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow text-sm"
            >
              <Eye className="w-4 h-4" />
              View Live
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Ticket}
            value={totalTicketsSold}
            label="Tickets Sold"
            sublabel={`${soldPercentage}% of ${totalTicketsAvailable} available`}
            trend={soldPercentage}
            color="gold"
          />
          <StatCard
            icon={DollarSign}
            value={formatMoney(totalRevenue, event.currency || "NGN")}
            label="Total Revenue"
            sublabel={`Avg. ${formatMoney(averageTicketPrice, event.currency || "NGN")} per ticket`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            value={ticketTypes.length || 0}
            label="Ticket Tiers"
            sublabel={`${activeTiers} tier${activeTiers !== 1 ? "s" : ""} with sales`}
            color="blue"
          />
          <StatCard
            icon={Users}
            value={stats.ordersCount || 0}
            label="Total Orders"
            sublabel={`${stats.checkedInCount || 0} checked in`}
            color="purple"
          />
        </div>

        {/* Sell-through Progress */}
        {totalTicketsAvailable > 0 && (
          <div className="bg-panel border border-line rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gold" />
                    <span className="text-sm font-semibold text-bone">Overall Sell-through</span>
                  </div>
                  <span className="text-2xl font-display text-gold">{soldPercentage}%</span>
                </div>
                <div className="w-full h-3 bg-ink rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-1000 ease-out relative"
                    style={{ width: `${soldPercentage}%` }}
                  >
                    <div
                      className="absolute inset-0 animate-shimmer"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-smoke">0%</span>
                  <span className="text-xs text-smoke">
                    {totalTicketsSold.toLocaleString()} of {totalTicketsAvailable.toLocaleString()} sold
                  </span>
                  <span className="text-xs text-smoke">100%</span>
                </div>
              </div>
              <div className="shrink-0">
                <ProgressRing percentage={soldPercentage} size={80} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Event Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-smoke mb-1">Category</p>
                <p className="text-sm text-bone capitalize">N/A</p>
              </div>
              <div>
                <p className="text-xs text-smoke mb-1">Fee Bearer</p>
                <p className="text-sm text-bone capitalize">{event.fee_bearer || "attendee"} pays platform fee</p>
              </div>
              <div>
                <p className="text-xs text-smoke mb-1">Location</p>
                <p className="text-sm text-bone">{event.venue_name}</p>
              </div>
              <div>
                <p className="text-xs text-smoke mb-1">Status</p>
                <p className="text-sm text-bone">{event.status}</p>
              </div>
            </div>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Quick Actions
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-smoke mb-1.5">Public Event Page</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/events/${event.slug}`}
                    className="flex-1 bg-ink border border-line rounded-lg px-3 py-2 text-xs text-smoke outline-none cursor-default truncate"
                  />
                  <button
                    onClick={copyEventLink}
                    className="p-2 bg-panel border border-line rounded-lg hover:border-gold/50 transition-colors group shrink-0"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-4 h-4 text-gold" /> : <Copy className="w-4 h-4 text-smoke group-hover:text-bone transition-colors" />}
                  </button>
                </div>
              </div>
              <div className="pt-4 border-t border-line">
                <button className="w-full flex items-center justify-center gap-2 bg-ink/50 hover:bg-ink border border-line rounded-xl px-4 py-2.5 text-sm text-bone hover:border-gold/50 transition-colors">
                  <Download className="w-4 h-4" />
                  Export Report (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Tiers Table */}
        <div className="bg-panel border border-line rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-line flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Ticket Tiers
            </h2>
            <span className="text-xs text-smoke">{ticketTypes.length} tiers</span>
          </div>

          {!hasBreakdownData && totalTicketsAvailable === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-smoke/20 mx-auto mb-3" />
              <p className="text-sm text-smoke">No ticket types have been created for this event yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-ink/30">
                    <th className="text-left py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Ticket Tier
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Sold
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Available
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs text-smoke font-semibold uppercase tracking-wider">
                      Sell-through
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hasBreakdownData ? (
                    ticketTypes.map((ticket, index) => {
                      const sold = ticket.sold || 0;
                      const total = ticket.total || 0;
                      // ✅ FIX: "available" is remaining stock (total - sold),
                      // not the fixed total capacity. Previously this was
                      // `ticket.total || 0`, which never decreased as tickets
                      // sold — it just echoed the tier's total capacity forever.
                      const available = Math.max(total - sold, 0);
                      const percentage = total > 0 ? Math.round((sold / total) * 100) : 0;
                      const revenue = ticket.revenue || ticket.price * sold;
                      const isBestSeller = sold > 0 && sold === Math.max(...ticketTypes.map((t) => t.sold || 0));
                      // ✅ FIX: sold out now means no remaining stock, not
                      // "sold happens to equal what used to be called available"
                      // (which was actually just total capacity before).
                      const isSoldOut = total > 0 && available === 0;

                      return (
                        <tr
                          key={ticket.id}
                          className={`border-b border-line/50 hover:bg-ink/20 transition-colors ${
                            index % 2 === 0 ? "bg-transparent" : "bg-ink/5"
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-bone">{ticket.name}</span>
                              {isBestSeller && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                                  <Award className="w-3 h-3" />
                                  Best
                                </span>
                              )}
                              {isSoldOut && (
                                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                                  Sold Out
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-bone">
                            {formatMoney(ticket.price, event.currency || "NGN")}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-gold">
                            {sold.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right text-smoke">{available.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right text-bone">
                            {formatMoney(revenue, event.currency || "NGN")}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span
                                className={`text-xs font-semibold min-w-[36px] ${
                                  percentage >= 70
                                    ? "text-green-400"
                                    : percentage >= 30
                                      ? "text-yellow-400"
                                      : "text-smoke"
                                }`}
                              >
                                {percentage}%
                              </span>
                              <div className="w-20 h-1.5 bg-ink rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-700 ease-out ${
                                    percentage >= 70
                                      ? "bg-green-400"
                                      : percentage >= 30
                                        ? "bg-yellow-400"
                                        : "bg-gold"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-smoke">
                        Ticket tier breakdown is not available.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gold/5 border-t-2 border-gold/20">
                    <td className="py-3.5 px-4 font-bold text-bone">Total</td>
                    <td className="py-3.5 px-4 text-right text-smoke">—</td>
                    <td className="py-3.5 px-4 text-right font-bold text-gold">
                      {totalTicketsSold.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-smoke">{totalTicketsAvailable.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-gold">
                      {formatMoney(totalRevenue, event.currency || "NGN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-gold">{soldPercentage}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={`/organizer/event/${event.id}/edit`}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <Edit className="w-4 h-4" />
            Edit Event
          </Link>
          <Link
            to={`/organizer/scan/${event.id}`}
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <ScanLine className="w-4 h-4" />
            Scan Tickets
          </Link>
          <Link
            to={`/events/${event.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <Eye className="w-4 h-4" />
            View Public Listing
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={copyEventLink}
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-gold" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Event Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}