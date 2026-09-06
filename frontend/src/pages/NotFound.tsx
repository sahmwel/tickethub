import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-6 pt-40 pb-24 text-center">
      <p className="font-display text-8xl text-gold mb-4">404</p>
      <h1 className="font-display text-3xl tracking-wide mb-4">Page not found</h1>
      <p className="text-smoke mb-8">
        This ticket doesn't exist — maybe it already sold out.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-6 py-3 rounded-full transition-colors"
      >
        Back home
      </Link>
    </div>
  );
}

