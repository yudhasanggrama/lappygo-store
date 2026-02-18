export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 10;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const service = createSupabaseService();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      id,status,payment_status,total,created_at,user_id,
      order_items ( id,name,image_url,quantity )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // buyer
  const { data: profile } = await service
    .from("profiles")
    .select("full_name")
    .eq("id", order.user_id)
    .maybeSingle();

  const items = (order as any).order_items ?? [];
  const first = items[0] ?? null;

  let img: string | null = null;
  if (first?.image_url) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(first.image_url, SIGN_EXPIRES_IN);
    img = data?.signedUrl ?? null;
  }

  return NextResponse.json({
    ...order,
    buyer: profile?.full_name ?? "Customer",
    first,
    img,
    count: items.length,
  });
}