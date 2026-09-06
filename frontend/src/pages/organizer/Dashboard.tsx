// frontend/src/pages/organizer/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, TrendingUp, Ticket, DollarSign, ScanLine, BarChart3, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiGet } from "../../lib/apiClient";

interface OrganizerEvent {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  start_at: string;
  status: string;
  is_verified: boolean;
  revenue: number;
  ticketsSold: number;
  ticketsTotal: number;
  ordersCount: number;
}

export default function OrganizerDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    apiGet<{ events: OrganizerEvent[] }>("/api/organizer/events")
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, [profile]);

  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const totalTickets = events.reduce((sum, e) => sum + e.ticketsSold, 0);
  const liveEvents = events.filter((e) => e.status === "published").length;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-2">
            Organizer dashboard
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide">
            {profile?.full_name ?? "Your events"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/organizer/create-event"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 py-3 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" />
            New event
          </Link>
          <Link
            to="/organizer/events"
            className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/50 text-bone font-semibold px-5 py-3 rounded-full transition-colors"
          >
            <Calendar className="w-4 h-4" />
            My Events
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-8">{error}</p>}

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <DollarSign className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">₦{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-smoke">Total revenue</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <Ticket className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">{totalTickets}</p>
          <p className="text-xs text-smoke">Tickets sold</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">{liveEvents}</p>
          <p className="text-xs text-smoke">Live events</p>
        </div>
      </div>

      <h2 className="font-display text-2xl tracking-wide mb-5">Your events</h2>

      {loading ? (
        <p className="text-smoke text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-12 text-center">
          <Ticket className="w-12 h-12 text-smoke/20 mx-auto mb-4" />
          <p className="text-smoke mb-4">You haven't created an event yet.</p>
          <Link to="/organizer/create-event" className="text-gold font-semibold text-sm hover:text-gold-bright transition-colors">
            Create your first event →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-line rounded-2xl px-6 py-4 hover:border-gold/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-bone truncate">{e.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-xs text-smoke">
                    {e.ticketsSold}/{e.ticketsTotal} sold
                  </p>
                  <span className="text-xs text-smoke">·</span>
                  <p className="text-xs text-smoke">₦{e.revenue.toLocaleString()}</p>
                  <span className="text-xs text-smoke">·</span>
                  <p className="text-xs text-smoke">{formatDate(e.start_at)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    e.status === "published" 
                      ? "bg-green-400/10 text-green-400" 
                      : e.status === "draft"
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-red-400/10 text-red-400"
                  }`}>
                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                  </span>
                  {e.is_verified && (
                    <span className="text-xs font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/organizer/event/${e.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line hover:border-gold/50 px-3 py-2 rounded-full transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Stats
                </Link>
                <Link
                  to={`/organizer/scan/${e.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line hover:border-gold/50 px-3 py-2 rounded-full transition-colors"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Scan
                </Link>
                <Link
                  to={`/organizer/event/${e.id}/edit`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line hover:border-gold/50 px-3 py-2 rounded-full transition-colors"
                >
                  Edit
                </Link>
                <Link
                  to={`/events/${e.slug}`}
                  target="_blank"
                  className="text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
                >
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
