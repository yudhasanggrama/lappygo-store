import { AdminProductForm } from "@/components/admin/admin-product-form";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createSupabaseServer();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Tambah Produk</h1>
      <AdminProductForm categories={categories ?? []} />
    </main>
  );
}
