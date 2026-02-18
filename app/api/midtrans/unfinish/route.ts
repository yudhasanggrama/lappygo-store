export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dest = new URL(`/orders`, url.origin);
  dest.searchParams.set("from", "midtrans_unfinish");
  return NextResponse.redirect(dest, { status: 303 });
}

export async function POST(req: Request) {
  return GET(req);
}