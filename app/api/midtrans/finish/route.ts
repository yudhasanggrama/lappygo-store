export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

async function getOrderId(req: Request) {
  // 1) coba ambil dari query string
  const url = new URL(req.url);
  const qOrderId =
    url.searchParams.get("order_id") ||
    url.searchParams.get("orderId") ||
    url.searchParams.get("id");
  if (qOrderId) return qOrderId;

  // 2) coba ambil dari body (Midtrans kadang kirim x-www-form-urlencoded)
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      return body?.order_id || body?.orderId || null;
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return params.get("order_id") || params.get("orderId") || null;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function GET(req: Request) {
  const orderId = await getOrderId(req);
  const url = new URL(req.url);

  // arahkan ke halaman yang kamu mau
  const dest = new URL(
    orderId ? `/orders/${orderId}` : `/orders`,
    url.origin
  );
  dest.searchParams.set("from", "midtrans_finish");

  return NextResponse.redirect(dest, { status: 303 });
}

export async function POST(req: Request) {
  return GET(req);
}