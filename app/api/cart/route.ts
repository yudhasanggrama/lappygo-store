import { NextResponse } from "next/server";
import {
  fetchMyCart,
  setCartItemQty,
  removeCartItem,
  clearMyCart,
} from "@/lib/cart/cart.service";

/**
 * GET /api/cart
 */
export async function GET() {
  try {
    const data = await fetchMyCart();
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

/**
 * POST /api/cart
 * body: { productId, qty }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, qty } = body ?? {};

    if (!productId || typeof qty !== "number") {
      return NextResponse.json({ message: "INVALID_BODY" }, { status: 400 });
    }

    await setCartItemQty(productId, qty);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}

/**
 * DELETE /api/cart?productId=xxx  -> remove 1 item
 * DELETE /api/cart               -> clear all items
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (productId) {
      await removeCartItem(productId);
      return NextResponse.json({ ok: true });
    }

    await clearMyCart();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}