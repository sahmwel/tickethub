import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Minus,
  Plus,
  ArrowRight,
  Mic2,
  Mail,
  Phone,
  Images,
  Loader2,
  ChevronRight,
  Home,
  Bell,
  CreditCard,
} from "lucide-react";
import RideButtons from "../components/RideButtons";
import VerifiedBadge from "../components/VerifiedBadge";
import WaitlistForm from "../pages/WaitlistForm";
import { fetchEventBySlug } from "../lib/queries";
import { formatMoney, getCountryConfig } from "../lib/constants";
import type { EventWithTicketTypes, TicketType } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function getImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "";
  if (url.startsWith("/uploads/")) {
    return `${API_BASE}${url}`;
  }
  return url;
}

function getPastGallery(event: EventWithTicketTypes): string[] {
  if (!event.past_gallery) return [];
  if (Array.isArray(event.past_gallery)) return event.past_gallery;
  try {
    const parsed = JSON.parse(event.past_gallery);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const getFallbackImage = (category: string) => {
  const fallbacks: Record<string, string> = {
    "Concerts & Live Music": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=600&fit=crop",
    "Festivals": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&h=600&fit=crop",
    "Parties & Nightlife": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop",
    "Rave / EDM Parties": "https://images.unsplash.com/photo-1571266028243-e4733b0f0a1c?w=1200&h=600&fit=crop",
    "House Party": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop",
    "Networking Events": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=600&fit=crop",
    "Workshop & Classes": "https://images.unsplash.com/photo-1544531585-f9840e1a8bc0?w=1200&h=600&fit=crop",
    "Conference & Seminars": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
    "Sports Events": "https://images.unsplash.com/photo-1461896836934-bead69c5d3e0?w=1200&h=600&fit=crop",
    "Theatre & Performing Arts": "https://images.unsplash.com/photo-1507676184212-d6ab0d2e5f68?w=1200&h=600&fit=crop",
    "Birthday Parties": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&h=600&fit=crop",
    "Weddings & Engagements": "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=600&fit=crop",
    "Corporate Events": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop",
    "Charity & Fundraisers": "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&h=600&fit=crop",
    "Food & Drink Tastings": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=600&fit=crop",
    "Beach Party": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=600&fit=crop",
    "Pool Party": "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=1200&h=600&fit=crop",
    "Themed Costume Party": "https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200&h=600&fit=crop",
    "Karaoke Night": "https://images.unsplash.com/photo-1516282398626-3b65d4049e78?w=1200&h=600&fit=crop",
    "Halloween Party": "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1200&h=600&fit=crop",
    "Christmas Party": "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=1200&h=600&fit=crop",
    "New Year's Eve Party": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200&h=600&fit=crop",
  };
  return fallbacks[category] || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop";
};

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventWithTicketTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketTypeId, setTicketTypeId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchEventBySlug(slug)
      .then((data) => {
        setEvent(data);
        const firstAvailable = data?.ticket_types?.find((t) => t.quantity_total - t.quantity_sold > 0);
        if (firstAvailable) setTicketTypeId(firstAvailable.id);
        else if (data?.ticket_types?.length) setTicketTypeId(data.ticket_types[0].id);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading event…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-40 pb-24 text-center">
        <h1 className="font-display text-4xl mb-4">Event not found</h1>
        <p className="text-smoke mb-8">This event may have sold out or been removed.</p>
        <Link to="/events" className="text-gold font-semibold">
          Browse all events →
        </Link>
      </div>
    );
  }

  const selectedType = event.ticket_types.find((t) => t.id === ticketTypeId) ?? event.ticket_types[0];
  const total = selectedType ? selectedType.price * quantity : 0;
  const remaining = selectedType ? selectedType.quantity_total - selectedType.quantity_sold : 0;

  const timezone = event.timezone || "Africa/Lagos";
  const countryConfig = getCountryConfig(event.country || "Nigeria");
  const currency = event.currency || countryConfig.currency;

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

  function formatLocalFull(dateStr: string): string {
    const { date, time } = parseDateTime(dateStr);
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `${dateFormatted} at ${time}`;
  }

  const dateLabel = event.start_at ? formatLocalDate(event.start_at) : '';
  const timeLabel = event.start_at ? formatLocalTime(event.start_at) : '';
  const fullDateLabel = event.start_at ? formatLocalFull(event.start_at) : '';
  const endTimeLabel = event.end_at ? formatLocalTime(event.end_at) : null;

  const hasInstallments = (ticketType: TicketType) => {
    if (!ticketType.allow_installments || ticketType.installment_plan === null) return false;
    const plan = ticketType.installment_plan;
    if (typeof plan === 'object' && Object.keys(plan).length === 0) return false;
    return true;
  };

  const parseInstallmentPlan = (plan: any): any => {
    if (!plan) return null;
    if (typeof plan === 'string') {
      try {
        return JSON.parse(plan);
      } catch {
        return null;
      }
    }
    return plan;
  };

  const isMonthlyPlan = (plan: any) => {
    const parsed = parseInstallmentPlan(plan);
    return parsed && parsed.months && parsed.months > 0 && parsed.monthly_payment;
  };

  const getInstallmentDisplay = (ticketType: TicketType) => {
    if (!hasInstallments(ticketType)) return null;
    let plan = parseInstallmentPlan(ticketType.installment_plan);
    if (!plan) return "Installments available";

    const downPaymentAmount = (ticketType.price * plan.down_payment_percent) / 100;

    if (isMonthlyPlan(plan)) {
      return `${plan.down_payment_percent}% down (${formatMoney(downPaymentAmount, currency)}) · ${plan.months} months · ${formatMoney(plan.monthly_payment, currency)}/mo`;
    } else {
      const balanceAmount = ticketType.price - downPaymentAmount;
      return `${plan.down_payment_percent}% now (${formatMoney(downPaymentAmount, currency)}) · balance due 24 hours before event (${formatMoney(balanceAmount, currency)})`;
    }
  };

  const getInstallmentSummary = (ticketType: TicketType) => {
    if (!hasInstallments(ticketType)) return null;
    let plan = parseInstallmentPlan(ticketType.installment_plan);
    if (!plan) return null;

    const downPaymentAmount = (ticketType.price * plan.down_payment_percent) / 100;

    if (isMonthlyPlan(plan)) {
      return `or ${formatMoney(downPaymentAmount, currency)} down + ${formatMoney(plan.monthly_payment, currency)}/mo`;
    } else {
      return `or ${formatMoney(downPaymentAmount, currency)} now + balance later`;
    }
  };

  function goToCheckout() {
    if (!selectedType) return;
    navigate(`/checkout/${event!.slug}`, { state: { ticketTypeId: selectedType.id, quantity } });
  }

  function openMailto() {
    if (event?.contact_email) window.location.href = "mailto:" + event.contact_email;
  }

  function openTel() {
    if (event?.contact_phone) window.location.href = "tel:" + event.contact_phone;
  }

  const mapSrc =
    event.latitude != null && event.longitude != null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01}%2C${
          event.latitude - 0.01
        }%2C${event.longitude + 0.01}%2C${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude}%2C${event.longitude}`
      : null;

  const coverImageUrl = getImageUrl(event.cover_image) || getFallbackImage(event.category);
  const pastGallery = getPastGallery(event);

  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4">
        <nav className="flex items-center gap-2 text-sm text-smoke">
          <Link to="/" className="flex items-center gap-1.5 hover:text-gold transition-colors">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-smoke/40" />
          <Link to="/events" className="hover:text-gold transition-colors">
            Events
          </Link>
          <ChevronRight className="w-4 h-4 text-smoke/40" />
          <span className="text-bone font-medium truncate max-w-[200px] sm:max-w-[400px]">{event.title}</span>
        </nav>
      </div>

      <div className="relative h-[380px] sm:h-[460px] overflow-hidden bg-ink">
        <img
          src={coverImageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <span className="absolute top-4 left-4 bg-ink/80 backdrop-blur-sm text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-line text-gold">
          {event.category}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-24 relative z-10 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="font-display text-5xl sm:text-6xl tracking-wide">{event.title}</h1>
              {event.is_verified && <VerifiedBadge size="md" className="mt-3 shrink-0" />}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-smoke mb-2">
              <span className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-4 h-4 text-gold" />
                {dateLabel} · {timeLabel}
                {endTimeLabel && ` — ${endTimeLabel}`}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <MapPin className="w-4 h-4 text-gold" />
                {event.venue_name}, {event.city}
              </span>
            </div>
            <p className="text-xs text-smoke/60 mt-1">
              {fullDateLabel} ({timezone})
            </p>
          </div>

          {event.guest_artiste && (
            <div className="bg-panel border border-line rounded-2xl p-6">
              <div className="flex items-center gap-4">
                {event.guest_artiste_image ? (
                  <img
                    src={getImageUrl(event.guest_artiste_image)}
                    alt={event.guest_artiste}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gold"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        event.guest_artiste || "Guest"
                      )}&background=F2B33D&color=0A0A0C&size=80&font-size=0.5`;
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-2xl font-bold text-gold shrink-0">
                    {event.guest_artiste
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-xs text-smoke font-semibold uppercase tracking-widest">Guest artiste</p>
                  <h2 className="font-display text-3xl tracking-wide flex items-center gap-2">
                    <Mic2 className="w-5 h-5 text-gold" />
                    {event.guest_artiste}
                  </h2>
                </div>
              </div>
            </div>
          )}

          <div className="bg-panel border border-line rounded-2xl p-6">
            <h2 className="font-display text-2xl tracking-wide mb-3">About this event</h2>
            <p className="text-smoke leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {pastGallery.length > 0 && (
            <div className="bg-panel border border-line rounded-2xl p-6">
              <h2 className="flex items-center gap-2 font-display text-2xl tracking-wide mb-4">
                <Images className="w-5 h-5 text-gold" />
                From past editions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pastGallery.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-ink">
                    <img
                      src={getImageUrl(src)}
                      alt={`${event.title} — past edition ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(event.contact_email || event.contact_phone) && (
            <div className="bg-panel border border-line rounded-2xl p-6">
              <h2 className="font-display text-2xl tracking-wide mb-4">Contact the organizer</h2>
              <div className="flex flex-wrap gap-4 text-sm">
                {event.contact_email && (
                  <button
                    type="button"
                    onClick={openMailto}
                    className="flex items-center gap-2 text-smoke hover:text-gold transition-colors"
                  >
                    <Mail className="w-4 h-4 text-gold" />
                    {event.contact_email}
                  </button>
                )}
                {event.contact_phone && (
                  <button
                    type="button"
                    onClick={openTel}
                    className="flex items-center gap-2 text-smoke hover:text-gold transition-colors"
                  >
                    <Phone className="w-4 h-4 text-gold" />
                    {event.contact_phone}
                  </button>
                )}
              </div>
            </div>
          )}

          {mapSrc && (
            <div className="bg-panel border border-line rounded-2xl p-6">
              <h2 className="font-display text-2xl tracking-wide mb-4">Venue &amp; getting there</h2>
              <p className="text-sm text-smoke mb-4">{event.address}</p>
              <div className="rounded-xl overflow-hidden border border-line mb-5 h-64">
                <iframe
                  title="Event location map"
                  src={mapSrc}
                  className="w-full h-full grayscale contrast-125"
                  loading="lazy"
                />
              </div>
              <RideButtons venueName={event.venue_name} latitude={event.latitude} longitude={event.longitude} />
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-panel border border-line rounded-2xl p-6">
            <h3 className="font-display text-2xl tracking-wide mb-5">Get tickets</h3>

            {event.ticket_types.length === 0 ? (
              <p className="text-sm text-smoke">Ticket sales haven't opened for this event yet.</p>
            ) : (
              <>
                <div className="space-y-2 mb-5">
                  {event.ticket_types.map((t) => {
                    const ticketRemaining = t.quantity_total - t.quantity_sold;
                    const soldOut = ticketRemaining <= 0;
                    const installmentSummary = getInstallmentSummary(t);

                    if (soldOut) {
                      return (
                        <div key={t.id} className="rounded-xl border border-line px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-sm">{t.name}</p>
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <Bell className="w-3 h-3" />
                              Sold out
                            </span>
                          </div>
                          <WaitlistForm ticketTypeId={t.id} />
                        </div>
                      );
                    }

                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTicketTypeId(t.id);
                          setQuantity(1);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                          ticketTypeId === t.id ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="font-bold text-sm truncate">{t.name}</p>
                            {hasInstallments(t) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full shrink-0">
                                <CreditCard className="w-2.5 h-2.5" />
                                Installments
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-smoke">
                            {ticketRemaining} {ticketRemaining === 1 ? "ticket" : "tickets"} left
                          </p>
                          {installmentSummary && (
                            <p className="text-[10px] text-gold/70 mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-gold" />
                              {installmentSummary}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-bold text-gold">{formatMoney(t.price, currency)}</p>
                          {hasInstallments(t) && t.installment_plan && !isMonthlyPlan(t.installment_plan) && (
                            <p className="text-[10px] text-smoke/60">
                              50% now · 50% due 24h before event
                            </p>
                          )}
                          {hasInstallments(t) && t.installment_plan && isMonthlyPlan(t.installment_plan) && (
                            <p className="text-[10px] text-smoke/60">
                              or {formatMoney(parseInstallmentPlan(t.installment_plan)?.monthly_payment || 0, currency)}/mo
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedType && remaining > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm font-semibold text-smoke">Quantity</span>
                      <div className="flex items-center gap-3 bg-ink border border-line rounded-full px-2 py-1.5">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-panel2 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-panel2 transition-colors"
                          aria-label="Increase quantity"
                          disabled={quantity >= remaining}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6 pt-4 border-t border-line">
                      <span className="text-sm font-semibold text-smoke">Total</span>
                      <span className="font-display text-2xl text-gold">{formatMoney(total, currency)}</span>
                    </div>

                    {hasInstallments(selectedType) && selectedType.installment_plan && (
                      <div className="text-xs text-smoke/70 mb-4 text-center bg-ink/30 rounded-lg p-2">
                        <span className="font-medium text-gold">Installment plan:</span>{' '}
                        {getInstallmentDisplay(selectedType)}
                      </div>
                    )}

                    <button
                      onClick={goToCheckout}
                      className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold py-4 rounded-xl transition-colors"
                    >
                      Continue to checkout
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {remaining <= 10 && (
                      <p className="text-xs text-yellow-500/70 text-center mt-3">
                        Only {remaining} {remaining === 1 ? "ticket" : "tickets"} left — hurry!
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}