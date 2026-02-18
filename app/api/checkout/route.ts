// app/api/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { createMidtransSnap } from "@/lib/midtrans";

type CartItemInput = { product_id: string; quantity: number };

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items = (body.items ?? []) as CartItemInput[];
    const shipping = body.shipping ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const service = createSupabaseService();
    const productIds = items.map((i) => i.product_id);

    // 1. Ambil data produk terbaru & Profile secara paralel
    const [productsRes, profileRes] = await Promise.all([
      service
        .from("products")
        .select("id, name, price, stock, image_url, is_active")
        .in("id", productIds),
      service
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    ]);

    if (productsRes.error) throw productsRes.error;
    
    const products = productsRes.data ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Validasi stok & Inactive products
    let subtotal = 0;
    for (const item of items) {
      const p = productMap.get(item.product_id);
      if (!p || !p.is_active) {
        return NextResponse.json({ error: `Product ${p?.name || 'unknown'} is no longer available` }, { status: 400 });
      }
      if (p.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${p.name}. Available: ${p.stock}` }, { status: 400 });
      }
      subtotal += p.price * item.quantity;
    }

    const shippingFee = subtotal > 500_000 ? 0 : 25_000;
    const total = subtotal + shippingFee;

    // 3. Insert Order & Order Items dalam satu alur
    // Tips: Gunakan rpc jika ingin memastikan stok berkurang saat ini juga (reserve stock)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        payment_status: "unpaid",
        subtotal,
        shipping_fee: shippingFee,
        total,
      })
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    const orderItems = items.map((it) => {
      const p = productMap.get(it.product_id)!;
      return {
        order_id: order.id,
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        quantity: it.quantity,
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);

    if (itemsErr) {
      await service.from("orders").delete().eq("id", order.id); // Rollback
      throw itemsErr;
    }

    // 4. Integrasi Midtrans
    const providerOrderId = `order-${order.id}`;
    const snap = await createMidtransSnap({
      providerOrderId,
      grossAmount: total,
      customer: {
        first_name: (shipping.name || profileRes.data?.full_name || "Customer").split(" ")[0],
        email: shipping.email || user.email || "",
        phone: shipping.phone || "",
      },
      items: orderItems.map((oi) => ({
        id: oi.product_id,
        price: oi.price,
        quantity: oi.quantity,
        name: oi.name.substring(0, 50), // Midtrans limit 50 chars
      })),
    });

    // 5. Audit Payment
    await supabase.from("payments").insert({
      order_id: order.id,
      provider: "midtrans",
      provider_order_id: providerOrderId,
      gross_amount: total,
      transaction_status: "pending",
      payload: snap,
    });

    return NextResponse.json({
      order_id: order.id,
      snap_token: snap.token,
      redirect_url: snap.redirect_url,
    });

  } catch (e: any) {
    console.error("Checkout Error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 }
    );
  }
}