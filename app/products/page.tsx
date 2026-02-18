import ProductBrowse from "@/components/product/ProductBrowse";
import { getCategories, getProducts } from "@/lib/db/products";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = { search?: string; category?: string; sort?: string; page?: string };

export default async function ProductsPage({
    searchParams,
    }: {
    searchParams: Promise<SP>;
    }) {

    noStore();

    const sp = await searchParams;

    const page = Math.max(parseInt(sp.page ?? "1", 10) || 1, 1);

    const limit = 24;
    const offset = (page - 1) * limit;

    const [categories, products] = await Promise.all([
        getCategories(),
        getProducts({
        search: sp.search,
        category: sp.category,
        sort: sp.sort,
        limit,
        offset,
        }),
    ]);

    return (
        <div className="bg-background px-4 py-8 lg:px-8 min-h-screen">
        <ProductBrowse
            products={products}
            categories={categories}
            selectedCategory={sp.category ?? "all"}
            search={sp.search ?? ""}
            sort={sp.sort ?? "name_asc"}
            page={page}
        />
        </div>
    );
}