import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/server";
import RealtimeOrderClient from "./ui";
import BackButton from "./BackButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 10; // 10 menit

type Params = { id: string };

export default async function ConfirmationPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { id } = await Promise.resolve(params);

  const supabase = await createSupabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const userId = userRes.user.id;

  // 🔒 validate order milik user
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderErr) return <div className="p-4">Error: {orderErr.message}</div>;
  if (!order) return <div className="p-4">Order not found</div>;

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  if (itemsErr) return <div className="p-4">Error: {itemsErr.message}</div>;

  // 🔐 helper sign image
  async function sign(path: string | null) {
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_EXPIRES_IN);

    if (error) return null;
    return data.signedUrl;
  }

  // sign semua image item
  const itemsWithSigned = await Promise.all(
    (items ?? []).map(async (it: any) => ({
      ...it,
      image_signed: await sign(it.image_url),
    }))
  );

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
          <BackButton fallbackHref="/my-order" />
          <h1 className="text-xl font-semibold">Order Confirmation</h1>
      </div>

      <div className="border rounded-lg p-3">
        <div className="text-sm text-muted-foreground">Order ID</div>
        <div className="font-mono">{order.id}</div>
        <div className="text-sm text-muted-foreground">
          Total: Rp {Number(order.total ?? 0).toLocaleString("id-ID")}
        </div>
        <div className="text-sm text-muted-foreground">
          Payment: {order.payment_status}
        </div>
      </div>

      <RealtimeOrderClient orderId={order.id} initialOrder={order} />

      {/* items */}
      <div className="border rounded-lg p-3 space-y-3">
        <div className="font-medium">Items</div>

        {itemsWithSigned.map((it: any) => (
          <div key={it.id} className="flex gap-3 items-center">
            {/* image */}
            <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted">
              {it.image_signed ? (
                <Image
                  src={it.image_signed}
                  alt={it.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </div>

            {/* info */}
            <div className="flex-1 text-sm">
              <div className="font-medium">{it.name}</div>
              <div className="text-muted-foreground">
                {it.quantity} x Rp {Number(it.price).toLocaleString("id-ID")}
              </div>
            </div>

            {/* total */}
            <div className="text-sm font-medium">
              Rp {(it.price * it.quantity).toLocaleString("id-ID")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}