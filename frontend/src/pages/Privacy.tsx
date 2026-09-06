const sections = [
  {
    title: "What we collect",
    body: "When you book a ticket we collect your name, email, phone number, and payment confirmation details from Paystack or Flutterwave (we never see or store your card number). When you create an organizer account, we also collect your event and payout details.",
  },
  {
    title: "How we use it",
    body: "To issue and email your ticket, verify your payment, let organizers check you in at the door, and send updates about events you've booked. We don't sell your data to third parties.",
  },
  {
    title: "Payments",
    body: "Card and transfer details are handled entirely by Paystack and Flutterwave inside their secure popup — Sahm TicketHub never receives or stores your card number, CVV, or PIN.",
  },
  {
    title: "Location",
    body: "The \"events near me\" feature only uses your location if you explicitly tap the button, and only in your browser to sort results — we don't store or log your location.",
  },
  {
    title: "Your rights",
    body: "You can request a copy of your data or ask us to delete your account at any time by contacting us.",
  },
];

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 pb-24">
      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Privacy</p>
      <h1 className="font-display text-5xl tracking-wide mb-4">Privacy policy</h1>
      <p className="text-sm text-smoke mb-12">Last updated August 2026.</p>

      <div className="space-y-10">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-bold text-lg mb-2">{s.title}</h2>
            <p className="text-smoke leading-relaxed text-sm">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-line">
        <p className="text-sm text-smoke">
          Questions about your data? Reach us at{" "}
          <a href="mailto:hello@sahmtickethub.online" className="text-gold font-semibold">
            hello@sahmtickethub.online
          </a>
          .
        </p>
      </div>
    </div>
  );
}

