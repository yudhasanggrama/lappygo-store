import AdminOrderClient from "./ui";
import { createSupabaseServer } from "@/lib/supabase/server";

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 10;

async function signOrderItemImages(supabase: any, items: any[]) {
  return await Promise.all(
    (items ?? []).map(async (it) => {
      const path = it?.product?.image_url ?? null;

      if (!path || typeof path !== "string") {
        return { ...it, image_signed_url: null };
      }

      if (path.startsWith("http://") || path.startsWith("https://")) {
        return { ...it, image_signed_url: path };
      }

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGN_EXPIRES_IN);

      if (error) {
        console.error("[admin order] sign url error:", error.message, "path:", path);
        return { ...it, image_signed_url: null };
      }

      return { ...it, image_signed_url: data?.signedUrl ?? null };
    })
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {

  const { id } = await params;

  if (!id || id === "undefined") {
    return <div className="p-4">Invalid order id</div>;
  }

  const supabase = await createSupabaseServer();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderErr) return <div className="p-4">Error: {orderErr.message}</div>;
  if (!order) return <div className="p-4">Order not found</div>;

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      product_id,
      price,
      quantity,
      product:products (
        id,
        name,
        image_url
      )
    `
    )
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  if (itemsErr) return <div className="p-4">Error: {itemsErr.message}</div>;

  const signedItems = await signOrderItemImages(supabase, items ?? []);

  return <AdminOrderClient order={order} items={signedItems ?? []} />;
}