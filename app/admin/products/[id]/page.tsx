import AdminProductFormClient from "@/components/admin/admin-product-form-client";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}


const BUCKET = "product-images";
const SIGN_EXPIRES_IN = 60 * 30;


export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  if (!id || !isUuid(id)) return notFound();

  const supabase = await createSupabaseServer();

  const [{ data: product, error: productErr }, { data: categories, error: catErr }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).maybeSingle(),
      supabase.from("categories").select("*").order("name"),
    ]);

  if (productErr) throw new Error(productErr.message);
  if (catErr) throw new Error(catErr.message);
  if (!product) return notFound();

  let image_signed_url: string | null = null;

  if (product.image_url) {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(product.image_url, SIGN_EXPIRES_IN);

    if (!error) image_signed_url = data?.signedUrl ?? null;
  }

  const safeProduct = JSON.parse(JSON.stringify({ ...product, image_signed_url }));

  const safeCategories = JSON.parse(JSON.stringify(categories ?? []));

  return (
    <main className="p-6">
      <AdminProductFormClient categories={safeCategories} defaultValues={safeProduct} />
    </main>
  );
}
