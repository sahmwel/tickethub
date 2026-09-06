// frontend/src/pages/organizer/MyEvents.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  Ticket,
  Calendar,
  MapPin,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { formatEventDateTime, formatMoney } from "../../lib/constants";
import { useAuth } from "../../context/AuthContext";

interface OrganizerEvent {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_at: string;
  end_at: string | null;
  venue_name: string;
  city: string;
  country: string;
  currency: string;
  cover_image: string | null;
  category: string;
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
}

export default function MyEvents() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fallback images based on category
  const getFallbackImage = (category: string) => {
    const fallbacks: Record<string, string> = {
      "Concerts & Live Music":
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      Festivals: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
      "Parties & Nightlife":
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
      "Rave / EDM Parties":
        "https://images.unsplash.com/photo-1571266028243-e4733b0f0a66?w=600&h=400&fit=crop",
      "House Party": "https://images.unsplash.com/photo-1571266028243-e4733b0f0a66?w=600&h=400&fit=crop",
      "Networking Events":
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop",
      "Workshop & Classes":
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop",
      "Conference & Seminars":
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop",
      "Sports Events":
        "https://images.unsplash.com/photo-1461896836934-bd0773f33925?w=600&h=400&fit=crop",
      "Theatre & Performing Arts":
        "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=400&fit=crop",
      "Birthday Parties":
        "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=400&fit=crop",
      "Weddings & Engagements":
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
      "Corporate Events":
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop",
      "Charity & Fundraisers":
        "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop",
      "Food & Drink Tastings":
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=400&fit=crop",
      "Beach Party": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
      "Pool Party": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&h=400&fit=crop",
      "Themed Costume Party":
        "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=600&h=400&fit=crop",
      "Karaoke Night":
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop",
      "Halloween Party":
        "https://images.unsplash.com/photo-1535522673997-2b2dca443894?w=600&h=400&fit=crop",
      "Christmas Party":
        "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600&h=400&fit=crop",
      "New Year's Eve Party":
        "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=600&h=400&fit=crop",
    };
    return fallbacks[category] || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop";
  };

  useEffect(() => {
    if (!profile) {
      navigate("/organizer");
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiGet<{ events: OrganizerEvent[] }>("/api/organizer/events");
        setEvents(response.events || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [profile, navigate]);

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      published: {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        color: "bg-green-400/10 text-green-400 border-green-400/20",
        label: "Published",
      },
      draft: {
        icon: <Clock className="w-3.5 h-3.5" />,
        color: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
        label: "Draft",
      },
      cancelled: {
        icon: <XCircle className="w-3.5 h-3.5" />,
        color: "bg-red-400/10 text-red-400 border-red-400/20",
        label: "Cancelled",
      },
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const handleImageError = (eventId: string) => {
    setImageErrors((prev) => ({ ...prev, [eventId]: true }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-line rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-gold rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-smoke text-sm animate-pulse">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-24">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">My Events</h1>
            <p className="text-smoke text-sm mt-1">Manage and monitor all your events</p>
          </div>
          <Link
            to="/organizer/create-event"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        </div>

        {/* Stats Summary */}
        {events.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-2xl font-display text-bone">{events.length}</p>
              <p className="text-xs text-smoke">Total Events</p>
            </div>
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-2xl font-display text-bone">
                {events.filter((e) => e.status === "published").length}
              </p>
              <p className="text-xs text-smoke">Published</p>
            </div>
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-2xl font-display text-bone">
                {events.reduce((sum, e) => sum + e.ticketsSold, 0)}
              </p>
              <p className="text-xs text-smoke">Total Tickets Sold</p>
            </div>
            <div className="bg-panel border border-line rounded-xl p-4">
              <p className="text-2xl font-display text-bone">
                {events.filter((e) => e.status === "draft").length}
              </p>
              <p className="text-xs text-smoke">In Draft</p>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-panel border border-line rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
              <input
                type="text"
                placeholder="Search by title, venue, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-ink/50 border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-bone placeholder-smoke focus:border-gold/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-smoke" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-ink/50 border border-line rounded-xl px-3 py-2.5 text-sm text-bone focus:border-gold/50 focus:outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-panel border border-dashed border-line rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchTerm || filterStatus !== "all" ? (
                <Search className="w-10 h-10 text-smoke/30" />
              ) : (
                <Ticket className="w-10 h-10 text-smoke/30" />
              )}
            </div>
            {searchTerm || filterStatus !== "all" ? (
              <>
                <p className="text-smoke mb-2">No events match your filters</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                  }}
                  className="text-gold font-semibold hover:text-gold-bright transition-colors text-sm"
                >
                  Clear filters →
                </button>
              </>
            ) : (
              <>
                <p className="text-smoke mb-3">You haven't created any events yet</p>
                <Link
                  to="/organizer/create-event"
                  className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-2.5 rounded-xl transition-all hover:scale-105 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create your first event
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEvents.map((event) => {
              const statusBadge = getStatusBadge(event.status);
              const sellThrough =
                event.totalTickets > 0 ? Math.round((event.ticketsSold / event.totalTickets) * 100) : 0;

              const imageUrl = imageErrors[event.id]
                ? getFallbackImage(event.category)
                : event.cover_image || getFallbackImage(event.category);

              return (
                <div
                  key={event.id}
                  className="group bg-panel border border-line hover:border-gold/40 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="p-6">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* Event Image/Icon */}
                      <div className="w-20 h-20 rounded-xl bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors overflow-hidden relative">
                        <img
                          src={imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          onError={() => handleImageError(event.id)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-panel/20 via-transparent to-transparent" />
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-bone group-hover:text-gold transition-colors text-lg truncate">
                              {event.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1.5 text-sm text-smoke">
                                <MapPin className="w-3.5 h-3.5 text-gold" />
                                <span>
                                  {event.venue_name}, {event.city}
                                </span>
                              </span>
                              <span className="flex items-center gap-1.5 text-sm text-smoke">
                                <Calendar className="w-3.5 h-3.5 text-gold" />
                                {formatEventDateTime(event.start_at, "Africa/Lagos", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border shrink-0 ${statusBadge.color}`}
                          >
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-line/50">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gold/60" />
                            <div>
                              <p className="text-xs text-smoke">Tickets Sold</p>
                              <p className="text-sm font-bold text-bone">{event.ticketsSold}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gold/60" />
                            <div>
                              <p className="text-xs text-smoke">Revenue</p>
                              <p className="text-sm font-bold text-bone">
                                {formatMoney(event.revenue, event.currency)}
                              </p>
                            </div>
                          </div>

                          {event.totalTickets > 0 && (
                            <div className="flex items-center gap-3 ml-auto">
                              <div className="text-right">
                                <p className="text-xs text-smoke">Capacity</p>
                                <p className="text-sm font-bold text-bone">{sellThrough}%</p>
                              </div>
                              <div className="w-24 h-1.5 bg-ink rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-1000 ease-out ${
                                    sellThrough >= 70
                                      ? "bg-green-400"
                                      : sellThrough >= 30
                                        ? "bg-yellow-400"
                                        : "bg-gold"
                                  }`}
                                  style={{ width: `${sellThrough}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-line/50">
                      <Link
                        to={`/event/${event.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors px-3 py-1.5 rounded-lg hover:bg-ink/30"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      <Link
                        to={`/organizer/event/${event.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-gold transition-colors px-3 py-1.5 rounded-lg hover:bg-ink/30"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <Link
                        to={`/organizer/event/${event.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:text-gold-bright transition-colors px-3 py-1.5 rounded-lg hover:bg-gold/10"
                      >
                        Statistics
                        <Users className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Count */}
        {filteredEvents.length > 0 && (
          <div className="text-center text-xs text-smoke mt-6">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}
      </div>
    </div>
  );
}