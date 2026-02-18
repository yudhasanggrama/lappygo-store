import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type Product = {
  created_at?: any;
  updated_at?: any;
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;          // PATH: products/xxx.jpg
  image_signed_url?: string | null;  // SIGNED URL
  is_active: boolean;
  category_id: string | null;
};

function normalizeStoragePath(p: string) {
  let s = p.trim();

  // kalau kebetulan nyimpan URL full, ambil bagian setelah bucket
  const marker = `${BUCKET}/`;
  const idx = s.indexOf(marker);
  if (idx !== -1) s = s.slice(idx + marker.length);

  // hapus leading slash
  s = s.replace(/^\/+/, "");

  return s;
}


const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 30; // 30 menit (lebih nyaman buat browsing)

async function signImagePaths<T extends { image_url: string | null }>(
  rows: T[]
): Promise<(T & { image_signed_url: string | null })[]> {
  const admin = createSupabaseAdmin();

  return await Promise.all(
    rows.map(async (row) => {
      if (!row.image_url) return { ...row, image_signed_url: null };

      const path = normalizeStoragePath(row.image_url);

      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGN_EXPIRES_IN);

      if (error) {
        console.warn("createSignedUrl error:", error.message, { raw: row.image_url, path });
        return { ...row, image_signed_url: null };
      }

      return { ...row, image_signed_url: data?.signedUrl ?? null };
    })
  );
}


export async function getCategories() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCategoriesForHome(limit = 6) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getProducts(params: {
    search?: string;
    category?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }) {
    const supabase = await createSupabaseServer();

    const limit = params.limit ?? 24;
    const offset = params.offset ?? 0;

    let query = supabase
      .from("products")
      .select("id,name,slug,brand,description,price,stock,image_url,is_active,category_id")
      .eq("is_active", true);

    // ✅ search lebih bagus: name OR brand
    if (params.search) {
      const q = params.search.trim();
      if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
    }

    if (params.category && params.category !== "all") {
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", params.category)
        .maybeSingle();

      if (catErr) throw catErr;
      if (cat?.id) query = query.eq("category_id", cat.id);
    }

    if (params.sort === "price_asc") query = query.order("price", { ascending: true });
    else if (params.sort === "price_desc") query = query.order("price", { ascending: false });
    else query = query.order("name", { ascending: true });

    // ✅ pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    return await signImagePaths((data ?? []) as Product[]);
}


export async function getProductBySlug(slug: string) {
  const supabase = await createSupabaseServer();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  const [signed] = await signImagePaths([product as Product]);
  return signed;
}


export async function getRelatedProducts(params: {
  currentProductId: string;
  categoryId?: string | null;
  limit?: number;
}) {
  const supabase = await createSupabaseServer();
  const limit = params.limit ?? 4;

  let q = supabase
    .from("products")
    .select("id,name,slug,brand,description,price,stock,image_url,category_id,is_active")
    .eq("is_active", true)
    .neq("id", params.currentProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.categoryId) q = q.eq("category_id", params.categoryId);

  const { data, error } = await q;
  if (error) throw error;

  return await signImagePaths((data ?? []) as Product[]);
}
