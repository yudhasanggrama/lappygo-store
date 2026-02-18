// app/api/orders/cancel-request/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

import { sendOrderEmail } from "@/lib/email/resend";
import { cancelRequestEmailTemplate } from "@/lib/email/template";

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
    const reason = String(body.reason ?? "");
    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const service = createSupabaseService();

    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,status,payment_status,cancel_requested,cancel_request_email_sent_at")
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
    if (!paid) {
      return NextResponse.json(
        { error: "Order is not paid. Use cancel instead." },
        { status: 409 }
      );
    }

    // ✅ kalau sudah request, tetap ok (tapi jangan kirim email berkali-kali)
    if (order.cancel_requested) {
      return NextResponse.json({ ok: true, already: true }, { status: 200 });
    }

    const now = new Date().toISOString();

    const { error: updErr } = await service
      .from("orders")
      .update({
        cancel_requested: true,
        cancel_reason: reason || null,
        cancel_requested_at: now,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // ✅ send email once
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    if (!order.cancel_request_email_sent_at && user.email) {
      await sendOrderEmail({
        to: user.email,
        subject: `Permintaan pembatalan diterima — Order ${orderId}`,
        html: cancelRequestEmailTemplate({
          orderId,
          appUrl,
          reason: reason || null,
        }),
      });

      await service
        .from("orders")
        .update({ cancel_request_email_sent_at: now })
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