// frontend/src/components/Sponsors.tsx
import { Sparkle } from "lucide-react";
import { useEffect, useRef } from "react";
import type { EventWithTicketTypes } from "../types";
import EventCard from "./EventCard";

export default function Sponsors({ events }: { events: EventWithTicketTypes[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || events.length <= 3) return;

    let isHovering = false;
    const onEnter = () => { isHovering = true; };
    const onLeave = () => { isHovering = false; };

    const interval = setInterval(() => {
      if (!isHovering && container) {
        container.scrollLeft += 1;
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 10) {
          container.scrollLeft = 0;
        }
      }
    }, 30);

    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      clearInterval(interval);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div className="flex items-center gap-2 mb-8">
        <Sparkle className="w-4 h-4 text-gold" />
        <p className="text-xs font-bold tracking-widest uppercase text-gold">Sponsored</p>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 lg:mx-0 lg:px-0 snap-x snap-mandatory scrollbar-none"
      >
        {events.map((e) => (
          <div key={e.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
            <EventCard event={e} />
          </div>
        ))}
      </div>
    </section>
  );
}