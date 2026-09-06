// frontend/src/components/NewDrops.tsx
import { Sparkle } from "lucide-react";
import { useEffect, useRef } from "react";
import type { EventWithTicketTypes } from "../types";
import EventCard from "./EventCard";

// All events on this platform are in Nigeria — always show times in WAT
// (UTC+1), regardless of the viewer's own device/browser timezone.
const EVENT_TIMEZONE = "Africa/Lagos";

export default function NewDrops({ events }: { events: EventWithTicketTypes[] }) {
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

  function ticketStats(event: EventWithTicketTypes) {
    const tiers = event.ticket_types ?? [];
    let totalCapacity = 0;
    let totalSold = 0;

    for (const t of tiers) {
      totalCapacity += Number(t.quantity_total) || 0;
      totalSold += Number(t.quantity_sold) || 0;
    }

    const remaining = Math.max(totalCapacity - totalSold, 0);
    const configured = totalCapacity > 0;
    const soldOut = configured && remaining <= 0;
    const sellingOut = configured && !soldOut && totalSold / totalCapacity > 0.7;

    return { totalCapacity, totalSold, remaining, configured, soldOut, sellingOut };
  }

  function formattedDateTime(event: EventWithTicketTypes) {
    const date = new Date(event.start_at);
    const dateLabel = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: EVENT_TIMEZONE,
    });
    const timeLabel = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: EVENT_TIMEZONE,
    });
    return { dateLabel, timeLabel: `${timeLabel} WAT` };
  }

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Sparkle className="w-4 h-4 text-gold" />
          <p className="text-xs font-bold tracking-widest uppercase text-gold">Just dropped</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-smoke/60">
          <span className="hidden sm:inline">Scroll to explore</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/20" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold/10" />
          </span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 lg:mx-0 lg:px-0 snap-x snap-mandatory scrollbar-none"
      >
        {events.map((e) => {
          const { remaining, configured, soldOut, sellingOut } = ticketStats(e);
          const { dateLabel, timeLabel } = formattedDateTime(e);
          const isNew = e._isNew ?? false; // derived flag from withDerivedFlags

          return (
            <div key={e.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start relative">
              {isNew && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="flex items-center gap-1 bg-gold text-ink text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg shadow-gold/20">
                    <Sparkle className="w-3 h-3" />
                    NEW
                  </div>
                </div>
              )}

              {soldOut && (
                <div className="absolute top-10 right-2 z-20">
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">
                    Sold Out
                  </span>
                </div>
              )}
              {!soldOut && sellingOut && (
                <div className="absolute top-10 right-2 z-20">
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/20">
                    🔥 {remaining} left
                  </span>
                </div>
              )}
              {!soldOut && !sellingOut && configured && (
                <div className="absolute top-10 right-2 z-20">
                  <span className="bg-green-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-green-500/20">
                    ✓ Available
                  </span>
                </div>
              )}

              <div className="absolute bottom-20 left-3 z-20 bg-ink/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-line">
                <p className="text-[10px] font-bold text-gold">{dateLabel}</p>
                <p className="text-[9px] text-smoke/70">{timeLabel}</p>
              </div>

              <EventCard event={{ ...e, _isNew: isNew, _isLive: false }} />
            </div>
          );
        })}
      </div>

      {events.length > 4 && (
        <div className="flex justify-center gap-1.5 mt-6">
          {events.slice(0, 6).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === 0 ? "bg-gold w-4" : "bg-gold/30"}`}
            />
          ))}
          {events.length > 6 && <span className="w-1.5 h-1.5 rounded-full bg-gold/10" />}
        </div>
      )}
    </section>
  );
}