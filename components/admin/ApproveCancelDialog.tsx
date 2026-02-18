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
import { ShieldCheck, XCircle } from "lucide-react";

export function ApproveCancelDialog({
  orderId,
  disabled = false,
  onApproved,
}: {
  orderId: string;
  disabled?: boolean;
  onApproved?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, note }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

      toast.success("Cancel approved");
      setOpen(false);
      setNote("");
      onApproved?.(); // e.g router.refresh()
    } catch (e: any) {
      toast.error(e?.message ?? "Approve failed");
      // keep open
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <DialogTrigger asChild>
        <Button disabled={disabled} variant="destructive">
          <ShieldCheck className="h-4 w-4 mr-2" />
          Approve cancel
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Approve cancellation?</DialogTitle>
          <DialogDescription>
            This will cancel the order and (if your RPC does it) restore stock / mark refund flow.
            Make sure the order has not been shipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Optional note (visible to logs/admin)</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Customer requested cancellation due to wrong address."
            rows={4}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            <XCircle className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={approve} disabled={loading} variant="destructive">
            {loading ? "Approving..." : "Confirm approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}