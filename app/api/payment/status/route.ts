// app/api/payment/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

async function midtransGetStatus(providerOrderId: string) {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const res = await fetch(`${base}/v2/${providerOrderId}/status`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Midtrans status ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function mapMidtransStatus(payload: any) {
  const tx = String(payload.transaction_status ?? "").toLowerCase();
  const fraud = String(payload.fraud_status ?? "").toLowerCase();
  const paidAt = new Date().toISOString();

  if (tx === "settlement" || tx === "success") return { status: "paid", payment_status: "paid", paid_at: paidAt };
  if (tx === "capture") {
    if (fraud && fraud !== "accept") return { status: "pending", payment_status: "unpaid", paid_at: null };
    return { status: "paid", payment_status: "paid", paid_at: paidAt };
  }
  if (tx === "expire") return { status: "expired", payment_status: "expired", paid_at: null };
  if (tx === "cancel" || tx === "deny" || tx === "failure") return { status: "cancelled", payment_status: "failed", paid_at: null };
  return { status: "pending", payment_status: "unpaid", paid_at: null };
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = String(searchParams.get("order_id") ?? "");
  if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  const service = createSupabaseService();

  const { data: order } = await service
    .from("orders")
    .select("id,user_id,payment_status,total")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (order.payment_status === "paid") {
    return NextResponse.json({ ok: true, already_paid: true }, { status: 200 });
  }

  // Use base order id without suffix for status lookup:
  // If you want: use the latest payments.provider_order_id instead.
  // Here we fetch the latest attempt and check that one.
  const { data: lastPay } = await service
    .from("payments")
    .select("provider_order_id")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const providerOrderId = String(lastPay?.provider_order_id ?? `order-${order.id}`);

  const payload = await midtransGetStatus(providerOrderId);
  const mapped = mapMidtransStatus(payload);

  await service.from("orders").update(mapped).eq("id", order.id);

  await service.from("payments").update({
    transaction_status: payload.transaction_status ?? null,
    fraud_status: payload.fraud_status ?? null,
    payment_type: payload.payment_type ?? null,
    gross_amount: Number(payload.gross_amount ?? 0),
    payload,
  }).eq("order_id", order.id).eq("provider_order_id", providerOrderId);

  return NextResponse.json({ ok: true, mapped, midtrans: payload }, { status: 200 });
}