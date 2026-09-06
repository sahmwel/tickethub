import { ArrowRight, Plus, Search, ShieldCheck, MapPin, Car } from "lucide-react";
import type { EventWithTicketTypes } from "../types";

const badges = [
  { icon: ShieldCheck, label: "Verified" },
  { icon: Car, label: "Uber-ready" },
  { icon: MapPin, label: "Live map" },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=900&auto=format&fit=crop";

interface Props {
  events: EventWithTicketTypes[]; // up to 3, used for the bouncing posters
}

export default function Hero({ events }: Props) {
  const posters = [0, 1, 2].map((i) => events[i]);
  const dateLabel = (e?: EventWithTicketTypes) =>
    e ? new Date(e.start_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Africa/Lagos" }) : "";

  return (
    <section className="relative overflow-hidden pt-12 pb-28 lg:pt-16 lg:pb-36">
      <div className="pointer-events-none absolute -top-40 right-0 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative z-10 animate-riseIn">
          <div className="inline-flex items-center gap-2 border border-line rounded-full px-4 py-1.5 mb-8 bg-panel/60">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulseDot" />
            <span className="text-xs font-semibold tracking-widest text-smoke uppercase">
              Nigeria's live nightlife, in one place
            </span>
          </div>

          {/* NEW HEADLINE */}
          <h1 className="font-display text-[15vw] leading-[0.85] sm:text-7xl lg:text-[5.2rem] tracking-tight mb-8">
            YOUR NEXT
            <br />
            <span className="text-gold">EXPERIENCE STARTS HERE.</span>
          </h1>

          <p className="text-lg text-smoke max-w-md mb-10 leading-relaxed">
            Concerts, comedy, festivals and parties — find it, book it, and get
            there. All in one place.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <a
              href="/events"
              className="group inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-7 py-4 rounded-full transition-all hover:gap-3"
            >
              Explore events
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/get-started"   // 👈 UPDATED LINK
              className="inline-flex items-center gap-2 border border-line hover:border-gold/60 bg-panel/60 text-bone font-bold px-6 py-4 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create event
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-smoke">
            {badges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
                <Icon className="w-3.5 h-3.5 text-gold" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* right: three bouncing event visuals, pulled from real events */}
        <div className="relative h-[420px] sm:h-[520px] lg:h-[560px]">
          <div className="absolute left-0 top-6 w-[44%] sm:w-[48%] animate-floatA">
            <div className="rounded-2xl overflow-hidden border border-line shadow-2xl shadow-black/60 rotate-[-4deg]">
              <img
                src={posters[0]?.cover_image || FALLBACK_IMAGE}
                alt={posters[0]?.title ?? "Upcoming event"}
                className="w-full h-64 sm:h-80 object-cover"
                loading="eager"
              />
              {posters[0] && (
                <div className="absolute bottom-3 left-3 right-3 bg-ink/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-line">
                  <p className="text-xs font-bold truncate">{posters[0].title}</p>
                  <p className="text-[11px] text-smoke">
                    {dateLabel(posters[0])} · {posters[0].city}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="absolute right-0 top-0 w-[46%] sm:w-[50%] animate-floatB">
            <div className="rounded-2xl overflow-hidden border border-line shadow-2xl shadow-black/60 rotate-[3deg]">
              <img
                src={posters[1]?.cover_image || FALLBACK_IMAGE}
                alt={posters[1]?.title ?? "Upcoming event"}
                className="w-full h-72 sm:h-96 object-cover"
                loading="eager"
              />
            </div>
          </div>

          <div className="absolute left-[18%] sm:left-[22%] bottom-0 w-[54%] sm:w-[56%] animate-floatC z-10">
            <div className="rounded-2xl overflow-hidden border border-gold/30 shadow-2xl shadow-black/70">
              <img
                src={posters[2]?.cover_image || FALLBACK_IMAGE}
                alt={posters[2]?.title ?? "Upcoming event"}
                className="w-full h-52 sm:h-64 object-cover"
                loading="eager"
              />
            </div>
          </div>

          <div className="absolute right-4 bottom-6 sm:right-6 sm:bottom-10 z-20 animate-floatC">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold flex flex-col items-center justify-center text-ink shadow-xl shadow-gold/20 border-4 border-ink">
              <span className="text-[10px] font-extrabold tracking-widest leading-none">LIVE</span>
              <span className="text-sm font-display tracking-wide leading-none mt-1">NOW</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-0 mt-16 lg:mt-24">
        <div className="flex items-center gap-3 bg-panel border border-line rounded-2xl px-5 py-4 shadow-xl shadow-black/40 focus-within:border-gold/60 transition-colors">
          <Search className="w-5 h-5 text-smoke shrink-0" />
          <input
            type="text"
            placeholder="Search events, artists, venues…"
            className="bg-transparent outline-none w-full text-bone placeholder:text-smoke/70 text-sm sm:text-base"
          />
          <button className="hidden sm:inline-flex bg-gold hover:bg-gold-bright text-ink text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shrink-0">
            Search
          </button>
        </div>
      </div>
    </section>
  );
}