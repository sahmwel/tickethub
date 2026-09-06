export {};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // kobo
        currency?: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
    FlutterwaveCheckout?: (options: {
      public_key: string;
      tx_ref: string;
      amount: number;
      currency: string;
      customer: { email: string; name: string; phone_number?: string };
      customizations: { title: string; description: string; logo?: string };
      callback: (response: { transaction_id: number; tx_ref: string; status: string }) => void;
      onclose: () => void;
    }) => void;
  }
}
