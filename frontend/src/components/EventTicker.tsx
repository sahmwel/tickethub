import { Ticket } from "lucide-react";
import type { EventWithTicketTypes } from "../types";

export default function EventTicker({ events }: { events: EventWithTicketTypes[] }) {
  if (events.length === 0) return null;
  const strip = [...events, ...events]; // duplicated for seamless loop

  return (
    <div className="relative border-y border-line bg-panel/60 overflow-hidden py-4">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-ink to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-ink to-transparent z-10" />

      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {strip.map((e, i) => (
          <div
            key={`${e.id}-${i}`}
            className="flex items-center gap-2 px-6 text-sm text-smoke whitespace-nowrap border-r border-line/60"
          >
            <Ticket className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="font-semibold text-bone">{e.title}</span>
            <span className="text-smoke/70">
              · {e.venue_name}, {e.city}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
