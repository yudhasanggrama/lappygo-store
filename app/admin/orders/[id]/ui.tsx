"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Truck, XCircle, ShieldCheck } from "lucide-react";

import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import PaymentStatusBadge from "@/components/order/PaymentStatusBadge";
import { ApproveCancelDialog } from "@/components/admin/ApproveCancelDialog";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useResilientRealtime } from "@/hooks/useResilientRealtime";
import { OrderStatus, PaymentStatus } from "@/types/order";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(n);
}

const allowedNext = ["shipped", "completed", "cancelled"] as const;
type NextStatus = (typeof allowedNext)[number];

type OrderLike = {
  id: string;
  status: OrderStatus | string;
  payment_status: PaymentStatus | string;
  shipping_fee?: number | null;
  total?: number | null;
  created_at?: string | null;

  // cancellation fields
  cancel_requested?: boolean | null;
  cancel_reason?: string | null;
  cancel_requested_at?: string | null;
};

export default function AdminOrderClient({
  order,
  items,
}: {
  order: OrderLike;
  items: any[];
}) {
  const router = useRouter();

  const [status, setStatus] = useState<string>(String(order.status));
  const [paymentStatus, setPaymentStatus] = useState<string>(
    String(order.payment_status)
  );
  const [loading, setLoading] = useState(false);

  // cancellation state (admin)
  const [cancelRequested, setCancelRequested] = useState<boolean>(
    Boolean(order.cancel_requested)
  );
  const [cancelReason, setCancelReason] = useState<string | null>(
    order.cancel_reason ?? null
  );

  const orderId = String(order?.id ?? "");
  const rtEnabled = Boolean(orderId);

  const st = String(status ?? "").toLowerCase();
  const pay = String(paymentStatus ?? "").toLowerCase();

  const rtConfig = useMemo(
    () => ({
      event: "UPDATE" as const,
      schema: "public",
      table: "orders",
      filter: `id=eq.${orderId}`,
    }),
    [orderId]
  );

  useResilientRealtime(
    `order-detail-${orderId}`,
    rtConfig,
    (payload) => {
      const next = payload?.new;
      if (!next?.id) return;
      if (String(next.id) !== orderId) return;

      // ✅ update state by field presence (not truthy)
      if ("status" in next) setStatus(String(next.status ?? ""));
      if ("payment_status" in next)
        setPaymentStatus(String(next.payment_status ?? ""));

      // listen to cancellation fields too
      if (typeof next?.cancel_requested === "boolean") {
        setCancelRequested(next.cancel_requested);
      }
      if ("cancel_reason" in next) {
        setCancelReason((next.cancel_reason ?? null) as any);
      }
    },
    {
      enabled: rtEnabled,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  const computedSubtotal = useMemo(() => {
    return (items ?? []).reduce(
      (acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 0),
      0
    );
  }, [items]);

  async function updateStatus(next: NextStatus) {
    const curStatus = String(status ?? "").toLowerCase();
    const curPay = String(paymentStatus ?? "").toLowerCase();

    if (String(next).toLowerCase() === curStatus) return;

    // ✅ prevent known 409 conflicts (better UX)
    if (next === "cancelled" && curPay === "paid") {
      toast.error("Paid order can't be cancelled here. Use Approve Cancel & Restock.");
      return;
    }
    if (next === "shipped" && curPay !== "paid") {
      toast.error("Cannot ship unpaid order.");
      return;
    }
    if (next === "cancelled" && (curStatus === "shipped" || curStatus === "completed")) {
      toast.error("Cannot cancel after shipped/completed.");
      return;
    }

    setLoading(true);
    const prev = status;
    setStatus(next);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }

      setStatus(String(json.status ?? next));
      toast.success("Order status updated");
    } catch (e: any) {
      setStatus(prev);
      toast.error(e?.message ?? "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const approveDisabled =
    !cancelRequested ||
    pay !== "paid" ||
    st === "shipped" ||
    st === "completed" ||
    st === "cancelled";

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/admin/orders");
            }}
            className="lg:hidden mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold">Order Detail</h1>
            <p className="text-sm text-muted-foreground">
              Manage order status and review items.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={status as any} />
          <PaymentStatusBadge status={paymentStatus as any} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription className="font-mono text-xs break-all">
            {orderId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatIDR(computedSubtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {formatIDR(Number(order.shipping_fee ?? 0))}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">
              {formatIDR(Number(order.total ?? 0))}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {order.created_at
                ? new Date(order.created_at).toLocaleString("id-ID")
                : "-"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(items ?? []).map((it) => {
            const name = it?.product?.name ?? it?.name ?? "Item";
            const img = it?.image_signed_url || "/placeholder.png";

            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-md overflow-hidden border bg-muted shrink-0">
                    <Image
                      src={img}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatIDR(Number(it.price ?? 0))} ×{" "}
                      {Number(it.quantity ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="font-semibold whitespace-nowrap">
                  {formatIDR(Number(it.price ?? 0) * Number(it.quantity ?? 0))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
          <CardDescription>Choose the next status for this order.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Select
            value={status}
            onValueChange={(v) => updateStatus(v as NextStatus)}
            disabled={loading}
          >
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipped">
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4" /> shipped
                </span>
              </SelectItem>

              <SelectItem value="completed">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> completed
                </span>
              </SelectItem>

              {/* ✅ prevent known 409: paid orders can't be cancelled here */}
              <SelectItem value="cancelled" disabled={pay === "paid"}>
                <span className="inline-flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> cancelled
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-xs text-muted-foreground">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
              </span>
            ) : (
              "Updates are saved immediately."
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cancellation Request</CardTitle>
          <CardDescription>
            If the user requested cancellation (paid order), you can approve it and restore stock.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Requested</span>
            <span className="font-medium">{cancelRequested ? "Yes" : "No"}</span>
          </div>

          {cancelReason ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="text-muted-foreground">Reason</div>
              <div className="mt-1">{cancelReason}</div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <ApproveCancelDialog
              orderId={orderId}
              disabled={approveDisabled}
              onApproved={() => router.refresh()}
            />

            <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Disabled if not paid or already shipped/completed/cancelled.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
