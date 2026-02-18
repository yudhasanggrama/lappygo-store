import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import RealtimeAdminOrdersClient from "./ui";
import PaymentStatusBadge from "@/components/order/PaymentStatusBadge";

const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 10;

type SearchParams = {
  status?: string;
  payment?: string;
  q?: string;
  page?: string;
};

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrdersPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const page = Number(params.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServer();
  const service = createSupabaseService();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return <div className="p-4">Unauthorized</div>;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (me?.role !== "admin") return <div className="p-4">Forbidden</div>;

  let q = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      payment_status,
      total,
      created_at,
      user_id,
      order_items (
        id,
        name,
        image_url,
        quantity
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.status) q = q.eq("status", params.status);
  if (params.payment) q = q.eq("payment_status", params.payment);
  if (params.q) q = q.ilike("id", `%${params.q}%`);

  const { data: orders, count } = await q;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // =====================
  // LOAD BUYER
  // =====================
  const userIds = Array.from(
    new Set((orders ?? []).map((o: any) => o.user_id).filter(Boolean))
  ) as string[];

  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name ?? "Customer");
    }
  }

  async function signPath(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_EXPIRES_IN);
    return data?.signedUrl ?? null;
  }

  const rows = await Promise.all(
    (orders ?? []).map(async (o: any) => {
      const items = o.order_items ?? [];
      const first = items[0] ?? null;

      return {
        ...o,
        buyer: profileMap.get(o.user_id) ?? "Customer",
        first,
        img: await signPath(first?.image_url ?? null),
        count: items.length,
      };
    })
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin Orders</h1>

      <RealtimeAdminOrdersClient />

      <div className="space-y-3">
        {rows.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="block border rounded-lg p-3 hover:bg-muted/30"
          >
            <div className="flex gap-3">
              <div className="relative w-16 h-16 bg-muted rounded">
                {o.img && (
                  <Image
                    src={o.img}
                    alt=""
                    fill
                    className="object-cover rounded"
                    unoptimized
                  />
                )}
              </div>

              <div className="flex-1">
                <div className="font-mono text-sm">{o.id}</div>
                <div className="text-xs text-muted-foreground">
                  Buyer: {o.buyer}
                </div>

                <div className="font-semibold text-sm">
                  {o.first?.name ?? "Items"}
                </div>

                <div className="text-sm mt-1">
                  Rp {Number(o.total).toLocaleString("id-ID")}
                </div>
              </div>

              {/* BADGES */}
              <div className="flex flex-col items-end gap-1">
                <OrderStatusBadge status={o.status} />
                <PaymentStatusBadge status={o.payment_status} />
                <div className="text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("id-ID")}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex gap-2 justify-center pt-4">
        {page > 1 && <Link href={`?page=${page - 1}`}>Prev</Link>}
        <div>
          Page {page} / {totalPages || 1}
        </div>
        {page < totalPages && <Link href={`?page=${page + 1}`}>Next</Link>}
      </div>
    </div>
  );
}