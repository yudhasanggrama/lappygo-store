// app/api/midtrans/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendOrderEmail } from "@/lib/email/resend";
import { failedEmailTemplate, paidEmailTemplate } from "@/lib/email/template";

/**
 * Midtrans signature:
 * sha512(order_id + status_code + gross_amount + serverKey)
 */
function verifySignature(body: any) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const orderId = String(body.order_id ?? "");
  const statusCode = String(body.status_code ?? "");
  const grossAmount = String(body.gross_amount ?? "");
  const signatureKey = String(body.signature_key ?? "");

  if (!orderId || !statusCode || !grossAmount || !signatureKey) return false;

  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === signatureKey;
}

/**
 * Support:
 * - "order-<uuid>"
 * - "o-<32hex>-<suffix>" (from payment/continue)
 * - "<uuid>" (optional fallback)
 */
function extractOrderUuid(providerOrderId: string): string | null {
  const s = (providerOrderId || "").trim();

  // order-<uuid>
  let m = s.match(/^order-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/);
  if (m?.[1]) return m[1].toLowerCase();

  // o-<32hex>-<suffix>
  m = s.match(/^o-([0-9a-fA-F]{32})-/);
  if (m?.[1]) {
    const x = m[1].toLowerCase();
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }

  // raw uuid fallback
  m = s.match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/);
  if (m?.[1]) return m[1].toLowerCase();

  return null;
}

function mapMidtrans(body: any): {
  tx: string;
  fraud: string;
  isPaid: boolean;
  isFailed: boolean;
  isPending: boolean;
} {
  const tx = String(body.transaction_status ?? "").toLowerCase();
  const fraud = String(body.fraud_status ?? "").toLowerCase();

  const isPaid =
    tx === "settlement" ||
    (tx === "capture" && (!fraud || fraud === "accept")) ||
    tx === "success";

  const isFailed = tx === "deny" || tx === "expire" || tx === "cancel" || tx === "failure";
  const isPending = tx === "pending";

  return { tx, fraud, isPaid, isFailed, isPending };
}

export async function POST(req: Request) {
  const service = createSupabaseService();

  try {
    const body = await req.json();

    // 1) Verify signature
    if (!verifySignature(body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const providerOrderId = String(body.order_id ?? "");
    const orderId = extractOrderUuid(providerOrderId);

    if (!orderId) {
      // Return 200 to stop retry storm (we can't map it)
      return NextResponse.json(
        { ok: true, warning: "unmapped_order_id", providerOrderId },
        { status: 200 }
      );
    }

    const { tx, fraud, isPaid, isFailed } = mapMidtrans(body);

    // 2) Update ONLY the payment row that matches this provider_order_id
    // If you create a payment row before redirecting to Snap,
    // provider_order_id should be unique per attempt.
    const payUpdate = await service
      .from("payments")
      .update({
        transaction_status: tx || null,
        fraud_status: fraud || null,
        payment_type: body.payment_type ?? null,
        transaction_id: body.transaction_id ?? null,
        gross_amount: Number(body.gross_amount ?? 0),
        payload: body,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_order_id", providerOrderId);

    if (payUpdate.error) {
      console.warn("[midtrans webhook] payments update warning:", payUpdate.error);
      // non-fatal
    }

    // 3) Load order + profile (for email)
    const { data: orderRow, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,total,payment_status,payment_email_sent,failed_email_sent")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !orderRow) {
      // stop retry storm: order not found
      return NextResponse.json({ ok: true, warning: "order_not_found" }, { status: 200 });
    }

    const { data: profile } = await service
      .from("profiles")
      .select("email,full_name")
      .eq("id", orderRow.user_id)
      .maybeSingle();

    const to = profile?.email ?? null;
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";

    // 4) Paid branch -> RPC (single source of truth for stock + paid)
    if (isPaid) {
      const { error: rpcErr } = await service.rpc("fulfill_order_paid", {
        p_order_id: orderId,
        p_provider_order_id: providerOrderId,
        p_transaction_status: tx,
        p_fraud_status: fraud || null,
        p_payment_type: body.payment_type ?? null,
        p_gross_amount: Number(body.gross_amount ?? 0),
        p_payload: body,
      });

      if (rpcErr) {
        console.error("[midtrans webhook] fulfill_order_paid failed:", rpcErr);
        // Return 200 so Midtrans doesn't spam retries.
        // But your system should alert/log this.
        return NextResponse.json(
          { ok: true, warning: "paid_but_fulfill_failed", detail: rpcErr.message },
          { status: 200 }
        );
      }

      // send paid email once
      if (to && !orderRow.payment_email_sent) {
        await sendOrderEmail({
          to,
          subject: `Payment Success ✅ (Order ${orderId})`,
          html: paidEmailTemplate({
            orderId,
            total: orderRow.total,
            appUrl,
          }),
        });

        await service
          .from("orders")
          .update({
            payment_email_sent: true,
            payment_email_sent_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 5) Non-paid branch -> mark pending/failed, optionally release stock if you reserve earlier
    const nextPaymentStatus = isFailed ? "failed" : "unpaid";
    const nextOrderStatus = isFailed ? "cancelled" : "pending";

    await service
      .from("orders")
      .update({
        status: nextOrderStatus,
        payment_status: nextPaymentStatus,
        paid_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // send failed email once
    if (isFailed && to && !orderRow.failed_email_sent) {
      await sendOrderEmail({
        to,
        subject: `Pembayaran gagal / expired (Order ${orderId})`,
        html: failedEmailTemplate({
          orderId,
          reason: `${tx}${fraud ? ` (${fraud})` : ""}`,
          appUrl,
        }),
      });

      await service
        .from("orders")
        .update({
          failed_email_sent: true,
          failed_email_sent_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[midtrans webhook] error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}