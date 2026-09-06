// pages/Bag.tsx
import { useEffect, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { Loader2, MapPin, Calendar, Copy, Check, CalendarPlus } from "lucide-react";
import TicketStub from "../components/TicketStub";
import TransferModal from "../components/TransferModal";
import { formatEventDateTime } from "../lib/constants";
import { apiGet } from "../lib/apiClient";

interface BagState {
  reference: string;
  provider: string;
  orderRef: string;
  eventId: string;
}

interface OrderDetails {
  id: string;
  buyer_name: string;
  buyer_email: string;
  amount_total: number;
  status: string;
  payment_reference: string;
  events?: {
    title: string;
    start_at: string;
    end_at?: string;
    venue_name: string;
    city?: string;
    address?: string;
    timezone?: string;
  };
  tickets?: {
    id: string;
    code: string;
    holder_name: string;
    checked_in: boolean;
    transferred_at?: string | null;
    transferred_to_name?: string | null;
  }[];
}

function formatEventDate(iso?: string, timezone?: string) {
  if (!iso) return "";
  const tz = timezone || "Africa/Lagos";
  return formatEventDateTime(iso, tz, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@sahmtickethub.online`;
}

function downloadICS(event: NonNullable<OrderDetails["events"]>) {
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const location = [event.venue_name, event.address, event.city].filter(Boolean).join(", ");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sahm TicketHub//EN",
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyableRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-smoke hover:text-gold transition-colors"
      title="Copy reference"
    >
      {value}
      {copied ? <Check className="w-3 h-3 text-gold" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function Bag() {
  const location = useLocation();
  const state = location.state as BagState | undefined;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.orderRef) return;

    setLoading(true);
    apiGet<{ success: boolean; order: OrderDetails }>(`/api/orders/${state.orderRef}`)
      .then((data) => {
        if (!data.success || !data.order) throw new Error("Order not found");
        setOrder(data.order);
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        setFetchError(err instanceof Error ? err.message : "Could not load order details");
      })
      .finally(() => setLoading(false));
  }, [state?.orderRef]);

  if (!state?.reference || !state?.orderRef) {
    return <Navigate to="/events" replace />;
  }

  const ticketCount = order?.tickets?.length ?? 0;
  const transferringTicket = order?.tickets?.find((t) => t.id === transferTicketId && !t.transferred_at);
  const eventTimezone = order?.events?.timezone || "Africa/Lagos";
  const formattedDate = order?.events?.start_at
    ? formatEventDate(order.events.start_at, eventTimezone)
    : "";

  return (
    <div className="max-w-lg mx-auto px-6 pb-24">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold text-ink text-xl font-bold mb-5">
          ✓
        </div>
        <h1 className="font-display text-4xl tracking-wide mb-2">You're going.</h1>
        <p className="text-smoke text-sm">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading your order…
            </span>
          ) : order?.events ? (
            <>
              Confirmed for <span className="text-bone font-semibold">{order.events.title}</span>
            </>
          ) : (
            "Your payment has been confirmed."
          )}
        </p>
      </div>

      {order?.events && (
        <div className="bg-panel border border-line rounded-2xl p-5 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-bone">{formattedDate}</p>
              {eventTimezone && (
                <p className="text-[10px] text-smoke/60 mt-0.5">
                  {eventTimezone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
            <p className="text-sm text-bone">
              {order.events.venue_name}
              {order.events.city ? `, ${order.events.city}` : ""}
            </p>
          </div>
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <span className="text-xs text-smoke">Order reference</span>
            <CopyableRef value={order.payment_reference ?? state.orderRef} />
          </div>
        </div>
      )}

      {order?.events && (
        <button
          onClick={() => downloadICS(order.events!)}
          className="w-full flex items-center justify-center gap-2 border border-line hover:border-gold/50 text-bone text-sm font-semibold py-3 rounded-xl mb-8 transition-colors"
        >
          <CalendarPlus className="w-4 h-4 text-gold" />
          Add to calendar
        </button>
      )}

      <p className="text-xs text-smoke text-center mb-8">
        A confirmation email with {ticketCount > 1 ? "these tickets" : "this ticket"} is on its way
        {order?.buyer_email ? ` to ${order.buyer_email}` : ""}.
      </p>

      {fetchError && (
        <p className="text-xs text-red-400 text-center mb-8">
          We couldn't load your full order summary here, but don't worry — your ticket confirmation email is still on its way.
        </p>
      )}

      {!loading && order?.tickets && order.tickets.length > 0 && (
        <div className="space-y-4 mb-10">
          {order.tickets.map((t, i) => (
            <TicketStub
              key={t.id}
              code={t.code}
              holderName={t.holder_name}
              checkedIn={t.checked_in}
              transferredAt={t.transferred_at}
              transferredToName={t.transferred_to_name}
              index={i}
              total={order.tickets!.length}
              onTransferClick={() => setTransferTicketId(t.id)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-full transition-colors"
        >
          Explore more events
        </Link>
      </div>

      {transferringTicket && (
        <TransferModal
          ticketId={transferringTicket.id}
          currentHolder={transferringTicket.holder_name}
          onClose={() => setTransferTicketId(null)}
          onSuccess={(newName, transferredAt) => {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    tickets: prev.tickets?.map((t) =>
                      t.id === transferringTicket.id
                        ? { ...t, transferred_at: transferredAt, transferred_to_name: newName }
                        : t
                    ),
                  }
                : prev
            );
            setTransferTicketId(null);
          }}
        />
      )}
    </div>
  );
}