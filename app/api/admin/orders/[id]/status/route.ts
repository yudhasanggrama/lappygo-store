export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

type AllowedStatus = "shipped" | "completed" | "cancelled";

export async function POST(
  req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await Promise.resolve(ctx.params);

    if (!id || !isUUID(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (prof?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = String(body?.status ?? "").toLowerCase() as AllowedStatus;

    const allowed: AllowedStatus[] = ["shipped", "completed", "cancelled"];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const service = createSupabaseService();

    // Read current order state first (enforce rules)
    const { data: cur, error: curErr } = await service
      .from("orders")
      .select("id,status,payment_status")
      .eq("id", id)
      .single();

    if (curErr || !cur) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const curStatus = String(cur.status ?? "").toLowerCase();
    const curPay = String(cur.payment_status ?? "").toLowerCase();

    // Rule: cannot cancel after shipped/completed
    if (nextStatus === "cancelled" && (curStatus === "shipped" || curStatus === "completed")) {
      return NextResponse.json(
        { error: "Cannot cancel after shipped/completed" },
        { status: 409 }
      );
    }

    // Rule: paid order cancellation must go through approve-cancel flow (refund + restock)
    if (nextStatus === "cancelled" && curPay === "paid") {
      return NextResponse.json(
        { error: "Paid order cannot be cancelled here. Use Approve Cancel (refund/restock) flow." },
        { status: 409 }
      );
    }

    // Optional rule: cannot ship unpaid
    if (nextStatus === "shipped" && curPay !== "paid") {
      return NextResponse.json({ error: "Cannot ship unpaid order" }, { status: 409 });
    }

    // Perform updates
    if (nextStatus === "cancelled") {
      // Unpaid cancellation: set payment_status to failed (or keep unpaid if you prefer)
      const { error: updErr } = await service
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: curPay === "expired" ? "expired" : "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updErr) throw updErr;

      // Restock (best effort, but should ideally be in RPC transaction)
      const { data: items, error: itemsErr } = await service
        .from("order_items")
        .select("product_id,quantity")
        .eq("order_id", id);

      if (!itemsErr && items?.length) {
        // increment stock per item
        for (const it of items) {
          await service.rpc("inc_product_stock", {
            p_product_id: it.product_id,
            p_qty: Number(it.quantity ?? 0),
          });
        }
      }

      return NextResponse.json({ status: "cancelled" }, { status: 200 });
    }

    // shipped / completed
    const { error: updErr } = await service
      .from("orders")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updErr) throw updErr;

    return NextResponse.json({ status: nextStatus }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}