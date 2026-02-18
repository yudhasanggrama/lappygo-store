export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "expired" | "refunded";

export type OrderRow = {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  paid_at: string | null;
};