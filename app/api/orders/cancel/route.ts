// app/api/orders/cancel/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

import { sendOrderEmail } from "@/lib/email/resend";
import { cancelledEmailTemplate } from "@/lib/email/template";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const service = createSupabaseService();

    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,status,payment_status,cancel_approved_email_sent_at,total")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const st = String(order.status ?? "").toLowerCase();
    if (st === "shipped" || st === "completed") {
      return NextResponse.json(
        { error: "Order already shipped/completed. Cannot cancel." },
        { status: 409 }
      );
    }

    const paid = String(order.payment_status ?? "").toLowerCase() === "paid";
    if (paid) {
      return NextResponse.json(
        { error: "Paid orders cannot be cancelled by user. Use cancel request." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const { error: updErr } = await service
      .from("orders")
      .update({
        status: "cancelled",
        // Kalau kamu memang mau set failed untuk unpaid cancel, keep this.
        // Lebih "clean": payment_status tetap "unpaid" / "pending".
        payment_status: "failed",
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // ✅ send email once (idempotent)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    if (!order.cancel_approved_email_sent_at && user.email) {
      await sendOrderEmail({
        to: user.email,
        subject: `Order dibatalkan — ${orderId}`,
        html: cancelledEmailTemplate({
          orderId,
          appUrl,
          note: "Cancelled by customer (unpaid)",
        }),
      });

      await service
        .from("orders")
        .update({ cancel_approved_email_sent_at: now })
        .eq("id", orderId);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}