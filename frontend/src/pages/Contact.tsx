import { useState } from "react";
import { Mail, MessageCircle, CheckCircle2 } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24 grid sm:grid-cols-5 gap-12">
      <div className="sm:col-span-2">
        <p className="text-xs font-bold tracking-widest uppercase text-gold mb-4">Contact</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">
          Let's talk.
        </h1>
        <p className="text-smoke text-sm leading-relaxed mb-8">
          Questions about an order, a partnership, or listing your event —
          reach out and we'll get back within one business day.
        </p>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gold shrink-0" />
            <span className="text-smoke">hello@sahmtickethub.online</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageCircle className="w-4 h-4 text-gold shrink-0" />
            <span className="text-smoke">@sahmtickethub on Instagram &amp; X</span>
          </div>
        </div>
      </div>

      <div className="sm:col-span-3">
        {status === "sent" ? (
          <div className="bg-panel border border-line rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-gold mx-auto mb-4" />
            <p className="font-bold mb-1">Message sent.</p>
            <p className="text-sm text-smoke">We'll reply to your email shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs text-smoke mb-1.5 block">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-smoke mb-1.5 block">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-smoke mb-1.5 block">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold py-3.5 rounded-xl transition-colors"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-400 text-center">
                Something went wrong — try again in a moment.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

