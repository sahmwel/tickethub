import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { apiGet, apiPatch } from "../../lib/apiClient";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: "attendee" | "organizer" | "admin";
  created_at: string;
}

const roleColors: Record<string, string> = {
  attendee: "text-smoke border-line",
  organizer: "text-gold border-gold/40",
  admin: "text-red-400 border-red-400/40",
};

export default function AllUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "attendee" | "organizer" | "admin">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ users: UserRow[] }>("/api/admin/users")
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (user: UserRow, role: UserRow["role"]) => {
    setBusyId(user.id);
    try {
      await apiPatch(`/api/admin/users/${user.id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesQuery =
      query.trim().length === 0 ||
      u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-10">All users</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-panel border border-line rounded-xl px-4 py-3 focus-within:border-gold/50 transition-colors">
          <Search className="w-4 h-4 text-smoke shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="bg-transparent outline-none w-full text-sm text-bone placeholder:text-smoke/60"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="bg-panel border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50"
        >
          <option value="all">All roles</option>
          <option value="attendee">Attendee</option>
          <option value="organizer">Organizer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-smoke text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading users…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-smoke text-sm">No users match those filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 bg-panel border border-line rounded-2xl px-5 py-3.5">
              <div>
                <p className="font-bold text-sm">{u.full_name}</p>
                <p className="text-xs text-smoke">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${roleColors[u.role]}`}>
                  {u.role}
                </span>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value as UserRow["role"])}
                  disabled={busyId === u.id}
                  className="bg-ink border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-gold/50 disabled:opacity-50"
                >
                  <option value="attendee">Attendee</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
