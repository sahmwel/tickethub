// frontend/src/types/index.ts

export type UserRole = "attendee" | "organizer" | "admin";

// frontend/src/types/index.ts
export interface Profile {
  is_verified: any;
  id: string;
  email: string;
  full_name: string;
  role: "attendee" | "organizer" | "admin";
  avatar_url?: string;
  country?: string;
  phone?: string;
  paystack_subaccount_code?: string | null;
  flutterwave_subaccount_id?: string | null;
  payout_setup_complete?: boolean;
  created_at: string;
  updated_at?: string;
}


export interface EventRecord {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  cover_image: string | null;
  past_gallery: string[];
  venue_name: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  start_at: string;
  end_at: string | null;
  status: "draft" | "published" | "cancelled";
  is_verified: boolean;
  is_featured: boolean;
  is_sponsored: boolean;
  is_new_drop: boolean;
  fee_bearer: "organizer" | "attendee";
  guest_artiste: string | null;
  guest_artiste_image: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  paystack_subaccount_override: string | null;
  flutterwave_subaccount_override: string | null;
  created_at: string;
  updated_at?: string;
}

// frontend/src/types/index.ts
export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  max_per_order: number;
  allow_installments: boolean; // Make it required with default false
  installment_plan: {
    down_payment_percent: number;
    months: number;
    monthly_payment: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  event_id: string;
  buyer_id: string | null;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
  amount_total: number;
  currency: string;
  currency_code?: string;
  payment_provider?: "paystack" | "flutterwave";
  payment_reference: string;
  paystack_reference?: string;
  flutterwave_reference?: string;
  promo_code?: string;
  discount_amount?: number;
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  created_at?: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  ticket_type_id: string;
  event_id: string;
  code: string;
  holder_name: string;
  checked_in: boolean;
  checked_in_at: string | null;
  transferred_at?: string | null;
  transferred_to_name?: string | null;
  status?: "active" | "refunded" | "transferred";
  created_at?: string;
  updated_at?: string;
}

export interface EventWithTicketTypes extends EventRecord {
  ticket_types: TicketType[];
  organizer?: Profile;
  _isLive?: boolean;
  _isNew?: boolean;
}

export interface CartLine {
  ticketType: TicketType;
  quantity: number;
}

export interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  reason: string;
  ticket_ids: string[];
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  refund_reference: string | null;
  created_at: string;
  orders?: Order;
  profiles?: Profile;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  reference: string;
  created_at: string;
  completed_at: string | null;
  organizer?: Profile;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  event_id: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  min_order_amount: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
  event?: EventRecord;
}

export interface WaitlistEntry {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  quantity: number;
  joined_at: string;
  notified: boolean;
  event?: EventRecord;
}

export interface Review {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_text: string;
  sort_order: number;
  created_at?: string;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  updated_at?: string;
}

export interface PayoutAccount {
  paystack_subaccount_code: string | null;
  flutterwave_subaccount_id: string | null;
  payout_setup_complete: boolean;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
}

export interface PayoutHistory {
  id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  reference: string;
  created_at: string;
  completed_at: string | null;
}

export interface UserConsent {
  id: string;
  user_id: string;
  gdpr_consent: boolean;
  marketing_consent: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip: string;
  user_agent: string;
  timestamp: string;
}

export interface InstallmentPlan {
  down_payment_percent: number;
  months: number;
  monthly_payment: number;
  total_interest?: number;
  apr?: number;
}

export interface TicketWithInstallments extends TicketType {
  allow_installments: boolean;
  installment_plan: InstallmentPlan | null;
}

export interface EventWithInstallments extends EventWithTicketTypes {
  ticket_types: TicketWithInstallments[];
}

export interface CheckoutSession {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: "paystack" | "flutterwave";
  reference: string;
  status: "pending" | "completed" | "failed";
  metadata?: Record<string, any>;
  created_at: string;
  expires_at: string;
}

export interface InstallmentPayment {
  id: string;
  order_id: string;
  ticket_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: "pending" | "paid" | "overdue" | "failed";
  payment_reference: string | null;
  created_at: string;
}