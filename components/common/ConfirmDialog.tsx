"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ban, XCircle } from "lucide-react";

export function ConfirmDialog({
  orderId,
  paid,
  disabled = false,
  defaultReason,
  onDone,
}: {
  orderId: string;
  paid: boolean;
  disabled?: boolean;
  defaultReason?: string | null;
  onDone?: () => void; // e.g router.refresh()
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState(defaultReason ?? "");
  const [loading, setLoading] = React.useState(false);

  // keep reason in sync when order changes
  React.useEffect(() => {
    setReason(defaultReason ?? "");
  }, [defaultReason, orderId]);

  async function submit() {
    if (disabled || loading) return;

    // For paid orders, reason is recommended (not strictly required by your API)
    if (paid && !String(reason ?? "").trim()) {
      toast.error("Please provide a reason for cancellation request.");
      return;
    }

    setLoading(true);
    try {
      const url = paid ? "/api/orders/cancel-request" : "/api/orders/cancel";
      const payload = paid
        ? { order_id: orderId, reason: String(reason ?? "").trim() }
        : { order_id: orderId };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

      if (paid) {
        toast.success(data?.already ? "Cancellation request already sent." : "Cancellation request sent.");
      } else {
        toast.success("Order cancelled.");
      }

      setOpen(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  const title = paid ? "Request cancellation?" : "Cancel order?";
  const desc = paid
    ? "This order is already paid. Your request will be sent to admin for approval."
    : "This will cancel your order immediately (unpaid order).";

  return (
    <Dialog open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          <Ban className="h-4 w-4 mr-2" />
          {paid ? "Request cancel" : "Cancel order"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Reason (required for paid orders)
            </div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Example: Wrong address / ordered by mistake / want to change item."
              rows={4}
              disabled={loading}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Close
          </Button>

          <Button type="button" variant="destructive" onClick={submit} disabled={disabled || loading}>
            {loading ? "Processing..." : paid ? "Send request" : "Confirm cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
