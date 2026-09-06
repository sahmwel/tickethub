// frontend/src/pages/TermsOfService.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">Terms of Service</h1>
      <p className="text-smoke mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-smoke leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-bone mb-3">1. Acceptance of Terms</h2>
          <p>
            By using Sahm TicketHub, you agree to these Terms of Service. If you do not agree, 
            please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">2. Description of Service</h2>
          <p>
            Sahm TicketHub is a platform that connects event organizers with attendees. 
            We provide ticketing services for various events including concerts, festivals, 
            parties, and more.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">3. User Accounts</h2>
          <p className="mb-2">To use our services, you may need to create an account. You agree to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Notify us immediately of any unauthorized use</li>
            <li>Be responsible for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">4. Ticket Purchases</h2>
          <p className="mb-2">When purchasing tickets through our platform:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>All ticket sales are final</li>
            <li>Prices are subject to change</li>
            <li>We reserve the right to cancel orders</li>
            <li>Refunds are handled per our Refund Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">5. Organizer Responsibilities</h2>
          <p className="mb-2">Event organizers agree to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide accurate event information</li>
            <li>Honor all tickets sold</li>
            <li>Comply with all applicable laws</li>
            <li>Maintain appropriate insurance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">6. Limitation of Liability</h2>
          <p>
            Sahm TicketHub is not liable for any damages arising from your use of our services. 
            We act as a platform and are not responsible for the events themselves.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">7. Contact Us</h2>
          <p>
            For questions about these terms, contact us at:
            <br />
            <a href="mailto:support@sahmtickethub.online" className="text-gold hover:text-gold-bright transition-colors">
              support@sahmtickethub.online
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
