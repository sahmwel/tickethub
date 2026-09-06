// frontend/src/pages/organizer/PayoutSettings.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Banknote,
  CreditCard,
  Globe,
  Building2,
  Shield,
  Clock,
  Landmark,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../lib/apiClient";
import { COUNTRIES, getCountryConfig, formatMoney } from "../../lib/constants";

interface PayoutAccount {
  paystack_subaccount_code: string | null;
  flutterwave_subaccount_id: string | null;
  payout_setup_complete: boolean;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_code?: string;
  country?: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  reference: string;
  created_at: string;
  completed_at: string | null;
  description?: string;
}

interface Bank {
  code: string;
  name: string;
  country?: string;
  type?: string;
}

export default function PayoutSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state for connecting payout account
  const [selectedCountry, setSelectedCountry] = useState("Nigeria");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const countryConfig = getCountryConfig(selectedCountry);

  useEffect(() => {
    fetchPayoutAccount();
    fetchPayoutHistory();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchBanks();
      // Reset form when country changes
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
      setError(null);
    }
  }, [selectedCountry]);

  const fetchPayoutAccount = async () => {
    try {
      const data = await apiGet<{ payoutAccount: PayoutAccount }>("/api/organizer/payout-account");
      setPayoutAccount(data.payoutAccount);
      if (data.payoutAccount && data.payoutAccount.country) {
        setSelectedCountry(data.payoutAccount.country);
      }
    } catch (err) {
      setError("Failed to load payout account");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      const data = await apiGet<{ history: PayoutHistory[] }>("/api/organizer/payout-history");
      setPayoutHistory(data.history || []);
    } catch (err) {
      console.error("Failed to load payout history:", err);
    }
  };

  const fetchBanks = async () => {
    if (!selectedCountry) return;
    
    setLoadingBanks(true);
    setError(null);
    try {
      // ✅ Use the correct endpoint – /api/organizer/banks
      const data = await apiGet<{ banks: Bank[] }>(
        `/api/organizer/banks?country=${encodeURIComponent(selectedCountry)}&provider=${countryConfig.provider}`
      );
      setBanks(data.banks || []);
      if (data.banks?.length === 0) {
        setError(`No banks available for ${selectedCountry} via ${countryConfig.provider}.`);
      }
    } catch (err) {
      console.error("Failed to load banks:", err);
      setError("Failed to load banks for selected country. Please check your internet connection.");
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    if (!bankCode || !accountNumber) {
      setError("Please select a bank and enter account number.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // ✅ Use /api/organizer/verify-account
      const data = await apiPost<{ account_name: string }>("/api/organizer/verify-account", {
        bankCode,
        accountNumber,
        country: selectedCountry,
        provider: countryConfig.provider,
      });
      setAccountName(data.account_name);
      setSuccess("Account verified successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify account");
    } finally {
      setVerifying(false);
    }
  };

  const connectPayoutAccount = async () => {
    if (!bankCode || !accountNumber || !accountName) {
      setError("Please verify your account first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // ✅ Use /api/organizer/connect-payout
      const data = await apiPost<{ payoutAccount: PayoutAccount }>("/api/organizer/connect-payout", {
        bankCode,
        accountNumber,
        accountName,
        country: selectedCountry,
        provider: countryConfig.provider,
        currency: countryConfig.currency,
      });

      setPayoutAccount(data.payoutAccount);
      setSuccess("Payout account connected successfully!");
      
      // Reset form
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect payout account");
    } finally {
      setSubmitting(false);
    }
  };

  const disconnectPayout = async () => {
    if (!confirm("Are you sure you want to disconnect your payout account?")) return;

    setSubmitting(true);
    try {
      await apiPost("/api/organizer/disconnect-payout", {});
      setPayoutAccount(null);
      setSuccess("Payout account disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "failed":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-smoke bg-panel border-line";
    }
  };

  const getProviderIcon = (provider: string) => {
    return provider === "paystack" ? (
      <span className="text-sm font-bold text-gold">Paystack</span>
    ) : (
      <span className="text-sm font-bold text-blue-400">Flutterwave</span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-line rounded-full"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-gold rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-smoke text-sm animate-pulse">Loading payout settings...</p>
        </div>
      </div>
    );
  }

  const isConnected = payoutAccount?.payout_setup_complete;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-black/95">
      <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-8 pb-24">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-sm text-smoke hover:text-bone transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gold/10 rounded-xl">
            <Banknote className="w-6 h-6 text-gold" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gold">Payout settings</p>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-bone">Payment &amp; Payouts</h1>
          </div>
        </div>
        <p className="text-smoke text-sm mb-8 ml-1">
          Connect your bank account to receive payouts from ticket sales.
        </p>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">{error}</p>
              {error.includes("banks") && (
                <button
                  onClick={() => fetchBanks()}
                  className="text-xs text-gold hover:text-gold-bright transition-colors mt-1"
                >
                  Retry loading banks →
                </button>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Current Payout Account Status */}
        <div className={`rounded-2xl border p-6 mb-8 ${
          isConnected ? "border-gold/30 bg-panel" : "border-yellow-500/30 bg-yellow-500/5"
        }`}>
          <div className="flex items-start gap-3">
            {isConnected ? (
              <CheckCircle2 className="w-6 h-6 text-gold shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-bone">
                {isConnected ? "✅ Payout account connected" : "⚠️ No payout account connected"}
              </p>
              <p className="text-xs text-smoke mt-1">
                {isConnected
                  ? `Your payouts will be sent to your connected bank account automatically.`
                  : `Connect your bank account to receive payouts from ticket sales.`}
              </p>
              {isConnected && payoutAccount && (
                <div className="mt-4 p-4 bg-ink rounded-xl border border-line">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-smoke">Payment Provider</p>
                      <p className="font-semibold text-bone flex items-center gap-2">
                        {payoutAccount.paystack_subaccount_code ? (
                          <>
                            <span className="text-gold">Paystack</span>
                            <span className="text-[10px] px-2 py-0.5 bg-gold/10 rounded-full text-gold border border-gold/20">
                              Nigeria
                            </span>
                          </>
                        ) : payoutAccount.flutterwave_subaccount_id ? (
                          <>
                            <span className="text-blue-400">Flutterwave</span>
                            <span className="text-[10px] px-2 py-0.5 bg-blue-400/10 rounded-full text-blue-400 border border-blue-400/20">
                              {payoutAccount.country || "Africa"}
                            </span>
                          </>
                        ) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-smoke">Bank Account</p>
                      <p className="font-semibold text-bone">
                        {payoutAccount.bank_name} - {payoutAccount.account_number}
                      </p>
                      <p className="text-xs text-smoke">{payoutAccount.account_name}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-smoke">Subaccount Code</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-smoke bg-ink/50 px-2 py-1 rounded border border-line">
                          {payoutAccount.paystack_subaccount_code || payoutAccount.flutterwave_subaccount_id}
                        </p>
                        <button
                          onClick={() => copyToClipboard(payoutAccount.paystack_subaccount_code || payoutAccount.flutterwave_subaccount_id || "")}
                          className="p-1 hover:text-gold transition-colors"
                          title="Copy subaccount code"
                        >
                          {copied ? <Check className="w-3 h-3 text-gold" /> : <Copy className="w-3 h-3 text-smoke" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={disconnectPayout}
                    disabled={submitting}
                    className="mt-4 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <AlertTriangle className="w-3 h-3" />
                    Disconnect account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connect Payout Account Form */}
        {!isConnected && (
          <div className="bg-panel border border-line rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Landmark className="w-5 h-5 text-gold" />
              <h2 className="font-bold text-sm uppercase tracking-widest text-gold">
                Connect your bank account
              </h2>
            </div>
            <p className="text-xs text-smoke mb-6">
              Select your country and enter your bank details to receive payouts.
              We support multiple African countries through our payment partners.
            </p>

            <div className="space-y-5">
              {/* Country Selection */}
              <div>
                <label className="text-xs text-smoke mb-1.5 block font-semibold">
                  Country <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors appearance-none"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.currency}) - {c.provider === "paystack" ? "Paystack" : "Flutterwave"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Shield className="w-3 h-3 text-gold/60" />
                  <p className="text-[11px] text-smoke/60">
                    Payouts via {getProviderIcon(countryConfig.provider)} in {countryConfig.currency}
                  </p>
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="text-xs text-smoke mb-1.5 block font-semibold">
                  Select Bank <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
                  <select
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value);
                      setAccountName("");
                    }}
                    className="w-full bg-ink border border-line rounded-xl pl-10 pr-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors appearance-none"
                    disabled={loadingBanks}
                  >
                    <option value="">{loadingBanks ? "Loading banks..." : "Select a bank"}</option>
                    {banks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name} {bank.type ? `(${bank.type})` : ""}
                      </option>
                    ))}
                  </select>
                  {loadingBanks && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gold" />
                    </div>
                  )}
                </div>
                {banks.length === 0 && !loadingBanks && selectedCountry && (
                  <p className="text-[11px] text-yellow-400/70 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No banks available for this country
                  </p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="text-xs text-smoke mb-1.5 block font-semibold">
                  Account Number <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setAccountNumber(value);
                        setAccountName("");
                      }}
                      placeholder="Enter account number"
                      className="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm text-bone outline-none focus:border-gold/50 transition-colors"
                      maxLength={10}
                      disabled={!bankCode}
                    />
                    {accountNumber && accountNumber.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {verifying ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        ) : accountName ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={verifyAccount}
                    disabled={verifying || !bankCode || accountNumber.length < 10}
                    className="bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap text-sm"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </button>
                </div>
                {!bankCode && (
                  <p className="text-[11px] text-smoke/60 mt-1">
                    Please select a bank first
                  </p>
                )}
              </div>

              {/* Account Name (auto-filled after verification) */}
              {accountName && (
                <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-smoke">Verified Account Name</p>
                  </div>
                  <p className="font-semibold text-bone text-lg">{accountName}</p>
                  <p className="text-[11px] text-smoke/60 mt-1">
                    Account verified successfully with {getProviderIcon(countryConfig.provider)}
                  </p>
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={connectPayoutAccount}
                disabled={submitting || !accountName || !bankCode || !accountNumber}
                className="w-full flex items-center justify-center gap-3 bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold py-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-glow mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Banknote className="w-5 h-5" />
                    Connect Payout Account
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-smoke/60">
                <Shield className="w-3 h-3" />
                <span>Your account details are encrypted and secure.</span>
                <span className="text-gold">🔒</span>
              </div>
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-panel border border-line rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-line flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Payout History
            </h2>
            {payoutHistory.length > 0 && (
              <span className="text-xs text-smoke">{payoutHistory.length} payouts</span>
            )}
          </div>

          {payoutHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-smoke/30" />
              </div>
              <p className="text-smoke">No payout history yet.</p>
              <p className="text-xs text-smoke/60 mt-1">
                Payouts will appear here once you start selling tickets.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink/50 border-b border-line">
                  <tr>
                    <th className="text-left py-3.5 px-6 text-xs text-smoke font-semibold uppercase tracking-wider">Date</th>
                    <th className="text-left py-3.5 px-6 text-xs text-smoke font-semibold uppercase tracking-wider">Amount</th>
                    <th className="text-left py-3.5 px-6 text-xs text-smoke font-semibold uppercase tracking-wider">Reference</th>
                    <th className="text-left py-3.5 px-6 text-xs text-smoke font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id} className="border-b border-line/50 hover:bg-ink/20 transition-colors">
                      <td className="py-3.5 px-6">
                        <div>
                          <p className="text-sm text-bone">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-smoke">
                            {new Date(payout.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <p className="font-bold text-gold">
                          {formatMoney(payout.amount, payout.currency || "NGN")}
                        </p>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-mono text-xs text-smoke bg-ink/30 px-2 py-1 rounded border border-line">
                          {payout.reference}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${getStatusColor(payout.status)}`}>
                          {payout.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                          {payout.status === "pending" && <Clock className="w-3 h-3" />}
                          {payout.status === "failed" && <AlertTriangle className="w-3 h-3" />}
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Clock className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-bold text-sm text-bone">Processing Time</h3>
            </div>
            <p className="text-xs text-smoke leading-relaxed">
              Payouts are processed within 3-5 business days after each ticket sale.
              You'll receive an email notification when a payout is initiated.
            </p>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Shield className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-bold text-sm text-bone">Secure &amp; Safe</h3>
            </div>
            <p className="text-xs text-smoke leading-relaxed">
              Your bank details are encrypted and securely stored.
              We use industry-standard security to protect your financial information.
            </p>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Globe className="w-4 h-4 text-gold" />
              </div>
              <h3 className="font-bold text-sm text-bone">Multi-Country</h3>
            </div>
            <p className="text-xs text-smoke leading-relaxed">
              We support payouts in multiple African countries through
              Paystack (Nigeria) and Flutterwave (other African countries).
            </p>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-6 bg-panel border border-line rounded-2xl p-5 text-center">
          <p className="text-sm text-smoke">
            Need help with payouts? Contact our support team at{" "}
            <a 
              href="mailto:support@sahmtickethub.online" 
              className="text-gold hover:text-gold-bright font-semibold transition-colors"
            >
              support@sahmtickethub.online
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}