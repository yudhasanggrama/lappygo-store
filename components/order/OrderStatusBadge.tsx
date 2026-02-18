import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const label: Record<OrderStatus, string> = {
    pending: "Pending",
    paid: "Paid",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  const styles: Record<OrderStatus, string> = {
    pending:
      "bg-yellow-100 text-yellow-700 border-yellow-200",
    paid:
      "bg-green-100 text-green-700 border-green-200",
    shipped:
      "bg-blue-100 text-blue-700 border-blue-200",
    completed:
      "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled:
      "bg-red-100 text-red-700 border-red-200",
    expired:
      "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        styles[status]
      )}
    >
      {label[status]}
    </span>
  );
}