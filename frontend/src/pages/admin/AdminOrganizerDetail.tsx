// frontend/src/pages/admin/OrganizerDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, DollarSign, Ticket, Calendar, AlertCircle } from "lucide-react";
import { apiGet } from "../../lib/apiClient";

interface OrganizerProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TicketTypeSummary {
  quantity_sold: number;
  quantity_total: number;
  price: number;
}

interface OrganizerEventRow {
  user_id: string;
  id: string;
  title: string;
  slug: string;
  start_at: string;
  status: string;
  ticket_types: TicketTypeSummary[];
}

export default function AdminOrganizerDetail() {
  const { organizerId } = useParams();
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [events, setEvents] = useState<OrganizerEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizerId) {
      setError("No organizer ID provided");
      setLoading(false);
      return;
    }

    const fetchOrganizerData = async () => {
      try {
        // 1. Fetch the organizer's profile
        const profileRes = await apiGet<{ user: OrganizerProfile }>(`/api/users/${organizerId}`);
        if (!profileRes.user) {
          throw new Error("Organizer not found");
        }
        setOrganizer(profileRes.user);

        // 2. Fetch all events (admin only) and filter by user_id
        const eventsRes = await apiGet<{ events: OrganizerEventRow[] }>("/api/admin/events");
        const allEvents = eventsRes.events || [];
        const orgEvents = allEvents.filter((e) => e.user_id === organizerId);
        setEvents(orgEvents);
      } catch (err) {
        console.error("Error loading organizer data:", err);
        setError(err instanceof Error ? err.message : "Failed to load organizer");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerData();
  }, [organizerId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading organizer…
      </div>
    );
  }

  if (error || !organizer) {
    return (
      <div className="max-w-5xl mx-auto px-6 pb-24 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="font-display text-3xl mb-3">Organizer not found</h2>
        <p className="text-smoke">{error || "This organizer doesn't exist or you don't have access."}</p>
        <Link to="/admin" className="inline-block mt-6 text-gold font-semibold hover:text-gold-bright transition-colors">
          ← Back to admin dashboard
        </Link>
      </div>
    );
  }

  const totalRevenue = events.reduce(
    (sum, e) => sum + e.ticket_types.reduce((s, t) => s + t.quantity_sold * t.price, 0),
    0
  );
  const totalSold = events.reduce((sum, e) => sum + e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Organizer</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-1">{organizer.full_name}</h1>
      <p className="text-sm text-smoke mb-10">{organizer.email}</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <DollarSign className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">₦{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-smoke">Total revenue</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <Ticket className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">{totalSold}</p>
          <p className="text-xs text-smoke">Tickets sold</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <Calendar className="w-5 h-5 text-gold mb-3" />
          <p className="text-2xl font-display tracking-wide">{events.length}</p>
          <p className="text-xs text-smoke">Events created</p>
        </div>
      </div>

      <h2 className="font-display text-2xl tracking-wide mb-5">Events</h2>
      {events.length === 0 ? (
        <p className="text-smoke text-sm">This organizer hasn't created any events yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const sold = e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0);
            const revenue = e.ticket_types.reduce((s, t) => s + t.quantity_sold * t.price, 0);
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-line rounded-2xl px-6 py-4"
              >
                <div>
                  <p className="font-bold">{e.title}</p>
                  <p className="text-xs text-smoke">
                    {sold} sold · ₦{revenue.toLocaleString()} · <span className="capitalize">{e.status}</span>
                  </p>
                </div>
                <Link to={`/events/${e.slug}`} className="text-xs font-semibold text-gold">
                  View listing →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}