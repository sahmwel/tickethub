// pages/ManageTicket.tsx

import { useState } from "react";
import { Loader2, MapPin, Calendar } from "lucide-react";
import TicketStub from "../components/TicketStub";
import TransferModal from "../components/TransferModal";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

interface TicketRecord {
  id: string;
  code: string;
  holder_name: string;
  checked_in: boolean;
  transferred_at?: string | null;
  transferred_to_name?: string | null;
}

interface OrderRecord {
  id: string;
  payment_reference: string;
  buyer_email: string;
  status: string;
  events?: {
    title: string;
    start_at: string;
    venue_name: string;
    city?: string;
  };
  tickets?: TicketRecord[];
}

function formatEventDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

export default function ManageTicket() {
  const [step, setStep] = useState<"email" | "code" | "results">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null);

  const requestCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/lookup/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to send code");
      setMaskedEmail(data.maskedEmail);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/lookup/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Invalid or expired code");
      setOrders(data.orders ?? []);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // Find the ticket + its parent order for whichever ticket is being transferred.
  let transferringTicket: TicketRecord | undefined;
  for (const order of orders) {
    const found = order.tickets?.find((t) => t.id === transferTicketId && !t.transferred_at);
    if (found) {
      transferringTicket = found;
      break;
    }
  }

  const updateTicketInState = (ticketId: string, newName: string, transferredAt: string) => {
    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        tickets: order.tickets?.map((t) =>
          t.id === ticketId ? { ...t, transferred_at: transferredAt, transferred_to_name: newName } : t
        ),
      }))
    );
  };

  return (
    <div className="max-w-lg mx-auto px-6 pb-24">
      <div className="text-center mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Manage tickets</p>
        <h1 className="font-display text-4xl tracking-wide mb-2">Your tickets</h1>
        <p className="text-smoke text-sm">
          {step === "results"
            ? "All tickets bought with this email."
            : "Verify your email to see and manage every ticket you've bought."}
        </p>
      </div>

      {step === "email" && (
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && requestCode()}
            type="email"
            placeholder="you@email.com"
            className="w-full bg-panel border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
          />
          <button
            onClick={requestCode}
            disabled={loading || !email.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send verification code"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div className="space-y-3">
          <p className="text-sm text-smoke text-center mb-2">Code sent to {maskedEmail}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            placeholder="6-digit code"
            maxLength={6}
            className="w-full bg-panel border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 text-center font-mono tracking-widest"
          />
          <button
            onClick={verifyCode}
            disabled={loading || !code.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </button>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
            }}
            className="w-full text-xs text-smoke hover:text-bone"
          >
            Use a different email
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center mt-4 border border-dashed border-red-400/30 rounded-xl p-4">
          {error}
        </p>
      )}

      {step === "results" && (
        <>
          {orders.length === 0 ? (
            <p className="text-sm text-smoke text-center mt-8">No paid tickets found for this email.</p>
          ) : (
            <div className="space-y-8 mt-8">
              {orders.map((order) => (
                <div key={order.id}>
                  {order.events && (
                    <div className="mb-3">
                      <p className="font-display text-lg text-bone">{order.events.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-smoke">
                          <Calendar className="w-3.5 h-3.5 text-gold" />
                          {formatEventDate(order.events.start_at)}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-smoke">
                          <MapPin className="w-3.5 h-3.5 text-gold" />
                          {order.events.venue_name}
                          {order.events.city ? `, ${order.events.city}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-smoke/60 mt-1">{order.payment_reference}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(order.tickets ?? []).map((t, i) => (
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
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {transferringTicket && (
        <TransferModal
          ticketId={transferringTicket.id}
          currentHolder={transferringTicket.holder_name}
          onClose={() => setTransferTicketId(null)}
          onSuccess={(newName, transferredAt) => {
            updateTicketInState(transferringTicket!.id, newName, transferredAt);
            setTransferTicketId(null);
          }}
        />
      )}
    </div>
  );
}
