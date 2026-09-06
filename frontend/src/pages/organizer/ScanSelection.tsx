// frontend/src/pages/organizer/ScanSelection.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { ScanLine, Calendar, Loader2, ArrowRight } from "lucide-react";

interface Event {
  id: string;
  title: string;
  start_at: string;
  venue_name: string;
  city: string;
  status: string;
}

export default function ScanSelection() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchEvents = async () => {
      try {
        const response = await apiGet<{ events: Event[] }>("/api/organizer/events");
        // Filter to only published events for scanning
        const publishedEvents = (response.events || []).filter((e) => e.status === "published");
        setEvents(publishedEvents);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading events...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-8 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <ScanLine className="w-8 h-8 text-gold" />
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide">Scan Tickets</h1>
          <p className="text-smoke text-sm mt-1">Select an event to start scanning</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-12 text-center">
          <p className="text-smoke mb-3">No published events to scan tickets for.</p>
          <Link
            to="/organizer/create-event"
            className="text-gold font-semibold hover:text-gold-bright transition-colors"
          >
            Create an event →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/organizer/scan/${event.id}`}
              className="group bg-panel border border-line hover:border-gold/40 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-bone group-hover:text-gold transition-colors truncate">
                    {event.title}
                  </h3>
                  <p className="text-sm text-smoke truncate">
                    {event.venue_name}, {event.city}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-smoke" />
                    <span className="text-xs text-smoke">
                      {new Date(event.start_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400">
                      Published
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-gold font-semibold group-hover:translate-x-1 transition-transform">
                    Scan Tickets
                  </span>
                  <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}