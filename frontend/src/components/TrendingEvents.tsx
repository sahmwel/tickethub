import { TrendingUp, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { EventWithTicketTypes } from "../types";

export default function TrendingEvents({ events }: { events: EventWithTicketTypes[] }) {
  if (events.length === 0) return null;

  // Fallback images based on category (same as EventCard)
  const getFallbackImage = (category: string) => {
    const fallbacks: Record<string, string> = {
      "Concerts & Live Music": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop",
      "Festivals": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop",
      "Parties & Nightlife": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop",
      "Rave / EDM Parties": "https://images.unsplash.com/photo-1571266028243-e4733b0f0a1c?w=400&h=400&fit=crop",
      "House Party": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop",
      "Networking Events": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=400&fit=crop",
      "Workshop & Classes": "https://images.unsplash.com/photo-1544531585-f9840e1a8bc0?w=400&h=400&fit=crop",
      "Conference & Seminars": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
      "Sports Events": "https://images.unsplash.com/photo-1461896836934-bead69c5d3e0?w=400&h=400&fit=crop",
      "Theatre & Performing Arts": "https://images.unsplash.com/photo-1507676184212-d6ab0d2e5f68?w=400&h=400&fit=crop",
      "Birthday Parties": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=400&fit=crop",
      "Weddings & Engagements": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop",
      "Corporate Events": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop",
      "Charity & Fundraisers": "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=400&fit=crop",
      "Food & Drink Tastings": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop",
      "Beach Party": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop",
      "Pool Party": "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=400&h=400&fit=crop",
      "Themed Costume Party": "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=400&h=400&fit=crop",
      "Karaoke Night": "https://images.unsplash.com/photo-1516282398626-3b65d4049e78?w=400&h=400&fit=crop",
      "Halloween Party": "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=400&fit=crop",
      "Christmas Party": "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400&h=400&fit=crop",
      "New Year's Eve Party": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&h=400&fit=crop",
    };
    return fallbacks[category] || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop";
  };

  // Get the image URL with proper fallback (same as EventCard)
  const getImageUrl = (event: EventWithTicketTypes) => {
    if (event.cover_image && event.cover_image.trim() !== "") {
      return event.cover_image;
    }
    return getFallbackImage(event.category);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="w-4 h-4 text-gold" />
        <p className="text-xs font-bold tracking-widest uppercase text-gold">Trending now</p>
      </div>

      <div className="grid gap-3">
        {events.map((e, i) => {
          const priceFrom = e.ticket_types?.length
            ? Math.min(...e.ticket_types.map((t) => t.price))
            : 0;
          const start = new Date(e.start_at);
          const dateLabel = start.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric", 
            timeZone: e.timezone || "Africa/Lagos" 
          });

          const imageUrl = getImageUrl(e);

          return (
            <Link
              key={e.id}
              to={`/events/${e.slug}`}
              className="group flex items-center gap-5 sm:gap-8 bg-panel border border-line hover:border-gold/40 rounded-2xl px-5 sm:px-8 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="font-display text-3xl sm:text-4xl text-gold/40 w-10 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-ink border border-line">
                <img
                  src={imageUrl}
                  alt={e.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    // If image fails to load, use a generic fallback
                    e.currentTarget.src = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop";
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-bone truncate group-hover:text-gold transition-colors">
                  {e.title}
                </h4>
                <p className="text-xs text-smoke truncate">
                  {e.venue_name}, {e.city} · {dateLabel}
                </p>
                {/* Show category tag */}
                <span className="inline-block mt-1 text-[10px] font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                  {e.category}
                </span>
              </div>

              <div className="hidden sm:block text-right shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-smoke">From</p>
                <p className="font-bold text-bone">
                  ₦{priceFrom.toLocaleString()}
                  {e.ticket_types?.length > 1 && (
                    <span className="text-xs text-smoke font-normal ml-1">
                      +{e.ticket_types.length - 1}
                    </span>
                  )}
                </p>
                {/* Show ticket count */}
                <p className="text-[10px] text-smoke/60">
                  {e.ticket_types?.length || 0} {e.ticket_types?.length !== 1 ? 'tiers' : 'tier'}
                </p>
              </div>

              <ArrowUpRight className="w-4 h-4 text-smoke group-hover:text-gold transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}