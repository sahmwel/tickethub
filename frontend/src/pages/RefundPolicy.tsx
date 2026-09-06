// frontend/src/pages/RefundPolicy.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">Refund Policy</h1>
      <p className="text-smoke mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-smoke leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-bone mb-3">1. Overview</h2>
          <p>
            At Sahm TicketHub, we want you to have a great experience. However, we understand that 
            sometimes plans change. This Refund Policy explains when and how refunds are issued, 
            including automatic refunds for installment payments.
          </p>
          <p className="mt-2">
            <strong>All refunds are credited to your Sahm wallet.</strong> Funds in your wallet are 
            <strong> non‑withdrawable</strong> and can only be used to purchase tickets and other services 
            on the platform. This ensures a seamless and secure experience for everyone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">2. Eligibility for Refunds</h2>
          <p className="mb-2">You may be eligible for a refund in the following situations:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Event cancelled by the organizer</strong> – full refund to your wallet</li>
            <li><strong>Event rescheduled</strong> – full refund to your wallet if you cannot attend the new date</li>
            <li><strong>Significant venue change</strong> – full refund to your wallet if the new venue is not acceptable</li>
            <li><strong>Duplicate purchase</strong> – refund of the duplicate tickets to your wallet (within 24 hours)</li>
            <li><strong>Technical issues</strong> – refund to your wallet if you were prevented from attending due to platform errors (with proof)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">3. Installment Payments – Automatic Refund</h2>
          <p className="mb-2">
            When you choose the installment payment plan, you pay a 50% deposit upfront. The remaining 50% 
            <strong> must be paid at least 24 hours before the event starts</strong>. After that deadline, 
            no further payments are accepted.
          </p>
          <p className="mb-2">
            If the balance is not paid in time, the ticket is released and your deposit is automatically 
            <strong> refunded to your wallet 48 hours after the event ends</strong>. 
            No action is required from you.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
            <li>✅ Deposit refunded to wallet automatically</li>
            <li>⏰ Refund processed 48 hours after the event ends</li>
            <li>💳 Wallet balance can be used for future purchases (non‑withdrawable)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">4. Non-Refundable Situations</h2>
          <p className="mb-2">Refunds will not be issued in the following cases:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Change of mind or personal reasons</li>
            <li>Partial attendance of the event</li>
            <li>Tickets purchased from unauthorized resellers (not through Sahm)</li>
            <li>Events that have already taken place (unless cancelled or rescheduled)</li>
            <li>Request made after 7 days of the event date (except for cancellations)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">5. How to Request a Refund</h2>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Log in to your Sahm TicketHub account</li>
            <li>Go to <strong>"My Orders"</strong> in your account dashboard</li>
            <li>Select the order and click <strong>"Request Refund"</strong></li>
            <li>Provide the reason for the refund request</li>
            <li>Submit the request – the refund will be credited to your wallet</li>
          </ol>
          <p className="mt-2">
            <strong>Note:</strong> For installment orders where the balance was not paid, the refund is automatic – 
            you do not need to request it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">6. Processing Time</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Wallet refunds:</strong> Instant – credited immediately to your Sahm wallet</li>
            <li><strong>Installment refunds:</strong> Automatic 48 hours after the event ends</li>
            <li><strong>Manual refunds:</strong> Within 3–5 business days after approval</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">7. Using Your Wallet Balance</h2>
          <p>
            Your wallet balance can be used for any ticket purchase on Sahm TicketHub – including events, 
            and in the future, flights, train tickets, and hotel bookings. 
            <strong> Wallet funds are non‑withdrawable</strong>; they are designed to keep your experience 
            seamless and secure. If you prefer to receive money back to your bank, please choose the payment 
            method refund option during checkout instead of using your wallet.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">8. Contact Us</h2>
          <p>
            If you have any questions about our refund policy, please contact us at:
            <br />
            <a href="mailto:support@sahmtickethub.online" className="text-gold hover:text-gold-bright transition-colors">
              support@sahmtickethub.online
            </a>
            <br />
            We aim to respond within 24 hours.
          </p>
        </section>
      </div>
    </div>
  );
}
