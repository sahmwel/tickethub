// components/TransferModal.tsx

import { useState } from "react";
import { X } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:4000";

interface TransferModalProps {
  ticketId: string;
  currentHolder: string;
  onClose: () => void;
  onSuccess: (newName: string, transferredAt: string) => void;
}

export default function TransferModal({ ticketId, currentHolder, onClose, onSuccess }: TransferModalProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/request-transfer`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to send code");
      setMaskedEmail(data.maskedEmail);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const completeTransfer = async () => {
    if (!code.trim() || !newName.trim()) {
      setError("Enter the code and the new ticket holder's name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          newHolderName: newName.trim(),
          newHolderEmail: newEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Transfer failed");
      onSuccess(newName.trim(), data.transferredAt as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-panel border border-line rounded-2xl p-6 max-w-sm w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-smoke hover:text-bone">
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-display text-xl mb-1">Transfer ticket</h3>
        <p className="text-xs text-smoke mb-5">Currently held by {currentHolder}</p>

        {step === "request" && (
          <>
            <p className="text-sm text-smoke mb-4">
              We'll send a verification code to the email used for this order to confirm you own it.
            </p>
            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-bright text-ink font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send verification code"}
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="text-sm text-smoke mb-4">Code sent to {maskedEmail}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 mb-3"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New ticket holder's full name"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 mb-3"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Their email (optional — sends them a copy)"
              type="email"
              className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50 mb-4"
            />
            <button
              onClick={completeTransfer}
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-bright text-ink font-bold py-3 rounded-xl disabled:opacity-60"
            >
              {loading ? "Transferring…" : "Confirm transfer"}
            </button>
          </>
        )}

        {error && <p className="text-xs text-red-400 mt-3 text-center">{error}</p>}
      </div>
    </div>
  );
}