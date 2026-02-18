// app/api/admin/orders/cancel/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

import { sendOrderEmail } from "@/lib/email/resend";
import { cancelledEmailTemplate } from "@/lib/email/template";

function midtransBaseUrl() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function midtransAuthHeader() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const basic = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${basic}`;
}

async function requestMidtransRefund(args: {
  providerOrderId: string;
  amount: number; // integer IDR
  reason: string;
}) {
  const url = `${midtransBaseUrl()}/v2/${args.providerOrderId}/refund`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: midtransAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      refund_key: `refund-${Date.now()}`,
      amount: Math.floor(args.amount),
      reason: args.reason,
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Midtrans refund failed (${res.status}): ${JSON.stringify(data)}`
    );
  }
  return data;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ check admin role (recommended)
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (prof?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    const note = String(body.note ?? "");

    if (!orderId) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const service = createSupabaseService();
    const now = new Date().toISOString();

    // 1) approve cancel + restock (idempotent inside RPC)
    const { error: rpcErr } = await service.rpc("admin_approve_cancel_paid", {
      p_order_id: orderId,
      p_note: note || null,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 409 });
    }

    // 2) 🔥 ensure payment badge changes immediately
    // (your constraint allows 'refunded')
    await service
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "refunded",
        updated_at: now,
      })
      .eq("id", orderId)
      .eq("payment_status", "paid"); // guard: only flip from paid -> refunded

    // 3) refetch order for email + refund amount
    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,total,cancel_approved_email_sent_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { ok: true, warn: "approved but cannot fetch order for email/refund" },
        { status: 200 }
      );
    }

    // 4) find latest payment attempt (provider_order_id)
    const { data: pay, error: payErr } = await service
      .from("payments")
      .select("id,provider_order_id,transaction_status,gross_amount,payload")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let refundResult: any = null;
    let refundError: string | null = null;

    // 5) Try refund (best-effort)
    try {
      if (!payErr && pay?.provider_order_id) {
        const refundAmount = Number(pay.gross_amount ?? order.total ?? 0);

        refundResult = await requestMidtransRefund({
          providerOrderId: String(pay.provider_order_id),
          amount: refundAmount,
          reason: note || "Order cancelled (admin approved)",
        });

        // store refund response into payments.payload (no need orders.refund_status column)
        if (pay?.id) {
          await service
            .from("payments")
            .update({
              payload: {
                ...(pay.payload ?? {}),
                refund: {
                  requested_at: now,
                  amount: refundAmount,
                  note: note || null,
                  provider_response: refundResult,
                },
              },
              updated_at: now,
            })
            .eq("id", pay.id);
        }
      } else {
        refundError = "No provider_order_id found for refund";
      }
    } catch (e: any) {
      refundError = e?.message ?? "Refund error";
    }

    // 6) send cancel email once
    if (!order.cancel_approved_email_sent_at) {
      const { data: authUserRes, error: authErr } =
        await service.auth.admin.getUserById(String(order.user_id));

      if (!authErr) {
        const customerEmail = authUserRes?.user?.email ?? "";
        if (customerEmail) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.SITE_URL ||
            "";

          await sendOrderEmail({
            to: customerEmail,
            subject: `Order dibatalkan — ${orderId}`,
            html: cancelledEmailTemplate({
              orderId,
              appUrl,
              note: refundResult
                ? "Cancellation approved. Refund is being processed."
                : refundError
                ? `Cancellation approved. Refund issue: ${refundError}`
                : "Cancellation approved.",
            }),
          });

          await service
            .from("orders")
            .update({ cancel_approved_email_sent_at: now, updated_at: now })
            .eq("id", orderId);
        }
      }
    }

    return NextResponse.json(
      { ok: true, refundRequested: Boolean(refundResult), refundError },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}