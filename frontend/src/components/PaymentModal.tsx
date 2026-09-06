// frontend/src/components/PaymentModal.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePaystackPayment } from "react-paystack";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { Loader2 } from "lucide-react";
import { apiPost, apiGet } from "../lib/apiClient";

interface PaymentModalProps {
  amountNaira: number;
  email: string;
  name: string;
  phone: string;
  eventId: string;          // Required for verification – for balance payments, this is still the event ID
  orderRef: string;         // payment_reference (string) – works for both new and balance payments
  provider: "paystack" | "flutterwave";
  onVerified?: (data: { reference: string; provider: string }) => void;
}

export default function PaymentModal({
  amountNaira,
  email,
  name,
  phone,
  eventId,
  orderRef,
  provider,
  onVerified,
}: PaymentModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const [paystackSubaccountCode, setPaystackSubaccountCode] = useState<string | undefined>();
  const [flutterwaveSubaccountId, setFlutterwaveSubaccountId] = useState<string | undefined>();

  const generateReference = (prefix: string) => {
    const eventPrefix = eventId ? eventId.slice(0, 6) : "EVNT";
    return `${prefix}-${eventPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const [paystackRef, setPaystackRef] = useState("");
  const [flutterwaveRef, setFlutterwaveRef] = useState("");

  useEffect(() => {
    if (eventId) {
      setPaystackRef(generateReference("PAY"));
      setFlutterwaveRef(generateReference("FLW"));
    }
  }, [eventId]);

  // ============================================
  // VERIFY PAYMENT – works for both full and balance payments
  // The backend `finalizeVerifiedPayment` checks the order status
  // and handles balance payments accordingly.
  // ============================================
  const verifyPayment = useCallback(
    async (verifyProvider: "paystack" | "flutterwave", reference: string) => {
      setIsVerifying(true);
      console.log("🔍 Verifying payment:", { verifyProvider, reference, orderRef, eventId });

      try {
        const data = await apiPost("/api/payments/verify", {
          provider: verifyProvider,
          reference,
          orderRef,      // payment_reference – works for both new and balance orders
          eventId,       // required by backend to associate the event
        });
        console.log("📦 Verification response:", data);
        return data;
      } catch (err) {
        console.error("❌ Verification error:", err);
        throw err;
      } finally {
        setIsVerifying(false);
      }
    },
    [eventId, orderRef]
  );

  // ============================================
  // PAYSTACK CONFIG
  // ============================================
  const paystackConfig = {
    reference: paystackRef,
    email,
    amount: amountNaira * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "",
    currency: "NGN",
    ...(paystackSubaccountCode ? { subaccount: paystackSubaccountCode, bearer: "subaccount" as const } : {}),
    metadata: {
      order_ref: orderRef,
      event_id: eventId,
      customer_name: name,
      customer_phone: phone,
      custom_fields: [],
    },
  };

  const initializePaystackPayment = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = async (response: any) => {
    console.log("🎯 PAYSTACK CALLBACK", response);
    setLoading(true);
    try {
      await verifyPayment("paystack", response.reference);
      onVerified?.({ reference: response.reference, provider: "paystack" });
      navigate("/bag", {
        state: {
          reference: response.reference,
          provider: "paystack",
          orderRef,
          eventId,
        },
      });
    } catch (err: any) {
      console.error("❌ Paystack post-payment error:", err);
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
      setPaymentInitiated(false);
    }
  };

  const handlePaystackClose = () => {
    console.log("❌ Paystack modal closed");
    if (!loading && !isVerifying) {
      setError("Payment was cancelled");
    }
    setLoading(false);
    setPaymentInitiated(false);
  };

  // ============================================
  // FLUTTERWAVE CONFIG
  // ============================================
  const flutterwaveConfig = {
    public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "",
    tx_ref: flutterwaveRef,
    amount: amountNaira,
    currency: "NGN",
    payment_options: "card,mobilemoney,ussd",
    ...(flutterwaveSubaccountId ? { subaccounts: [{ id: flutterwaveSubaccountId }] } : {}),
    customer: { email, phone_number: phone, name },
    customizations: {
      title: "Event Ticket Purchase",
      description: `Order #${orderRef}`,
      logo: "https://your-logo-url.com/logo.png",
    },
    meta: { order_ref: orderRef, event_id: eventId },
    callback: async (response: any) => {
      console.log("🎯 FLUTTERWAVE CALLBACK", response);
      closePaymentModal();

      if (response.status !== "successful") {
        setError("Payment was not successful");
        setLoading(false);
        setPaymentInitiated(false);
        return;
      }

      const reference = response.transaction_id || response.tx_ref;
      setLoading(true);
      try {
        await verifyPayment("flutterwave", reference);
        onVerified?.({ reference, provider: "flutterwave" });
        navigate("/bag", {
          state: {
            reference,
            provider: "flutterwave",
            orderRef,
            eventId,
          },
        });
      } catch (err: any) {
        console.error("❌ Flutterwave post-payment error:", err);
        setError(err.message || "Verification failed");
      } finally {
        setLoading(false);
        setPaymentInitiated(false);
      }
    },
    onClose: () => {
      console.log("❌ Flutterwave modal closed");
      if (!loading && !isVerifying) {
        setError("Payment was cancelled");
      }
      setLoading(false);
      setPaymentInitiated(false);
    },
  };

  const initializeFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  // ============================================
  // HANDLE PAYMENT INITIATION
  // ============================================
  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!eventId || !orderRef) {
        throw new Error("Missing event or order information");
      }

      const providerRef = generateReference(provider === "paystack" ? "PAY" : "FLW");
      if (provider === "paystack") {
        setPaystackRef(providerRef);
      } else {
        setFlutterwaveRef(providerRef);
      }

      // Update order with the provider's transaction reference
      // This uses the payment_reference (orderRef) to locate the order.
      await apiPost("/api/payments/update-payment-ref", {
        orderRef,          // payment_reference – works for both new and balance orders
        provider,
        providerReference: providerRef,
      });

      // Fetch subaccount info (for payout splitting)
      let subaccountCode: string | undefined = paystackSubaccountCode;
      let subaccountId: string | undefined = flutterwaveSubaccountId;
      try {
        const subData = await apiGet(`/api/payments/subaccount-for-order/${orderRef}`);
        if (subData.success) {
          subaccountCode = subData.paystackSubaccountCode ?? undefined;
          subaccountId = subData.flutterwaveSubaccountId ?? undefined;
          setPaystackSubaccountCode(subaccountCode);
          setFlutterwaveSubaccountId(subaccountId);
        }
      } catch (e) {
        console.warn("Could not fetch subaccount:", e);
      }

      setPaymentInitiated(true);

      // Open the payment modal.
      setTimeout(() => {
        if (provider === "paystack") {
          initializePaystackPayment({
            onSuccess: handlePaystackSuccess,
            onClose: handlePaystackClose,
            config: {
              reference: providerRef,
              email,
              amount: amountNaira * 100,
              currency: "NGN",
              ...(subaccountCode ? { subaccount: subaccountCode, bearer: "subaccount" as const } : {}),
              metadata: {
                order_ref: orderRef,
                event_id: eventId,
                customer_name: name,
                customer_phone: phone,
                custom_fields: [],
              },
            },
          });
        } else {
          const freshConfig = {
            ...flutterwaveConfig,
            tx_ref: providerRef,
            ...(subaccountId ? { subaccounts: [{ id: subaccountId }] } : {}),
          };
          initializeFlutterwavePayment(freshConfig);
        }
      }, 400);
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setError(err.message || "Payment initialization failed");
      setLoading(false);
      setPaymentInitiated(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <button
        onClick={handlePayment}
        disabled={loading || isVerifying || !eventId || !orderRef}
        className="w-full bg-gold hover:bg-gold-bright text-ink font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading || isVerifying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {isVerifying ? "Verifying payment..." : "Processing..."}
          </>
        ) : (
          `Pay ${amountNaira.toLocaleString()} with ${provider === "paystack" ? "Paystack" : "Flutterwave"}`
        )}
      </button>

      {error && (
        <div className="text-sm text-red-400 mt-3 text-center p-3 bg-red-400/10 border border-red-400/20 rounded-xl">
          {error}
        </div>
      )}

      <p className="text-xs text-smoke mt-4 text-center">
        🔒 Secure payment powered by {provider === "paystack" ? "Paystack" : "Flutterwave"}
      </p>
    </div>
  );
}