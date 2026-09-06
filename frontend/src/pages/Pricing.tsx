import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    fee: "5%",
    description: "Per ticket sold — no monthly cost, pay only when you sell.",
    features: [
      "Unlimited events",
      "Inline Paystack &amp; Flutterwave checkout",
      "QR tickets with email delivery",
      "Organizer dashboard",
    ],
  },
  {
    name: "Pro",
    fee: "3.5%",
    description: "For organizers running events regularly.",
    features: [
      "Everything in Starter",
      "Priority listing placement",
      "Ticket scanner for multiple gate staff",
      "Basic sales analytics",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    fee: "Custom",
    description: "For festivals, venues, and high-volume promoters.",
    features: [
      "Everything in Pro",
      "Dedicated account support",
      "Custom payout schedule",
      "API access",
    ],
  },
];

export default function Pricing() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
      <div className="text-center max-w-xl mx-auto mb-16">
        <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Pricing</p>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-5">
          Simple, per-ticket pricing.
        </h1>
        <p className="text-smoke">
          No setup fees, no monthly subscription — you only pay a small fee on tickets you actually sell.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 flex flex-col ${
              plan.highlighted
                ? "border-gold bg-gradient-to-b from-gold/10 to-panel"
                : "border-line bg-panel"
            }`}
          >
            {plan.highlighted && (
              <span className="self-start text-[10px] font-bold tracking-widest uppercase bg-gold text-ink px-2.5 py-1 rounded-full mb-4">
                Most popular
              </span>
            )}
            <h2 className="font-display text-2xl tracking-wide mb-1">{plan.name}</h2>
            <p className="text-4xl font-display text-gold mb-2">{plan.fee}</p>
            <p className="text-xs text-smoke mb-6">{plan.description}</p>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-smoke">
                  <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>

            <a
              href="/create-event"
              className={`inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-full transition-colors ${
                plan.highlighted
                  ? "bg-gold hover:bg-gold-bright text-ink"
                  : "border border-line hover:border-gold/50 text-bone"
              }`}
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-smoke mt-12">
        Payment processor fees from Paystack/Flutterwave apply separately and are set by them, not us.
      </p>
    </div>
  );
}

