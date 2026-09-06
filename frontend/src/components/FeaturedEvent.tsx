import { ArrowRight, Calendar, MapPin, Flame } from "lucide-react";
import type { EventWithTicketTypes } from "../types";

export default function FeaturedEvent({ event }: { event: EventWithTicketTypes }) {
  const start = new Date(event.start_at);
  const dateLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Africa/Lagos" });
  const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

  return (
    <section className="pt-4 pb-4">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="w-4 h-4 text-gold" />
        <p className="text-xs font-bold tracking-widest uppercase text-gold">Featured event</p>
      </div>

      <a
        href={`/events/${event.slug}`}
        className="group relative block rounded-3xl overflow-hidden border border-line hover:border-gold/40 transition-colors"
      >
        <div className="relative h-[340px] sm:h-[420px]">
          <img
            src={event.cover_image || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop"}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <span className="inline-block text-[11px] font-bold tracking-widest uppercase bg-gold text-ink px-3 py-1 rounded-full mb-4">
                {event.category}
              </span>
              <h3 className="font-display text-4xl sm:text-6xl tracking-wide mb-3 max-w-xl">
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-smoke">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gold" />
                  {dateLabel} · {timeLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gold" />
                  {event.venue_name}, {event.city}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-gold text-ink font-bold px-6 py-3.5 rounded-full group-hover:gap-3 transition-all">
              Get tickets
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </a>
    </section>
  );
}
