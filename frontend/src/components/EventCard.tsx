// frontend/src/components/EventCard.tsx
import { MapPin, Calendar, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import VerifiedBadge from "./VerifiedBadge";
import type { EventWithTicketTypes } from "../types";

interface Props {
  event: EventWithTicketTypes & { _isLive?: boolean; _isNew?: boolean };
  distanceKm?: number;
}

export default function EventCard({ event, distanceKm }: Props) {
  const priceFrom = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t) => t.price))
    : 0;

  // ─── Regex‑based date/time parser ──────────────────────────────
  function parseDateTime(dateStr: string): { date: string; time: string } {
    if (!dateStr) return { date: '', time: '' };

    const timeMatch = dateStr.match(/\b(\d{2}):(\d{2})(?::(\d{2}))?\b/);
    if (timeMatch) {
      const hours = timeMatch[1];
      const mins = timeMatch[2];
      const time = `${hours}:${mins}`;

      const dateMatch = dateStr.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
      if (dateMatch) {
        return { date: dateMatch[0], time };
      }
      const fallbackDate = dateStr.split('T')[0] || dateStr.split(' ')[0] || '';
      return { date: fallbackDate, time };
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      return { date: `${year}-${month}-${day}`, time: `${hours}:${mins}` };
    }
    return { date: '', time: '' };
  }

  function formatLocalDate(dateStr: string): string {
    const { date } = parseDateTime(dateStr);
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatLocalTime(dateStr: string): string {
    return parseDateTime(dateStr).time;
  }

  const dateLabel = event.start_at ? formatLocalDate(event.start_at) : '';
  const timeLabel = event.start_at ? formatLocalTime(event.start_at) : '';

  const getFallbackImage = (category: string) => {
    const fallbacks: Record<string, string> = {
      Concert: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
      Comedy: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&h=400&fit=crop",
      Festival: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
      Party: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop",
    };
    return fallbacks[category] || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop";
  };

  const imageUrl = event.cover_image || getFallbackImage(event.category);

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block rounded-2xl bg-panel border border-line hover:border-gold/50 overflow-hidden transition-all hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50"
    >
      <div className="relative h-48 overflow-hidden bg-ink">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />

        <span className="absolute top-3 left-3 bg-ink/80 backdrop-blur-sm text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border border-line text-gold">
          {event.category}
        </span>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {event._isLive && (
            <span className="flex items-center gap-1.5 bg-gold text-ink text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />
              LIVE
            </span>
          )}
          {!event._isLive && event._isNew && (
            <span className="bg-bone text-ink text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              NEW
            </span>
          )}
          {event.is_sponsored && (
            <span className="flex items-center gap-1 bg-purple-500/90 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              <Gift className="w-3 h-3" />
              SPONSORED
            </span>
          )}
        </div>
      </div>

      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-line" />
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ink border border-line" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ink border border-line" />
      </div>

      <div className="p-5 pt-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-xl tracking-wide group-hover:text-gold transition-colors line-clamp-2">
            {event.title}
          </h3>
          {event.is_verified && <VerifiedBadge className="shrink-0 mt-1" />}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-smoke mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
          {dateLabel} · {timeLabel}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-smoke mb-4">
          <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
          <span className="truncate">
            {event.venue_name}, {event.city}
          </span>
          {distanceKm != null && (
            <span className="shrink-0 text-gold font-semibold ml-auto">
              {distanceKm < 1 ? "<1 km" : `${distanceKm.toFixed(0)} km`} away
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-line/60">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-smoke">From</p>
            <p className="font-bold text-bone">
              ₦{priceFrom.toLocaleString()}
              {event.ticket_types?.length > 1 && (
                <span className="text-xs text-smoke font-normal ml-1">
                  +{event.ticket_types.length - 1} more
                </span>
              )}
            </p>
          </div>
          <div className="text-xs text-smoke">
            {event.ticket_types?.length || 0} ticket type{event.ticket_types?.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-[2px] opacity-40 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="bg-bone"
            style={{ width: 2, height: i % 3 === 0 ? 14 : 8 }}
          />
        ))}
      </div>
    </Link>
  );
}