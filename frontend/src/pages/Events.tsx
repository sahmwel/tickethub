import { useEffect, useMemo, useState } from "react";
import { Search, LocateFixed, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import EventCard from "../components/EventCard";
import FeaturedEvent from "../components/FeaturedEvent";
import { fetchPublishedEvents, fetchFeaturedEvent } from "../lib/queries";
import { distanceKm } from "../utils/geo";
import { CATEGORIES } from "../lib/constants";
import type { EventWithTicketTypes } from "../types";

export default function Events() {
  const [events, setEvents] = useState<EventWithTicketTypes[]>([]);
  const [featured, setFeatured] = useState<EventWithTicketTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [city, setCity] = useState("All");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Get category names from constants
  const categoryNames = ["All", ...CATEGORIES.map(c => c.name)];

  useEffect(() => {
    (async () => {
      try {
        const [all, feat] = await Promise.all([fetchPublishedEvents(), fetchFeaturedEvent()]);
        setEvents(all);
        setFeatured(feat);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load events.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cities = useMemo(() => ["All", ...new Set(events.map((e) => e.city))], [events]);

  function findNearby() {
    if (!navigator.geolocation) {
      setLocError("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("Couldn't get your location — check your browser's permission for this site.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const filtered = events
    .filter((e) => {
      const matchesQuery =
        query.trim().length === 0 ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.venue_name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || e.category === category;
      const matchesCity = city === "All" || e.city === city;
      return matchesQuery && matchesCategory && matchesCity;
    })
    .map((e) => ({
      event: e,
      distance:
        userLoc && e.latitude != null && e.longitude != null
          ? distanceKm(userLoc.lat, userLoc.lng, e.latitude, e.longitude)
          : undefined,
    }))
    .sort((a, b) => {
      if (a.distance == null || b.distance == null) return 0;
      return a.distance - b.distance;
    });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading events…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
      <div className="mb-10">
        <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Browse</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-4">All events</h1>
        <p className="text-smoke max-w-lg">
          {filtered.length} event{filtered.length === 1 ? "" : "s"} found
          {userLoc ? " near you" : " across all locations"}.
        </p>
      </div>

      {error && <p className="text-sm text-red-400 mb-8">{error}</p>}

      {featured && <FeaturedEvent event={featured} />}

      <div className="flex flex-col sm:flex-row gap-4 mb-4 mt-16">
        <div className="flex-1 flex items-center gap-3 bg-panel border border-line rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
          <Search className="w-4 h-4 text-smoke shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search events, venues…"
            className="bg-transparent outline-none w-full text-sm text-bone placeholder:text-smoke/60"
          />
        </div>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="bg-panel border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors min-w-[140px]"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All cities" : c}
            </option>
          ))}
        </select>

        {userLoc ? (
          <button
            onClick={() => setUserLoc(null)}
            className="inline-flex items-center gap-2 bg-gold text-ink font-semibold px-4 py-3 rounded-xl text-sm whitespace-nowrap transition-colors hover:bg-gold-bright"
          >
            <X className="w-4 h-4" />
            Clear nearby
          </button>
        ) : (
          <button
            onClick={findNearby}
            disabled={locating}
            className="inline-flex items-center gap-2 border border-line hover:border-gold/50 bg-panel disabled:opacity-60 text-bone font-semibold px-4 py-3 rounded-xl text-sm whitespace-nowrap transition-colors"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 text-gold" />
            )}
            Events near me
          </button>
        )}
      </div>

      {locError && <p className="text-sm text-red-400 mb-6">{locError}</p>}
      {userLoc && !locError && (
        <p className="text-xs text-smoke mb-6">Sorted by distance from your current location.</p>
      )}

      <div className="flex flex-wrap gap-2 mb-10">
        {categoryNames.map((cat) => {
          // Find the category emoji if it exists
          const categoryData = CATEGORIES.find(c => c.name === cat);
          const displayName = categoryData ? `${categoryData.emoji} ${cat}` : cat;
          
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors whitespace-nowrap ${
                category === cat
                  ? "bg-gold text-ink border-gold"
                  : "border-line text-smoke hover:text-bone hover:border-gold/40"
              }`}
            >
              {displayName}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-smoke mb-3">No events match those filters.</p>
          <p className="text-xs text-smoke/70">
            Try adjusting your search, or{" "}
            <Link to="/organizer/create-event" className="text-gold font-semibold hover:text-gold-bright transition-colors">
              create an event
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(({ event, distance }) => (
            <EventCard key={event.id} event={event} distanceKm={distance} />
          ))}
        </div>
      )}
    </div>
  );
}
