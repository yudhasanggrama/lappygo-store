import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import SalesChart from "@/components/admin/SalesChart";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServer();

  // ✅ last 30 days window
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);

  const startISO = start.toISOString();
  const todayYMD = ymd(end);

  // =========================
  // PARALLEL FETCH
  // =========================
  const [
    productRes,
    activeRes,
    orderTotalRes,
    orderTodayRes,

    // revenue today/month (paid orders)
    revenueTodayRes,
    revenueMonthRes,

    // chart raw orders last 30 days (paid)
    chartOrdersRes,

    // recent + low stock
    recentOrdersRes,
    lowStockRes,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),

    supabase.from("orders").select("*", { count: "exact", head: true }),

    supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", todayYMD),

    supabase.from("orders").select("total").gte("created_at", todayYMD).eq("payment_status", "paid"),

    (() => {
      const monthStart = new Date();
      monthStart.setDate(1);
      return supabase
        .from("orders")
        .select("total")
        .gte("created_at", monthStart.toISOString())
        .eq("payment_status", "paid");
    })(),

    supabase
      .from("orders")
      .select("created_at,total")
      .gte("created_at", startISO)
      .eq("payment_status", "paid"),

    supabase
      .from("orders")
      .select("id,total,status,payment_status,created_at")
      .order("created_at", { ascending: false })
      .limit(6),

    supabase
      .from("products")
      .select("id,name,stock")
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(6),
  ]);

  const productCount = productRes.count ?? 0;
  const activeCount = activeRes.count ?? 0;
  const orderCount = orderTotalRes.count ?? 0;
  const orderToday = orderTodayRes.count ?? 0;

  const revenueToday =
    revenueTodayRes.data?.reduce((a, b: any) => a + Number(b.total ?? 0), 0) ?? 0;

  const revenueMonth =
    revenueMonthRes.data?.reduce((a, b: any) => a + Number(b.total ?? 0), 0) ?? 0;

  const recentOrders = recentOrdersRes.data ?? [];
  const lowStock = lowStockRes.data ?? [];

  // =========================
  // BUILD CHART DATA (last 30 days)
  // =========================
  const baseMap = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = ymd(d);
    baseMap.set(key, { date: key, revenue: 0, orders: 0 });
  }

  for (const row of chartOrdersRes.data ?? []) {
    const key = String(row.created_at).slice(0, 10);
    const slot = baseMap.get(key);
    if (!slot) continue;
    slot.revenue += Number(row.total ?? 0);
    slot.orders += 1;
  }

  const chartData = Array.from(baseMap.values());

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Store performance overview and quick actions.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
          >
            View Products
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            View Orders
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value={productCount} hint="All items in catalog" />
        <StatCard title="Active Products" value={activeCount} hint="Visible on storefront" />
        <StatCard title="Total Orders" value={orderCount} hint="All-time" />
        <StatCard title="Orders (Today)" value={orderToday} hint="Since 00:00" />
        <StatCard title="Revenue (Today)" value={formatIDR(revenueToday)} hint="Paid orders only" />
        <StatCard title="Revenue (This Month)" value={formatIDR(revenueMonth)} hint="Paid orders only" />
      </div>

      {/* Analytics + Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Analytics chart */}
        <div className="lg:col-span-2 rounded-xl border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sales Analytics</p>
              <p className="text-xs text-muted-foreground">
                Last 30 days (paid revenue & paid orders).
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>

          <div className="mt-4">
            <SalesChart data={chartData} />
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border bg-background p-4 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-medium">Recent Activity</p>
            <p className="text-xs text-muted-foreground">
              Latest orders & low stock alerts.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Orders</p>

            {recentOrders.length === 0 ? (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">No orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Orders will appear here once customers checkout.
                </p>
              </div>
            ) : (
              recentOrders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {o.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatIDR(Number(o.total ?? 0))}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.status} • {o.payment_status}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Low Stock (≤ 5)</p>
            {lowStock.length === 0 ? (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                All stock healthy ✅
              </div>
            ) : (
              lowStock.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium line-clamp-1">{p.name}</span>
                    <span className="text-sm font-semibold text-red-600">{p.stock}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}