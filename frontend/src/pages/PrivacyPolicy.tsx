// frontend/src/pages/PrivacyPolicy.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">Privacy Policy</h1>
      <p className="text-smoke mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-smoke leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-bone mb-3">1. Information We Collect</h2>
          <p className="mb-2">We collect the following types of information:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Personal information (name, email, phone number)</li>
            <li>Payment information (processed securely through our payment providers)</li>
            <li>Usage data (how you interact with our platform)</li>
            <li>Device information (browser type, IP address)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">2. How We Use Your Information</h2>
          <p className="mb-2">We use your information to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Process your ticket purchases</li>
            <li>Send you order confirmations and updates</li>
            <li>Improve our services</li>
            <li>Send you promotional offers (with your consent)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">3. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. 
            Your payment information is encrypted and processed securely through 
            our payment providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">4. Third-Party Sharing</h2>
          <p>
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Event organizers (for ticket validation)</li>
            <li>Payment providers (for transaction processing)</li>
            <li>Legal authorities (when required by law)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">5. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">6. Contact Us</h2>
          <p>
            For privacy-related questions, contact us at:
            <br />
            <a href="mailto:privacy@sahmtickethub.online" className="text-gold hover:text-gold-bright transition-colors">
              privacy@sahmtickethub.online
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
