// frontend/src/pages/CookiePolicy.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-24">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">Cookie Policy</h1>
      <p className="text-smoke mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-smoke leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-bone mb-3">1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your device when you visit a website. 
            They help us provide you with a better experience by remembering your preferences 
            and understanding how you use our site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">2. Types of Cookies We Use</h2>
          <p className="mb-2">We use the following types of cookies:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how you use our site</li>
            <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">3. How to Manage Cookies</h2>
          <p>
            You can control and manage cookies in your browser settings. You can choose to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Accept all cookies</li>
            <li>Reject all cookies</li>
            <li>Be notified when a cookie is set</li>
            <li>Delete existing cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">4. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. We will notify you of any changes 
            by posting the new policy on this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-bone mb-3">5. Contact Us</h2>
          <p>
            If you have questions about our Cookie Policy, contact us at:
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
