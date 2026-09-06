// frontend/src/pages/GetStarted.tsx
import { Link } from "react-router-dom";
import {
  Sparkles,
  Users,
  Ticket,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Wallet,
  RefreshCw,
  ScanLine,
  Settings,
  Globe,
  Crown,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Built‑in Wallet",
    description: "Hold funds, make instant purchases, and get automatic refunds — all in one place.",
    color: "from-emerald-400/20 to-emerald-400/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: CreditCard,
    title: "Installment Payments",
    description: "Let attendees pay 50% now and 50% later. Automatically refund deposits after the event.",
    color: "from-blue-400/20 to-blue-400/5",
    iconColor: "text-blue-400",
  },
  {
    icon: RefreshCw,
    title: "Hassle‑free Refunds",
    description: "Refund tickets to wallets with a single click — no payment provider hassle.",
    color: "from-purple-400/20 to-purple-400/5",
    iconColor: "text-purple-400",
  },
  {
    icon: ScanLine,
    title: "QR Code Check‑in",
    description: "Scan tickets instantly at the door with our mobile‑friendly QR scanner.",
    color: "from-rose-400/20 to-rose-400/5",
    iconColor: "text-rose-400",
  },
  {
    icon: Ticket,
    title: "Multi‑tier Ticketing",
    description: "Create VIP, Early Bird, General Admission, and custom ticket types with ease.",
    color: "from-amber-400/20 to-amber-400/5",
    iconColor: "text-amber-400",
  },
  {
    icon: BarChart3,
    title: "Real‑time Analytics",
    description: "Track sales, revenue, and attendance live from your dashboard.",
    color: "from-cyan-400/20 to-cyan-400/5",
    iconColor: "text-cyan-400",
  },
  {
    icon: Users,
    title: "Attendee Management",
    description: "View guest lists, export CSV, and manage attendee check‑ins.",
    color: "from-indigo-400/20 to-indigo-400/5",
    iconColor: "text-indigo-400",
  },
  {
    icon: Globe,
    title: "Global Payments",
    description: "Paystack (Nigeria) and Flutterwave (worldwide) — support for 100+ countries.",
    color: "from-teal-400/20 to-teal-400/5",
    iconColor: "text-teal-400",
  },
  {
    icon: Settings,
    title: "Payout Settings",
    description: "Connect your bank account and get paid directly after each event.",
    color: "from-orange-400/20 to-orange-400/5",
    iconColor: "text-orange-400",
  },
];

export default function GetStarted() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95 overflow-x-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 -left-48 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-48 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 relative">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gold/10 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-6 border border-gold/20">
            <Sparkles className="w-3.5 h-3.5" />
            Create, Manage & Control
          </div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-wide text-bone mb-6 leading-[1.1]">
            Create, Manage and Control <br />
            <span className="text-gold relative inline-block">
              your events efficiently
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-gold/30 rounded-full" />
            </span>
          </h1>
          <p className="text-smoke text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Streamline your event's processes with our easy‑to‑use dashboard.
            From ticket sales to attendee management — everything in one place.
          </p>

          {/* CTA Buttons with redirect */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup?role=organizer&redirect=/organizer/create-event"
              className="group inline-flex items-center gap-3 bg-gold hover:bg-gold-bright text-ink font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(242,179,61,0.3)] text-lg"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login?redirect=/organizer/create-event"
              className="inline-flex items-center gap-2 bg-panel border border-line hover:border-gold/40 text-bone font-semibold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 text-lg"
            >
              Log In
            </Link>
          </div>

          <p className="text-sm text-smoke/60 mt-6">
            Already have an account?{" "}
            <Link to="/login?redirect=/organizer/create-event" className="text-gold hover:text-gold-bright transition-colors font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Stats / Preview Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 relative">
        <div className="bg-panel/80 backdrop-blur-sm border border-line/60 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <p className="text-3xl font-display text-gold group-hover:scale-105 transition-transform">₦0</p>
              <p className="text-xs text-smoke/70 mt-1">Total Settled</p>
            </div>
            <div className="text-center group">
              <p className="text-3xl font-display text-gold group-hover:scale-105 transition-transform">0</p>
              <p className="text-xs text-smoke/70 mt-1">Attendees</p>
            </div>
            <div className="text-center group">
              <p className="text-3xl font-display text-gold group-hover:scale-105 transition-transform">0</p>
              <p className="text-xs text-smoke/70 mt-1">Tickets Sold</p>
            </div>
            <div className="text-center group">
              <p className="text-3xl font-display text-gold group-hover:scale-105 transition-transform">0</p>
              <p className="text-xs text-smoke/70 mt-1">Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 relative">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-bone mb-3">
            Why choose us
          </h2>
          <p className="text-smoke max-w-xl mx-auto">
            Make event planning easy, seamless, and stress‑free.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color, iconColor }) => (
            <div
              key={title}
              className={`group bg-gradient-to-br ${color} bg-panel/80 backdrop-blur-sm border border-line/60 rounded-2xl p-6 transition-all hover:-translate-y-2 hover:border-gold/40 hover:shadow-[0_8px_30px_rgba(242,179,61,0.1)]`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-bone mb-2">{title}</h3>
              <p className="text-sm text-smoke leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 relative">
        <div className="bg-panel/80 backdrop-blur-sm border border-line/60 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-smoke/80">
            <span className="flex items-center gap-2 hover:text-gold transition-colors">
              <ShieldCheck className="w-4 h-4 text-gold" />
              Verified Organizers
            </span>
            <span className="flex items-center gap-2 hover:text-gold transition-colors">
              <Zap className="w-4 h-4 text-gold" />
              Instant Checkout
            </span>
            <span className="flex items-center gap-2 hover:text-gold transition-colors">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              No Hidden Fees
            </span>
            <span className="flex items-center gap-2 hover:text-gold transition-colors">
              <Users className="w-4 h-4 text-gold" />
              10K+ Happy Attendees
            </span>
            <span className="flex items-center gap-2 hover:text-gold transition-colors">
              <Globe className="w-4 h-4 text-gold" />
              Global Payment Support
            </span>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24 relative">
        <div className="relative rounded-3xl border border-gold/20 bg-gradient-to-br from-panel to-ink px-8 py-16 sm:px-16 text-center overflow-hidden shadow-2xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-gold/10 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-6 border border-gold/20">
              <Crown className="w-3.5 h-3.5" />
              For organizers
            </div>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-bone mb-4">
              Ready to create your <span className="text-gold">first event</span>?
            </h2>
            <p className="text-smoke max-w-md mx-auto mb-10">
              Join organizers already selling out shows on Sahm TicketHub.
            </p>
            <Link
              to="/signup?role=organizer&redirect=/organizer/create-event"
              className="group inline-flex items-center gap-3 bg-gold hover:bg-gold-bright text-ink font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(242,179,61,0.3)] text-lg"
            >
              <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-smoke/60 mt-6">
              Already have an account?{" "}
              <Link to="/login?redirect=/organizer/create-event" className="text-gold hover:text-gold-bright transition-colors font-semibold">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line/40 py-6 text-center text-xs text-smoke/30">
        Sahm TicketHub – Kaduna, Nigeria
      </div>
    </div>
  );
}
