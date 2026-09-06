// frontend/src/components/Footer.tsx
import { useState } from "react";
import { Instagram, Twitter, Facebook, Youtube, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { apiPost } from "../lib/apiClient";
import logo from "../assets/logo.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    try {
      await apiPost("/waitlist", { email });
      setMessage({ type: "success", text: "You're on the list! We'll keep you posted." });
      setEmail("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-line mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <img src={logo} alt="SAHM TICKETHUB" className="footer-logo" />
          </Link>
          <p className="text-sm text-smoke leading-relaxed max-w-xs">
            Concerts, comedy, festivals and parties — Nigeria's nightlife, in one place.
          </p>
        </div>

        {/* Waitlist / Stay in the loop */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">
            Stay in the loop
          </p>
          <p className="text-sm text-smoke mb-4">
            Get early access to events, exclusive offers, and updates.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors placeholder:text-smoke/60"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold py-2.5 rounded-xl transition-colors"
            >
              {loading ? "Joining..." : "Join waitlist"}
            </button>
          </form>
          {message && (
            <p
              className={`text-xs mt-2 ${
                message.type === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        {/* Explore */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Explore</p>
          <ul className="space-y-2.5 text-sm text-smoke">
            <li><Link to="/events" className="hover:text-bone transition-colors">Events</Link></li>
            <li><Link to="/about" className="hover:text-bone transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-bone transition-colors">Contact</Link></li>
            {/* <li><Link to="/blog" className="hover:text-bone transition-colors">Blog</Link></li> */}
          </ul>
        </div>

        {/* Organizers */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Organizers</p>
          <ul className="space-y-2.5 text-sm text-smoke">
            <li><Link to="/get-started" className="hover:text-bone transition-colors">Create an event</Link></li>
            <li><Link to="/get-started" className="hover:text-bone transition-colors">Organizer dashboard</Link></li>
            {/* <li><Link to="/pricing" className="hover:text-bone transition-colors">Pricing</Link></li> */}
          </ul>
        </div>

        {/* Legal & Social */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Legal</p>
          <ul className="space-y-2.5 text-sm text-smoke">
            <li><Link to="/privacy" className="hover:text-bone transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-bone transition-colors">Terms of Service</Link></li>
            <li><Link to="/refund-policy" className="hover:text-bone transition-colors">Refund Policy</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-bone transition-colors">Cookie Policy</Link></li>
          </ul>
          
          <div className="mt-6">
            <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Follow us</p>
            <div className="flex items-center gap-4 text-smoke">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-center text-xs text-smoke">
            © {currentYear} Sahm TicketHub — Nigeria's ticketing ecosystem. Built in Kaduna, expanding globally. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-smoke">
            <Link to="/privacy" className="hover:text-bone transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-bone transition-colors">Terms</Link>
            <Link to="/refund-policy" className="hover:text-bone transition-colors">Refund</Link>
            <Link to="/cookie-policy" className="hover:text-bone transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}