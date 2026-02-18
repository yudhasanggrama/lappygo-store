import { createSupabaseServer } from "@/lib/supabase/server";
import AdminProductsRealtimeList from "./AdminProductsRealtimeList";

type SearchParams = Record<string, string | string[] | undefined>;

function getFirstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return (v[0] ?? "").trim();
  return (v ?? "").trim();
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createSupabaseServer();

  const sp = await searchParams;
  const q = getFirstParam(sp.q);
  const category = getFirstParam(sp.category);

  let productsQuery = supabase
    .from("products")
    .select("id,name,brand,price,stock,is_active,created_at,category_id")
    .order("created_at", { ascending: false });

  if (q) productsQuery = productsQuery.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
  if (category && isUuid(category)) productsQuery = productsQuery.eq("category_id", category);

  const [{ data: products }, { data: categories }] = await Promise.all([
    productsQuery,
    supabase.from("categories").select("id,name,slug").order("name"),
  ]);

  return (
    <AdminProductsRealtimeList
      initialProducts={(products ?? []) as any}
      categories={(categories ?? []) as any}
      q={q}
      category={category}
    />
  );
}