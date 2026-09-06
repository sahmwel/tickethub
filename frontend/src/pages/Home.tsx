// frontend/src/pages/Home.tsx
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import EventTicker from "../components/EventTicker";
import EventCard from "../components/EventCard";
import UpcomingTimeline from "../components/UpcomingTimeline";
import NewDrops from "../components/NewDrops";
import TrendingEvents from "../components/TrendingEvents";
import Sponsors from "../components/Sponsors";
import { fetchPublishedEvents, fetchUpcomingEvents, fetchNewEvents, fetchTrendingEvents, fetchSponsoredEvents } from "../lib/queries";
import { CATEGORIES } from "../lib/constants";
import type { EventWithTicketTypes } from "../types";

export default function Home() {
  const [allEvents, setAllEvents] = useState<EventWithTicketTypes[]>([]);
  const [upcoming, setUpcoming] = useState<EventWithTicketTypes[]>([]);
  const [newDrops, setNewDrops] = useState<EventWithTicketTypes[]>([]);
  const [trending, setTrending] = useState<EventWithTicketTypes[]>([]);
  const [sponsored, setSponsored] = useState<EventWithTicketTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categoryNames = ["All", ...CATEGORIES.map(c => c.name)];

  useEffect(() => {
    (async () => {
      try {
        const [all, up, drops, trend, sponsoredEvents] = await Promise.all([
          fetchPublishedEvents(),
          fetchUpcomingEvents(3),
          fetchNewEvents(8),
          fetchTrendingEvents(6),
          fetchSponsoredEvents(10),
        ]);
        setAllEvents(all);
        setUpcoming(up);
        setNewDrops(drops);
        setTrending(trend);
        setSponsored(sponsoredEvents);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load events.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredEvents = selectedCategory === "All" 
    ? allEvents 
    : allEvents.filter(event => event.category === selectedCategory);

  const getImageUrl = (event: EventWithTicketTypes) => {
    if (event.cover_image) {
      return event.cover_image;
    }
    const fallbacks: Record<string, string> = {
      "Concerts & Live Music": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      "Festivals": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
      "Parties & Nightlife": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
      "Rave / EDM Parties": "https://images.unsplash.com/photo-1571266028243-e4733b0f0a1c?w=600&h=400&fit=crop",
      "House Party": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
      "Networking Events": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop",
      "Workshop & Classes": "https://images.unsplash.com/photo-1544531585-f9840e1a8bc0?w=600&h=400&fit=crop",
      "Conference & Seminars": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
      "Sports Events": "https://images.unsplash.com/photo-1461896836934-bead69c5d3e0?w=600&h=400&fit=crop",
      "Theatre & Performing Arts": "https://images.unsplash.com/photo-1507676184212-d6ab0d2e5f68?w=600&h=400&fit=crop",
      "Birthday Parties": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=400&fit=crop",
      "Weddings & Engagements": "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
      "Corporate Events": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
      "Charity & Fundraisers": "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop",
      "Food & Drink Tastings": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
      "Beach Party": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
      "Pool Party": "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=600&h=400&fit=crop",
      "Themed Costume Party": "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=600&h=400&fit=crop",
      "Karaoke Night": "https://images.unsplash.com/photo-1516282398626-3b65d4049e78?w=600&h=400&fit=crop",
      "Halloween Party": "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&h=400&fit=crop",
      "Christmas Party": "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600&h=400&fit=crop",
      "New Year's Eve Party": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=600&h=400&fit=crop",
    };
    return fallbacks[event.category] || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop";
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading events…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <p className="text-smoke mb-2">Couldn't load events right now.</p>
        <p className="text-xs text-smoke/70">{error}</p>
      </div>
    );
  }

  return (
    <>
      <Hero events={upcoming.length ? upcoming : allEvents} />
      <EventTicker events={allEvents} />
      <UpcomingTimeline events={upcoming} />
      <NewDrops events={newDrops} />
      <TrendingEvents events={trending} />
      <Sponsors events={sponsored} />

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">
              Happening soon
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide">
              Upcoming events
            </h2>
          </div>
          <Link
            to="/events"
            className="group inline-flex items-center gap-2 text-sm font-bold text-bone hover:text-gold transition-colors"
          >
            View all events
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {categoryNames.map((category) => {
            const categoryData = CATEGORIES.find(c => c.name === category);
            const displayName = categoryData ? `${categoryData.emoji} ${category}` : category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-sm font-semibold px-4 py-2 rounded-full border transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-gold text-ink border-gold"
                    : "border-line text-smoke hover:text-bone hover:border-gold/40"
                }`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="bg-panel border border-dashed border-line rounded-2xl p-16 text-center text-smoke">
            {selectedCategory === "All" 
              ? "No events published yet — check back soon, or "
              : `No ${selectedCategory} events found. `}
            <Link to="/get-started" className="text-gold font-semibold hover:text-gold-bright transition-colors">
              Create an event
            </Link>
            .
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={{
                  ...event,
                  cover_image: getImageUrl(event)
                }} 
              />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-panel to-ink px-8 py-16 sm:px-16 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-[100px]" />
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">
            For organizers
          </p>
          <h2 className="font-display text-4xl sm:text-5xl tracking-wide mb-5 max-w-2xl mx-auto">
            Sell out your next event.
          </h2>
          <p className="text-smoke max-w-lg mx-auto mb-8">
            Verified checkout, inline card payments, live sales tracking, and
            a dashboard built for how you actually run events.
          </p>
          <Link
            to="/get-started"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-7 py-4 rounded-full transition-colors"
          >
            Create your event
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}