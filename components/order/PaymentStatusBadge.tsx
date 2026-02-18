import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types/order";

export default function PaymentStatusBadge({
    status,
    }: {
    status: PaymentStatus;
    }) {
    const label: Record<PaymentStatus, string> = {
        unpaid: "Unpaid",
        paid: "Paid",
        failed: "Failed",
        expired: "Expired",
        refunded: "Refunded",
    };

    const styles: Record<PaymentStatus, string> = {
        unpaid: "bg-yellow-100 text-yellow-700 border-yellow-200",
        paid: "bg-green-100 text-green-700 border-green-200",
        failed: "bg-red-100 text-red-700 border-red-200",
        expired: "bg-gray-100 text-gray-700 border-gray-200",
        refunded: "bg-purple-100 text-purple-700 border-purple-200",
    };

    return (
        <span
        className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            styles[status]
        )}
        >
        {label[status]}
        </span>
    );
}