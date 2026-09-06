import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { apiGet, apiPatch } from "../../lib/apiClient";

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<{ settings: Record<string, string> }>("/api/admin/settings")
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPatch("/api/admin/settings", settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to overview
      </Link>

      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-3">Admin</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-10">Platform settings</h1>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-5 mb-6">
        <div>
          <label className="text-xs text-smoke mb-1.5 block">Platform fee (%)</label>
          <input
            value={settings.platform_fee_percent ?? ""}
            onChange={(e) => update("platform_fee_percent", e.target.value)}
            type="number"
            min="0"
            max="100"
            className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
          />
          <p className="text-[11px] text-smoke mt-1">Percentage taken from each ticket sale.</p>
        </div>

        <div>
          <label className="text-xs text-smoke mb-1.5 block">Support email</label>
          <input
            value={settings.support_email ?? ""}
            onChange={(e) => update("support_email", e.target.value)}
            type="email"
            className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
          />
        </div>

        <div>
          <label className="text-xs text-smoke mb-1.5 block">Support phone</label>
          <input
            value={settings.support_phone ?? ""}
            onChange={(e) => update("support_phone", e.target.value)}
            className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
          />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-5">
          <div>
            <p className="text-sm font-bold">Maintenance mode</p>
            <p className="text-[11px] text-smoke">Show a maintenance banner and pause new checkouts.</p>
          </div>
          <button
            type="button"
            onClick={() => update("maintenance_mode", settings.maintenance_mode === "true" ? "false" : "true")}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
              settings.maintenance_mode === "true" ? "bg-gold" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-ink transition-transform ${
                settings.maintenance_mode === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-gold hover:bg-gold-bright disabled:opacity-60 text-ink font-bold px-6 py-3.5 rounded-xl transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save changes
      </button>
      {saved && <span className="ml-3 text-xs text-gold">Saved.</span>}
    </div>
  );
}
