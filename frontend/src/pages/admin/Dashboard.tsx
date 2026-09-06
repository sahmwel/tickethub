// frontend/src/pages/admin/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Ticket,
  DollarSign,
  Check,
  X,
  Trash2,
  Plus,
  LayoutList,
  Sparkles,
  Megaphone,
  Inbox,
} from "lucide-react";
import { apiGet, apiPost, apiDelete, apiPatch } from "../../lib/apiClient";
import type { Profile, EventRecord } from "../../types";

interface Sponsor {
  id: string;
  name: string;
  logo_text: string;
  sort_order: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function AdminDashboard() {
  const [organizers, setOrganizers] = useState<Profile[]>([]);
  const [pendingEvents, setPendingEvents] = useState<EventRecord[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [newSponsorName, setNewSponsorName] = useState("");
  const [stats, setStats] = useState({ users: 0, events: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  // ─── Fetch all data ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get all users (admin only)
      const usersRes = await apiGet<{ users: Profile[] }>("/api/users");
      const allUsers = usersRes.users || [];
      const orgs = allUsers.filter((u) => u.role === "organizer");
      setOrganizers(orgs);

      // 2. Get all events (admin only) – includes draft events
      const eventsRes = await apiGet<{ events: EventRecord[] }>("/api/admin/events");
      const allEvents = eventsRes.events || [];
      const drafts = allEvents.filter((e) => e.status === "draft");
      setPendingEvents(drafts);

      // 3. Get sponsors
      const sponsorsRes = await apiGet<{ sponsors: Sponsor[] }>("/api/admin/sponsors");
      setSponsors(sponsorsRes.sponsors || []);

      // 4. Get platform overview
      const overviewRes = await apiGet<{ overview: { eventsCount: number; totalRevenue: number } }>(
        "/api/admin/overview"
      );
      setStats({
        users: allUsers.length,
        events: overviewRes.overview?.eventsCount ?? 0,
        revenue: overviewRes.overview?.totalRevenue ?? 0,
      });
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Sponsors ─────────────────────────────────────────────────────
  async function addSponsor() {
    const name = newSponsorName.trim();
    if (!name) return;
    try {
      const res = await apiPost<{ sponsor: Sponsor }>("/api/admin/sponsors", {
        name,
        logo_text: name,
        sort_order: sponsors.length + 1,
      });
      if (res.sponsor) {
        setSponsors((prev) => [...prev, res.sponsor]);
        setNewSponsorName("");
      }
    } catch (err) {
      console.error("Failed to add sponsor:", err);
    }
  }

  async function removeSponsor(id: string) {
    try {
      await apiDelete(`/api/admin/sponsors/${id}`);
      setSponsors((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to remove sponsor:", err);
    }
  }

  // ─── Event verification ──────────────────────────────────────────
  async function verifyEvent(id: string) {
    try {
      await apiPatch(`/api/admin/events/${id}/verify`, { verified: true });
      await apiPatch(`/api/admin/events/${id}/status`, { status: "published" });
      setPendingEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to verify event:", err);
    }
  }

  async function rejectEvent(id: string) {
    try {
      await apiPatch(`/api/admin/events/${id}/status`, { status: "cancelled" });
      setPendingEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to reject event:", err);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide">Platform overview</h1>
        </div>
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-2 border border-line hover:border-gold/50 text-bone text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          <LayoutList className="w-4 h-4 text-gold" />
          All events
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <Users className="w-4 h-4 text-gold" />
          </div>
          <p className="text-3xl font-display tracking-wide leading-none mb-1.5">
            {loading ? "—" : stats.users}
          </p>
          <p className="text-xs text-smoke">Registered users</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <Ticket className="w-4 h-4 text-gold" />
          </div>
          <p className="text-3xl font-display tracking-wide leading-none mb-1.5">
            {loading ? "—" : stats.events}
          </p>
          <p className="text-xs text-smoke">Total events</p>
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <DollarSign className="w-4 h-4 text-gold" />
          </div>
          <p className="text-3xl font-display tracking-wide leading-none mb-1.5">
            {loading ? "—" : `₦${stats.revenue.toLocaleString()}`}
          </p>
          <p className="text-xs text-smoke">Platform GMV</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4 mb-14">
        <Link
          to="/admin/events"
          className="group flex items-center gap-3 bg-panel border border-line hover:border-gold/40 rounded-2xl px-5 py-4 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <LayoutList className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold group-hover:text-gold transition-colors">Manage events</p>
            <p className="text-xs text-smoke">Publish, verify, or cancel</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => document.getElementById("sponsors")?.scrollIntoView({ behavior: "smooth" })}
          className="group flex items-center gap-3 bg-panel border border-line hover:border-gold/40 rounded-2xl px-5 py-4 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold group-hover:text-gold transition-colors">Sponsors</p>
            <p className="text-xs text-smoke">Homepage "trusted by" strip</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById("organizers")?.scrollIntoView({ behavior: "smooth" })}
          className="group flex items-center gap-3 bg-panel border border-line hover:border-gold/40 rounded-2xl px-5 py-4 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold group-hover:text-gold transition-colors">Organizers</p>
            <p className="text-xs text-smoke">View sales per organizer</p>
          </div>
        </button>
      </div>

      {/* Events awaiting approval */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl tracking-wide">Events awaiting approval</h2>
        {!loading && pendingEvents.length > 0 && (
          <span className="text-xs font-bold text-ink bg-gold px-2.5 py-1 rounded-full">
            {pendingEvents.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-smoke text-sm mb-14">Loading…</p>
      ) : pendingEvents.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl p-10 text-center mb-14">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-4.5 h-4.5 text-gold" />
          </div>
          <p className="font-bold mb-1">All caught up</p>
          <p className="text-sm text-smoke">Nothing waiting on review right now.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-14">
          {pendingEvents.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-panel border border-line rounded-2xl px-6 py-4"
            >
              <div>
                <p className="font-bold">{e.title}</p>
                <p className="text-xs text-smoke">
                  {e.venue_name}, {e.city}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => verifyEvent(e.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gold hover:bg-gold-bright text-ink px-3 py-2 rounded-full transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => rejectEvent(e.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-line text-smoke hover:text-red-400 hover:border-red-400/50 px-3 py-2 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sponsors */}
      <h2 id="sponsors" className="font-display text-2xl tracking-wide mb-5 scroll-mt-24">
        Sponsors
      </h2>
      <div className="flex gap-2 mb-4">
        <input
          value={newSponsorName}
          onChange={(e) => setNewSponsorName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSponsor()}
          placeholder="Sponsor name"
          className="flex-1 bg-panel border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
        />
        <button
          onClick={addSponsor}
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright text-ink font-bold px-5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {sponsors.length === 0 ? (
        <p className="text-sm text-smoke mb-14">No sponsors added yet — they'll appear on the homepage once added.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 mb-14">
          {sponsors.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-panel border border-line rounded-xl px-5 py-3"
            >
              <span className="text-sm font-semibold">{s.name}</span>
              <button onClick={() => removeSponsor(s.id)} className="text-smoke hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Organizers */}
      <h2 id="organizers" className="font-display text-2xl tracking-wide mb-5 scroll-mt-24">
        Organizers
      </h2>
      {organizers.length === 0 ? (
        <p className="text-sm text-smoke">No organizers have signed up yet.</p>
      ) : (
        <div className="space-y-2">
          {organizers.map((o) => (
            <Link
              key={o.id}
              to={`/admin/organizers/${o.id}`}
              className="flex items-center justify-between gap-4 bg-panel border border-line hover:border-gold/40 rounded-2xl px-5 py-3.5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold shrink-0">
                  {initials(o.full_name) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{o.full_name}</p>
                  <p className="text-xs text-smoke truncate">{o.email}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                View
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}