import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { apiGet, apiPatch } from "../../lib/apiClient";

interface AdminEvent {
  id: string;
  title: string;
  slug: string;
  venue_name: string;
  city: string;
  start_at: string;
  status: "draft" | "published" | "cancelled";
  is_verified: boolean;
  profiles?: { full_name: string; email: string };
}

const statusColors: Record<string, string> = {
  draft: "text-smoke border-line",
  published: "text-gold border-gold/40",
  cancelled: "text-red-400 border-red-400/40",
};

export default function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "cancelled">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ events: AdminEvent[] }>("/api/admin/events")
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const toggleVerified = async (event: AdminEvent) => {
    setBusyId(event.id);
    try {
      await apiPatch(`/api/admin/events/${event.id}/verify`, { verified: !event.is_verified });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, is_verified: !e.is_verified } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update verification");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (event: AdminEvent, status: AdminEvent["status"]) => {
    setBusyId(event.id);
    try {
      await apiPatch(`/api/admin/events/${event.id}/status`, { status });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = events.filter((e) => {
    const matchesQuery =
      query.trim().length === 0 ||
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.venue_name?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-10">All events</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-panel border border-line rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
          <Search className="w-4 h-4 text-smoke shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues…"
            className="bg-transparent outline-none w-full text-sm text-bone placeholder:text-smoke/60"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-panel border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-smoke text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-smoke text-sm">No events match those filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="bg-panel border border-line rounded-2xl px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-bold flex items-center gap-2">
                    {e.title}
                    {e.is_verified && <ShieldCheck className="w-4 h-4 text-gold" />}
                  </p>
                  <p className="text-xs text-smoke">
                    {e.venue_name}, {e.city} · {e.profiles?.full_name ?? "Unknown organizer"}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${statusColors[e.status]}`}>
                  {e.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleVerified(e)}
                  disabled={busyId === e.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line hover:border-gold/50 px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                >
                  {e.is_verified ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 text-gold" />}
                  {e.is_verified ? "Unverify" : "Verify"}
                </button>

                {e.status !== "published" && (
                  <button
                    onClick={() => setStatus(e, "published")}
                    disabled={busyId === e.id}
                    className="text-xs font-semibold bg-gold text-ink px-3 py-2 rounded-full disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}
                {e.status !== "cancelled" && (
                  <button
                    onClick={() => setStatus(e, "cancelled")}
                    disabled={busyId === e.id}
                    className="text-xs font-semibold border border-red-400/40 text-red-400 px-3 py-2 rounded-full disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                {e.status !== "draft" && (
                  <button
                    onClick={() => setStatus(e, "draft")}
                    disabled={busyId === e.id}
                    className="text-xs font-semibold border border-line text-smoke px-3 py-2 rounded-full disabled:opacity-50"
                  >
                    Move to draft
                  </button>
                )}

                <Link to={`/events/${e.slug}`} className="text-xs font-semibold text-gold ml-auto">
                  View listing →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
