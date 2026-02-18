// app/api/payment/continue/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { createMidtransSnap } from "@/lib/midtrans";

function buildProviderOrderId(appOrderId: string) {
  // Midtrans order_id max length ~ 50 chars
  // UUID 36 => compact 32
  const compact = appOrderId.replaceAll("-", ""); // 32 chars
  const suffix = Date.now().toString(36); // shorter than number
  // Example: o-<32>-<8~10> => ~44 chars
  return `o-${compact}-${suffix}`;
}

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

    const body = await req.json();
    const orderId = String(body.order_id ?? "");
    const force = Boolean(body.force ?? false);

    if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });

    const service = createSupabaseService();

    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id,user_id,total,payment_status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (order.payment_status === "paid") {
      return NextResponse.json({ paid: true }, { status: 200 });
    }

    // latest payment attempt
    const { data: pay, error: payErr } = await service
      .from("payments")
      .select("id,provider_order_id,payload,transaction_status,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payErr) {
      console.error("[payment/continue] read payments error", payErr);
    }

    const existingToken = (pay as any)?.payload?.token ?? null;
    const existingRedirect = (pay as any)?.payload?.redirect_url ?? null;

    // reuse old token if available and not forcing
    if (existingToken && !force) {
      return NextResponse.json(
        { paid: false, order_id: order.id, snap_token: existingToken, redirect_url: existingRedirect },
        { status: 200 }
      );
    }

    // load items for Snap
    const { data: items, error: itemsErr } = await service
      .from("order_items")
      .select("product_id,name,price,quantity")
      .eq("order_id", order.id);

    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    if (!items || items.length === 0) return NextResponse.json({ error: "Order items empty" }, { status: 400 });

    const itemsTotal = items.reduce((sum: number, i: any) => sum + Number(i.price) * Number(i.quantity), 0);
    const orderTotal = Number(order.total);

    // IMPORTANT: Midtrans often expects gross_amount to match sum(item_details)
    // If your order.total includes shipping/admin fee, add the difference as an item.
    const itemDetails = (items ?? []).map((i: any) => ({
      id: i.product_id,
      price: Number(i.price),
      quantity: Number(i.quantity),
      name: String(i.name).substring(0, 50),
    }));

    const diff = orderTotal - itemsTotal;
    if (diff !== 0) {
      itemDetails.push({
        id: diff > 0 ? "fee" : "discount",
        price: diff,
        quantity: 1,
        name: diff > 0 ? "Shipping/Fee" : "Discount",
      });
    }

    const providerOrderId = buildProviderOrderId(order.id);

    const snap = await createMidtransSnap({
      providerOrderId,
      grossAmount: orderTotal,
      customer: {
        first_name: (user.email || "Customer").split("@")[0],
        email: user.email || "",
        phone: "",
      },
      items: itemDetails,
    });

    const { error: insErr } = await service.from("payments").insert({
      order_id: order.id,
      provider: "midtrans",
      provider_order_id: providerOrderId,
      gross_amount: orderTotal,
      transaction_status: "pending",
      payload: snap,
    });

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json(
      { paid: false, order_id: order.id, snap_token: snap.token, redirect_url: snap.redirect_url },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[payment/continue] error", {
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}