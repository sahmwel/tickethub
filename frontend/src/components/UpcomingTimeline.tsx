import { CalendarClock, MapPin, ArrowRight } from "lucide-react";
import type { EventWithTicketTypes } from "../types";

export default function UpcomingTimeline({ events }: { events: EventWithTicketTypes[] }) {
  if (events.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-4 pb-4">
      <div className="flex items-center gap-2 mb-10">
        <CalendarClock className="w-4 h-4 text-gold" />
        <p className="text-xs font-bold tracking-widest uppercase text-gold">Coming up next</p>
      </div>

      <div className="relative">
        <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-line" />

        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
          {events.map((e, i) => {
            const d = new Date(e.start_at);
            const day = d.toLocaleDateString("en-US", { day: "2-digit", timeZone: "Africa/Lagos" });
            const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "Africa/Lagos" });
            const priceFrom = e.ticket_types?.length
              ? Math.min(...e.ticket_types.map((t) => t.price))
              : 0;

            return (
              <a key={e.id} href={`/events/${e.slug}`} className="group relative block">
                <div className="hidden sm:flex items-center justify-center w-3 h-3 rounded-full bg-gold border-4 border-ink relative z-10 mb-4" />

                <div className="rounded-2xl overflow-hidden border border-line group-hover:border-gold/40 transition-colors bg-panel">
                  <div className="relative h-40">
                    <img
                      src={e.cover_image || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop"}
                      alt={e.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-ink/85 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center border border-line">
                      <p className="font-display text-lg leading-none text-gold">{day}</p>
                      <p className="text-[9px] uppercase tracking-widest text-smoke">{month}</p>
                    </div>
                    <span className="absolute top-3 right-3 text-[10px] font-bold tracking-widest uppercase text-ink bg-gold px-2 py-1 rounded-full">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1.5 group-hover:text-gold transition-colors truncate">
                      {e.title}
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs text-smoke mb-4 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                      {e.venue_name}, {e.city}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-bone">
                        ₦{priceFrom.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                        Get tickets
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
