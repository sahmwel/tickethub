// frontend/src/pages/Checkout.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Loader2, Wallet, CreditCard, LogIn } from "lucide-react";
import PaymentModal from "../components/PaymentModal";
import VerifiedBadge from "../components/VerifiedBadge";
import { fetchEventBySlug } from "../lib/queries";
import { getCountryConfig, formatMoney, formatEventDateTime } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../lib/apiClient";
import type { EventWithTicketTypes } from "../types";

interface CheckoutState {
  ticketTypeId?: string;
  quantity?: number;
  // For balance payment
  isBalancePayment?: boolean;
  orderRef?: string;          // payment_reference (string)
  amountDueNow?: number;
}

export default function Checkout() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const state = (location.state as CheckoutState | undefined) ?? {};

  // ─── Detect balance payment mode ────────────────────────────────
  const isBalancePayment = state.isBalancePayment === true;
  const balanceOrderRef = state.orderRef || "";
  const balanceAmount = state.amountDueNow || 0;

  const [event, setEvent] = useState<EventWithTicketTypes | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [holderNames, setHolderNames] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<"full" | "installment">("full");
  const [paid, setPaid] = useState<{ reference: string; provider: string } | null>(null);
  const [orderStatus, setOrderStatus] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderAmounts, setOrderAmounts] = useState<{
    amountTotal: number;
    amountDueNow: number;
    balanceAmount: number | null;
    subtotal: number;
    feeAmount: number;
  } | null>(null);
  const [orderRef, setOrderRef] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "gateway">("gateway");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [walletPaying, setWalletPaying] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Generate a reference for new orders
  const newOrderRef = useMemo(
    () => `SAHM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    []
  );

  // Prefill buyer info from profile
  useEffect(() => {
    if (profile) {
      setEmail((prev) => prev || profile.email || "");
      setName((prev) => prev || profile.full_name || "");
    }
  }, [profile]);

  // ─── Load event (always from slug) ──────────────────────────────
  useEffect(() => {
    if (!slug) {
      setEventError("No event specified");
      setEventLoading(false);
      return;
    }

    setEventLoading(true);
    setEventError(null);

    fetchEventBySlug(slug)
      .then((data) => {
        if (!data) throw new Error("Event not found");
        setEvent(data);
      })
      .catch((err) => {
        console.error("Error loading event:", err);
        setEventError(err instanceof Error ? err.message : "Failed to load event");
      })
      .finally(() => setEventLoading(false));
  }, [slug]);

  // ─── Determine ticket type (for new orders) ────────────────────
  const ticketType = event?.ticket_types?.find((t) => t.id === state.ticketTypeId) ?? event?.ticket_types?.[0];
  const quantity = state.quantity || 1;
  const formValid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && phone.trim().length >= 7;

  // ─── Check if installments available (for new orders) ──────────
  const hasInstallments = ticketType?.allow_installments && ticketType?.installment_plan !== null;

  // ─── Holder names for multiple tickets ─────────────────────────
  useEffect(() => {
    if (!isBalancePayment) {
      setHolderNames((prev) => {
        const next = Array.from({ length: quantity }, (_, i) => prev[i] ?? "");
        return next;
      });
    }
  }, [quantity, isBalancePayment]);

  // ─── Fetch wallet balance ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setWalletBalanceLoading(true);
    apiGet<{ balance: number }>("/api/wallet/balance")
      .then((data) => setWalletBalance(data.balance))
      .catch((err) => console.error("Error loading wallet balance:", err))
      .finally(() => setWalletBalanceLoading(false));
  }, [user]);

  // ─── Create order (only for new purchases) ──────────────────────
  useEffect(() => {
    if (isBalancePayment) {
      // For balance payment, we don't create a new order.
      // We use the existing order reference.
      setOrderId(null);
      setOrderRef(balanceOrderRef);
      setOrderAmounts({
        amountTotal: balanceAmount,
        amountDueNow: balanceAmount,
        balanceAmount: null,
        subtotal: balanceAmount,
        feeAmount: 0,
      });
      setOrderStatus("ready");
      return;
    }

    // Normal new order flow
    if (!formValid || !event || !ticketType || !user || orderStatus !== "idle") return;

    setOrderStatus("creating");
    const ref = newOrderRef;
    setOrderRef(ref);
    apiPost<{
      success: boolean;
      orderId: string;
      amountTotal: number;
      amountDueNow: number;
      balanceAmount: number | null;
      subtotal: number;
      feeAmount: number;
    }>("/api/orders", {
      eventId: event.id,
      ticketTypeId: ticketType.id,
      quantity: quantity,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      orderRef: ref,
      holderNames: quantity > 1 ? holderNames.map((n) => n.trim() || name) : undefined,
      paymentPlan,
    })
      .then((data) => {
        setOrderId(data.orderId);
        setOrderAmounts({
          amountTotal: data.amountTotal,
          amountDueNow: data.amountDueNow,
          balanceAmount: data.balanceAmount ?? null,
          subtotal: data.subtotal,
          feeAmount: data.feeAmount,
        });
        setOrderStatus("ready");
      })
      .catch((e) => {
        console.error("Order creation error:", e);
        setOrderError(e instanceof Error ? e.message : "Could not start checkout.");
        setOrderStatus("error");
      });
  }, [formValid, user, event, ticketType, quantity, name, email, phone, orderStatus, paymentPlan, holderNames, isBalancePayment, balanceOrderRef, balanceAmount, newOrderRef]);

  // ─── Wallet payment handler ────────────────────────────────────
  const handleWalletPay = async () => {
    if (!user || !orderRef || !orderAmounts) return;

    setWalletPaying(true);
    setWalletError(null);

    try {
      // Use orderRef (payment_reference) as the primary identifier.
      // The backend will look up the order by this string.
      await apiPost<{ success: boolean }>("/api/wallet/pay", {
        amount: orderAmounts.amountDueNow,
        orderRef: orderRef,              // always send the payment reference
        orderId: orderId,                // optionally send numeric id (if available)
        description: `Ticket purchase — ${event?.title ?? ""}`,
      });

      setPaid({ reference: orderRef, provider: "wallet" });
      navigate("/bag", {
        state: { reference: orderRef, provider: "wallet", orderRef, eventId: event?.id },
      });
    } catch (err) {
      console.error("Wallet payment error:", err);
      setWalletError(err instanceof Error ? err.message : "Wallet payment failed.");
    } finally {
      setWalletPaying(false);
    }
  };

  const handlePaymentVerified = useCallback(
    ({ reference, provider }: { reference: string; provider: string }) => {
      console.log("✅ Payment verified via callback in Checkout:", { reference, provider });
      setPaid({ reference, provider });
    },
    []
  );

  // ─── Fallback navigation ──────────────────────────────────────
  useEffect(() => {
    if (paid && !window.location.pathname.includes("/bag")) {
      const timer = setTimeout(() => {
        console.log("🔄 Fallback navigation to /bag");
        navigate("/bag", {
          state: {
            reference: paid.reference,
            provider: paid.provider,
            orderRef,
            eventId: event?.id,
          },
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paid, navigate, orderRef, event]);

  // ─── Render guards ──────────────────────────────────────────────
  if (authLoading || eventLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading checkout…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <LogIn className="w-10 h-10 text-gold mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-3">Log in to buy a ticket</h1>
        <p className="text-smoke mb-8">
          You'll need an account so we can confirm your order, issue your ticket, and let you pay from your wallet
          if you'd like.
        </p>
        <button
          onClick={() =>
            navigate("/login", {
              state: { redirectTo: location.pathname, checkoutState: state },
            })
          }
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-full transition-colors"
        >
          Log in to continue
        </button>
      </div>
    );
  }

  if (eventError) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl mb-4 text-red-400">Oops!</h1>
        <p className="text-smoke mb-6">{eventError}</p>
        <Link to="/events" className="text-gold font-semibold">
          Browse events →
        </Link>
      </div>
    );
  }

  // ─── If no event and not balance payment ───────────────────────
  if (!event && !isBalancePayment) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl mb-4">Nothing to check out</h1>
        <Link to="/events" className="text-gold font-semibold">
          Browse events →
        </Link>
      </div>
    );
  }

  // ─── Compute amounts ────────────────────────────────────────────
  const countryConfig = getCountryConfig(event?.country || "Nigeria");
  const currency = event?.currency || countryConfig.currency;
  const eventDateLabel = event
    ? formatEventDateTime(event.start_at, event.timezone ?? countryConfig.timezone, {
        weekday: undefined,
        year: undefined,
      })
    : "";

  const amountDueNow = orderAmounts?.amountDueNow ?? (isBalancePayment ? balanceAmount : 0);
  const feeAmount = orderAmounts?.feeAmount ?? 0;
  const balanceAmountRemaining = orderAmounts?.balanceAmount ?? null;

  const walletCanCover = walletBalance != null && walletBalance >= amountDueNow;

  const downPaymentPercent = 50;
  const downPayment = (ticketType?.price || 0) * downPaymentPercent / 100;
  const balanceDue = (ticketType?.price || 0) * (100 - downPaymentPercent) / 100;

  // ─── If payment completed ──────────────────────────────────────
  if (paid) {
    return (
      <div className="max-w-lg mx-auto px-6 pt-40 pb-24 text-center">
        <CheckCircle2 className="w-16 h-16 text-gold mx-auto mb-6" />
        <h1 className="font-display text-4xl tracking-wide mb-4">
          {isBalancePayment ? "Balance paid! 🎉" : paymentPlan === "installment" ? "Deposit received. 🎉" : "You're in. 🎉"}
        </h1>
        <p className="text-smoke mb-2">
          {isBalancePayment ? (
            <>
              Your remaining balance for <strong className="text-bone">{event?.title || "the event"}</strong> has been paid.
            </>
          ) : paymentPlan === "installment" ? (
            <>
              Your 50% deposit for <strong className="text-bone">{event?.title}</strong> is confirmed.
              The remaining 50% is due <strong className="text-yellow-400">24 hours before the event</strong>.
            </>
          ) : (
            <>
              Your ticket{quantity > 1 ? "s" : ""} for <strong className="text-bone">{event?.title}</strong>{" "}
              {quantity > 1 ? "have" : "has"} been confirmed.
            </>
          )}
        </p>
        <p className="text-xs text-smoke mb-8">
          Reference {paid.reference}
          {!isBalancePayment && paymentPlan === "installment" && balanceAmountRemaining
            ? ` · Balance of ${formatMoney(balanceAmountRemaining, currency)} due 24 hours before the event.`
            : ` · A confirmation email with your QR ticket${quantity > 1 ? "s" : ""} is on its way to ${email}.`}
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-full transition-colors"
        >
          Explore more events
        </Link>
      </div>
    );
  }

  // ─── Main checkout UI ──────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-24 grid lg:grid-cols-5 gap-10">
      <div className="lg:col-span-3">
        {event && (
          <Link
            to={`/events/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to event
          </Link>
        )}

        <h1 className="font-display text-4xl tracking-wide mb-8">
          {isBalancePayment ? "Pay remaining balance" : "Checkout"}
        </h1>

        {/* Only show details form for new orders */}
        {!isBalancePayment && (
          <>
            <div className="bg-panel border border-line rounded-2xl p-6 space-y-4 mb-6">
              <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-2">
                Your details
              </h2>
              <div>
                <label className="text-xs text-smoke mb-1.5 block">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  placeholder="e.g. Amaka Johnson"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-smoke mb-1.5 block">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@email.com"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-smoke mb-1.5 block">Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="080 000 0000"
                  className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            {quantity > 1 && (
              <div className="bg-panel border border-line rounded-2xl p-6 space-y-3 mb-6">
                <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-1">
                  Who's each ticket for?
                </h2>
                <p className="text-xs text-smoke mb-3">Leave blank to use your own name.</p>
                {Array.from({ length: quantity }).map((_, i) => (
                  <input
                    key={i}
                    value={holderNames[i] ?? ""}
                    onChange={(e) =>
                      setHolderNames((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder={i === 0 ? `Ticket 1 holder name (default: ${name || "you"})` : `Ticket ${i + 1} holder name`}
                    className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
                  />
                ))}
              </div>
            )}

            {hasInstallments && (
              <div className="bg-panel border border-line rounded-2xl p-6 space-y-3 mb-6">
                <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-1">Payment plan</h2>
                <p className="text-xs text-smoke mb-3">
                  {paymentPlan === "installment" ? (
                    <span className="text-yellow-400">
                      ⚠️ Remaining 50% must be paid at least <strong>24 hours before the event</strong>. If not paid in time,
                      the deposit will be refunded to your wallet <strong>48 hours after the event ends</strong>.
                    </span>
                  ) : (
                    <span>Pay in full and receive your tickets immediately.</span>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("full")}
                    className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                      paymentPlan === "full" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                    }`}
                  >
                    <p className="text-sm font-bold">Pay in full</p>
                    <p className="text-xs text-smoke mt-0.5">One payment, tickets issued immediately.</p>
                    <p className="text-xs text-gold font-semibold mt-1">{formatMoney(ticketType?.price * quantity || 0, currency)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("installment")}
                    className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                      paymentPlan === "installment" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                    }`}
                  >
                    <p className="text-sm font-bold">Pay 50% now, 50% later</p>
                    <p className="text-xs text-smoke mt-0.5">50% upfront, 50% due <strong>24 hours before event</strong></p>
                    <p className="text-xs text-gold font-semibold mt-1">
                      {formatMoney(downPayment * quantity, currency)} now · {formatMoney(balanceDue * quantity, currency)} later
                    </p>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Payment method selection */}
        {orderStatus === "ready" && (
          <div className="bg-panel border border-line rounded-2xl p-6 space-y-3 mb-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-1">How would you like to pay?</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => walletCanCover && setPaymentMethod("wallet")}
                disabled={!walletCanCover}
                className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                  paymentMethod === "wallet" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                } ${!walletCanCover ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Wallet
                </p>
                <p className="text-xs text-smoke mt-0.5">
                  {walletBalanceLoading
                    ? "Checking balance…"
                    : walletBalance != null
                    ? `Balance: ${formatMoney(walletBalance, currency)}`
                    : "Balance unavailable"}
                </p>
                {!walletCanCover && walletBalance != null && (
                  <p className="text-[10px] text-yellow-500/80 mt-1">Not enough balance for this order.</p>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("gateway")}
                className={`flex-1 text-left rounded-xl border px-4 py-3 transition-colors ${
                  paymentMethod === "gateway" ? "border-gold bg-gold/10" : "border-line hover:border-gold/40"
                }`}
              >
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Card / {countryConfig.provider === "paystack" ? "Paystack" : "Flutterwave"}
                </p>
                <p className="text-xs text-smoke mt-0.5">Pay with card, bank transfer, or USSD.</p>
              </button>
            </div>
          </div>
        )}

        {orderStatus === "ready" && event && event.id && orderAmounts && paymentMethod === "gateway" && (
          <PaymentModal
            amountNaira={amountDueNow}
            email={email}
            name={name}
            phone={phone}
            eventId={event.id}
            orderRef={orderRef}
            provider={countryConfig.provider}
            onVerified={handlePaymentVerified}
          />
        )}

        {orderStatus === "ready" && paymentMethod === "wallet" && (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleWalletPay}
              disabled={walletPaying || !walletCanCover}
              className="w-full bg-gold hover:bg-gold-bright text-ink font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {walletPaying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing…
                </>
              ) : (
                `Pay ${formatMoney(amountDueNow, currency)} from wallet`
              )}
            </button>
            {walletError && (
              <div className="text-sm text-red-400 text-center p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
                {walletError}
              </div>
            )}
          </div>
        )}

        {orderStatus === "creating" && (
          <p className="flex items-center justify-center gap-2 text-sm text-smoke py-4 border border-dashed border-line rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing your order…
          </p>
        )}

        {orderStatus === "error" && (
          <p className="text-sm text-red-400 text-center py-4 border border-dashed border-red-400/40 rounded-xl">
            {orderError}
          </p>
        )}

        {orderStatus === "idle" && !isBalancePayment && (
          <p className="text-sm text-smoke text-center py-4 border border-dashed border-line rounded-xl">
            Fill in your details above to unlock payment.
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="bg-panel border border-line rounded-2xl p-6 sticky top-28">
          <h2 className="font-display text-xl tracking-wide mb-5">Order summary</h2>
          <div className="flex gap-3 mb-5">
            <img
              src={event?.cover_image || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=400&auto=format&fit=crop"}
              alt={event?.title || "Event"}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5">
                {event?.title || (isBalancePayment ? "Event" : "Loading...")}
                {event?.is_verified && <VerifiedBadge />}
              </p>
              <p className="text-xs text-smoke">
                {eventDateLabel || "Event details"} {event?.venue_name ? `· ${event.venue_name}, ${event.city}` : ""}
              </p>
            </div>
          </div>

          {!isBalancePayment && ticketType && (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-smoke">
                  {ticketType.name} × {quantity}
                </span>
                <span className="font-semibold">{formatMoney(ticketType.price * quantity, currency)}</span>
              </div>
              {feeAmount > 0 && (
                <div className="flex items-center justify-between text-sm mb-2 text-smoke">
                  <span>Platform fee</span>
                  <span>{formatMoney(feeAmount, currency)}</span>
                </div>
              )}
            </>
          )}

          {isBalancePayment && (
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-smoke">Remaining balance</span>
              <span className="font-semibold">{formatMoney(balanceAmount, currency)}</span>
            </div>
          )}

          {paymentPlan === "installment" && hasInstallments && !isBalancePayment && (
            <div className="mt-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between text-xs text-smoke mb-1">
                <span>Due now (50%)</span>
                <span className="text-gold font-semibold">{formatMoney(downPayment * quantity, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-smoke">
                <span>Due 24 hours before event</span>
                <span>{formatMoney(balanceDue * quantity, currency)}</span>
              </div>
              <div className="mt-2 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <p className="text-[10px] text-yellow-500/70 flex items-start gap-1.5">
                  <span>⚠️</span>
                  <span>
                    If the remaining balance isn't paid <strong>24 hours before the event</strong>, your ticket is released and your
                    deposit is refunded to your wallet <strong>48 hours after the event ends</strong>.
                  </span>
                </p>
              </div>
            </div>
          )}

          {!isBalancePayment && paymentPlan === "installment" && balanceAmountRemaining != null && hasInstallments ? (
            <>
              <div className="flex items-center justify-between pt-4 border-t border-line">
                <span className="font-bold">Due now</span>
                <span className="font-display text-2xl text-gold">{formatMoney(amountDueNow, currency)}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-smoke">
                <span>Balance due 24 hours before event</span>
                <span>{formatMoney(balanceAmountRemaining, currency)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl text-gold">{formatMoney(amountDueNow, currency)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}