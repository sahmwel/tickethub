// frontend/src/pages/Wallet.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  History,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPost } from "../lib/apiClient";
import { formatMoney, getCountryConfig } from "../lib/constants";
import AccountNav from "../components/AccountNav";
import { usePaystackPayment } from "react-paystack";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";

// Declare Paystack and Flutterwave types
declare global {
  interface Window {
    PaystackPop?: any;
    FlutterwaveCheckout?: any;
  }
}

interface Transaction {
  id: string;
  amount: number;
  type: "credit" | "debit" | "refund";
  description: string;
  reference: string;
  status: string;
  metadata: any;
  created_at: string;
}

interface PendingInstallment {
  event_slug: any;
  id: string;
  event_title: string;
  amount_total: number;
  amount_paid: number;
  balance_due: number;
  due_date: string;
}

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function groupTransactionsByDay(transactions: Transaction[]) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Transaction[] }[] = [];
  const map = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const txDay = startOfDay(new Date(tx.created_at));
    let label: string;
    if (txDay.getTime() === today.getTime()) label = "Today";
    else if (txDay.getTime() === yesterday.getTime()) label = "Yesterday";
    else
      label = txDay.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: txDay.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(tx);
  }

  map.forEach((items, label) => groups.push({ label, items }));
  return groups;
}

export default function Wallet() {
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingInstallments, setPendingInstallments] = useState<PendingInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "credit" | "debit" | "refund">("all");
  const [paymentProvider, setPaymentProvider] = useState<"paystack" | "flutterwave" | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);

  // Get user's country to determine payment provider
  const userCountry = profile?.country || "Nigeria";
  const countryConfig = getCountryConfig(userCountry);
  const defaultProvider = countryConfig.provider || "paystack";

  // Payment references
  const [paystackRef, setPaystackRef] = useState("");
  const [flutterwaveRef, setFlutterwaveRef] = useState("");

  useEffect(() => {
    if (!profile) return;
    fetchWalletData();
    fetchPendingInstallments();
  }, [profile]);

  const fetchWalletData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, txData] = await Promise.all([
        apiGet<{ balance: number }>("/api/wallet/balance"),
        apiGet<{ transactions: Transaction[] }>("/api/wallet/transactions"),
      ]);
      setBalance(balanceData.balance);
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error("Failed to fetch wallet data:", err);
      setError("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInstallments = async () => {
    try {
      const data = await apiGet<{ installments: PendingInstallment[] }>("/api/orders/installments/pending");
      setPendingInstallments(data.installments || []);
    } catch (err) {
      console.error("Failed to fetch pending installments:", err);
    }
  };

  const generateReference = () => {
    return `WALLET-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  // ============================================
  // PAYSTACK CONFIGURATION
  // Confirmed from node_modules/react-paystack/dist/types.d.ts:
  // InitializePayment = (options: { onSuccess?, onClose?, config? }) => void
  // onSuccess/onClose must be passed in that options object at call time —
  // not embedded in this config (as `callback`/`onClose` were before),
  // since the library reads options.onSuccess specifically, not
  // options.callback. Putting them here means nothing fires after a
  // successful charge (this was the exact bug behind stuck ticket
  // payments in PaymentModal.tsx — same pattern, same fix).
  // ============================================
  const paystackConfig = {
    reference: paystackRef,
    email: profile?.email || "",
    amount: parseFloat(fundAmount || "0") * 100, // Paystack uses kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
    currency: "NGN",
    metadata: {
      type: "wallet_funding",
      user_id: profile?.id,
      custom_fields: [],
    },
  };

  const initializePaystackPayment = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = async (response: any) => {
    console.log("🎯 PAYSTACK CALLBACK FIRED", response);
    try {
      setIsFunding(true);
      await verifyWalletPayment(paystackRef, "paystack", response.reference);
    } catch (err) {
      console.error("❌ Verification error:", err);
      setError(err instanceof Error ? err.message : "Payment verification failed");
      setIsFunding(false);
    }
  };

  const handlePaystackClose = () => {
    setIsFunding(false);
    console.log("❌ Paystack modal closed");
    if (!success) {
      setError("Payment was cancelled");
    }
  };

  // ============================================
  // FLUTTERWAVE CONFIGURATION
  // Confirmed from node_modules/flutterwave-react-v3/dist/types.d.ts:
  // useFlutterwave(config: FlutterwaveConfig) returns a function typed as
  // ({ callback, onClose }: InitializeFlutterwavePayment) => void — that
  // returned function accepts ONLY callback/onClose. tx_ref, amount, and
  // everything else belong solely to FlutterwaveConfig (this object below)
  // and cannot be overridden at call time in this version. To send a
  // fresh tx_ref/amount, we update flutterwaveRef/fundAmount state first
  // (see handleFundWallet) and let the component re-render — since this
  // config object is rebuilt from that state every render, the
  // initializeFlutterwavePayment function picks up the fresh values
  // automatically before the call fires.
  // ============================================
  const flutterwaveConfig = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "",
    tx_ref: flutterwaveRef,
    amount: parseFloat(fundAmount || "0"),
    currency: "NGN",
    payment_options: "card,mobilemoney,ussd",
    customer: {
      email: profile?.email || "",
      phone_number: profile?.phone || "",
      name: profile?.full_name || profile?.email || "",
    },
    customizations: {
      title: "Fund Wallet",
      description: `Add ${formatMoney(parseFloat(fundAmount || "0"), "NGN")} to wallet`,
      logo: "https://your-site.com/logo.png",
    },
    meta: {
      type: "wallet_funding",
      user_id: profile?.id,
    },
  };

  const initializeFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const handleFlutterwaveSuccess = (response: any) => {
    console.log("🎯 FLUTTERWAVE CALLBACK FIRED", response);
    closePaymentModal();

    if (response.status !== "successful") {
      setError("Payment was not successful");
      setIsFunding(false);
      return;
    }

    (async () => {
      try {
        setIsFunding(true);
        const reference = response.transaction_id || response.tx_ref;
        await verifyWalletPayment(flutterwaveRef, "flutterwave", reference);
      } catch (err) {
        console.error("❌ Verification error:", err);
        setError(err instanceof Error ? err.message : "Payment verification failed");
        setIsFunding(false);
      }
    })();
  };

  const handleFlutterwaveClose = () => {
    setIsFunding(false);
    console.log("❌ Flutterwave modal closed");
    if (!success) {
      setError("Payment was cancelled");
    }
  };

  // ============================================
  // VERIFY WALLET PAYMENT
  // ============================================
  const verifyWalletPayment = async (reference: string, provider: string, providerReference: string) => {
    try {
      const result = await apiPost<{ success: boolean; balance: number }>("/api/payments/verify-funding", {
        reference,
        provider,
        provider_reference: providerReference,
      });

      if (result.success) {
        setBalance(result.balance);
        const amount = parseFloat(fundAmount || "0");
        setSuccess(`Successfully funded wallet with ${formatMoney(amount, "NGN")}`);
        await fetchWalletData();
        setIsFunding(false);
        setFundAmount("");
        setPaystackRef("");
        setFlutterwaveRef("");
      } else {
        setError("Payment verification failed. Please contact support.");
        setIsFunding(false);
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify payment");
      setIsFunding(false);
    }
  };

  // ============================================
  // HANDLE FUND WALLET
  // ============================================
  const handleFundWallet = async (overrideAmount?: number) => {
    const amount = overrideAmount ?? parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsFunding(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate reference
      const reference = generateReference();
      const provider = defaultProvider;

      setPaymentProvider(provider);

      // Set the reference based on provider
      if (provider === "paystack") {
        setPaystackRef(reference);
        // Initialize Paystack payment
        setTimeout(() => {
          try {
            initializePaystackPayment({
              onSuccess: handlePaystackSuccess,
              onClose: handlePaystackClose,
              config: {
                reference,
                email: profile?.email || "",
                amount: amount * 100,
                currency: "NGN",
                metadata: {
                  type: "wallet_funding",
                  user_id: profile?.id,
                  custom_fields: [],
                },
              },
            });
          } catch (initError) {
            console.error("❌ Paystack initialization error:", initError);
            setError(initError instanceof Error ? initError.message : "Payment initialization failed");
            setIsFunding(false);
          }
        }, 100);
      } else {
        setFlutterwaveRef(reference);
        // Initialize Flutterwave payment.
        // NOTE: initializeFlutterwavePayment only accepts {callback, onClose}
        // — no tx_ref/amount override here. setFlutterwaveRef above already
        // triggered the re-render that rebuilds flutterwaveConfig (and thus
        // this function) with the fresh reference/amount.
        setTimeout(() => {
          try {
            initializeFlutterwavePayment({
              callback: handleFlutterwaveSuccess,
              onClose: handleFlutterwaveClose,
            });
          } catch (initError) {
            console.error("❌ Flutterwave initialization error:", initError);
            setError(initError instanceof Error ? initError.message : "Payment initialization failed");
            setIsFunding(false);
          }
        }, 100);
      }
    } catch (err) {
      console.error("Failed to fund wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to fund wallet");
      setIsFunding(false);
    }
  };

  const stats = useMemo(() => {
    const totalFunded = transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
    return { totalFunded, totalSpent };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  const groupedTransactions = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions]
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowDownRight className="w-4 h-4 text-emerald-400" />;
      case "debit":
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case "refund":
        return <RefreshCw className="w-4 h-4 text-gold" />;
      default:
        return null;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "credit":
        return "text-emerald-400";
      case "refund":
        return "text-gold";
      case "debit":
        return "text-red-400";
      default:
        return "text-smoke";
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "credit":
        return "Credit";
      case "refund":
        return "Refund";
      case "debit":
        return "Debit";
      default:
        return type;
    }
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h1 className="font-display text-4xl mb-4">Please log in</h1>
        <p className="text-smoke mb-8">You need to be logged in to access your wallet.</p>
        <Link to="/login" className="text-gold font-semibold">
          Log in →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
      <p className="text-xs font-bold tracking-widest uppercase text-gold mb-2">Account</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide mb-6">My Wallet</h1>

      <AccountNav />

      {/* Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-panel to-ink border border-gold/20 rounded-2xl p-8 mb-6">
        <Sparkles className="absolute -right-6 -top-6 w-32 h-32 text-gold/5" />
        <div className="flex flex-wrap items-start justify-between gap-6 relative">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-gold" />
              </div>
              <span className="text-sm text-smoke">Available Balance</span>
            </div>
            <p className="font-display text-5xl sm:text-6xl text-gold leading-none">
              {loading ? "···" : formatMoney(balance, "NGN")}
            </p>
            <p className="text-xs text-smoke/60 mt-3">
              {profile?.full_name || profile?.email}
            </p>
          </div>
          <button
            onClick={fetchWalletData}
            className="inline-flex items-center gap-2 border border-line hover:border-gold/50 text-smoke hover:text-bone text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-line/60 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-smoke">Total funded</p>
              <p className="text-sm font-bold text-bone">{formatMoney(stats.totalFunded, "NGN")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-400/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-smoke">Total spent</p>
              <p className="text-sm font-bold text-bone">{formatMoney(stats.totalSpent, "NGN")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* Fund Wallet */}
      <div className="bg-panel border border-line rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-sm uppercase tracking-widest text-gold mb-4">Fund Wallet</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setFundAmount(String(amt))}
              disabled={isFunding}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                fundAmount === String(amt)
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line text-smoke hover:border-gold/40 hover:text-bone"
              }`}
            >
              {formatMoney(amt, "NGN")}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="Or enter a custom amount"
            className="flex-1 bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold/50"
            disabled={isFunding}
          />
          <button
            onClick={() => handleFundWallet()}
            disabled={isFunding || !fundAmount || parseFloat(fundAmount) <= 0}
            className="bg-gold hover:bg-gold-bright disabled:opacity-50 text-ink font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-2 min-w-[140px]"
          >
            {isFunding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Fund Wallet
              </>
            )}
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-smoke/60">
            Pay with <span className="font-semibold text-bone">
              {defaultProvider === "paystack" ? "Paystack" : "Flutterwave"}
            </span>
          </p>
          {isFunding && (
            <p className="text-xs text-gold animate-pulse flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for payment...
            </p>
          )}
        </div>
      </div>

      {/* Pending Installments */}
      {pendingInstallments.length > 0 && (
        <div className="bg-panel border border-yellow-500/20 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-sm uppercase tracking-widest text-yellow-400 mb-4">
            Pending Installments
          </h2>
          <div className="space-y-3">
            {pendingInstallments.map((installment) => (
              <div key={installment.id} className="bg-ink rounded-xl p-4 border border-line">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-bone">{installment.event_title}</p>
                    <p className="text-xs text-smoke">
                      Paid: {formatMoney(installment.amount_paid, "NGN")} · Balance:{" "}
                      {formatMoney(installment.balance_due, "NGN")}
                    </p>
                    <p className="text-xs text-yellow-400/70">
                      Due: {new Date(installment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/events/${installment.event_slug}`}
                    className="text-xs font-semibold text-gold hover:text-gold-bright transition-colors"
                  >
                    Complete Payment →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-line">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gold">
              Transaction History
            </h2>
            <div className="flex items-center gap-1">
              {(["all", "credit", "debit", "refund"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    filter === f
                      ? "bg-gold/10 text-gold"
                      : "text-smoke hover:text-bone"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-smoke/20 mx-auto mb-3" />
            <p className="text-smoke">No transactions yet</p>
            <p className="text-xs text-smoke/60 mt-1">Fund your wallet to get started</p>
          </div>
        ) : (
          <div>
            {groupedTransactions.map((group) => (
              <div key={group.label}>
                <div className="px-6 py-2 bg-ink/40">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-smoke/70">
                    {group.label}
                  </p>
                </div>
                <div className="divide-y divide-line">
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 hover:bg-ink/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === "credit"
                              ? "bg-emerald-400/10"
                              : tx.type === "refund"
                              ? "bg-gold/10"
                              : "bg-red-400/10"
                          }`}
                        >
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-bone truncate">{tx.description}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-smoke">
                              {new Date(tx.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <span className={`text-xs font-medium ${getTransactionColor(tx.type)}`}>
                              {getTransactionLabel(tx.type)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className={`font-bold shrink-0 ${getTransactionColor(tx.type)}`}>
                        {tx.type === "debit" ? "-" : "+"}
                        {formatMoney(tx.amount, "NGN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link
          to="/events"
          className="group flex items-center gap-3 bg-panel border border-line hover:border-gold/40 rounded-xl px-5 py-4 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold group-hover:text-gold transition-colors">Browse Events</p>
            <p className="text-xs text-smoke">Buy tickets with your wallet</p>
          </div>
        </Link>

        <Link
          to="/orders"
          className="group flex items-center gap-3 bg-panel border border-line hover:border-gold/40 rounded-xl px-5 py-4 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold group-hover:text-gold transition-colors">My Orders</p>
            <p className="text-xs text-smoke">View your purchase history</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
