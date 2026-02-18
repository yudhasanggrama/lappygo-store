import Link from "next/link";
import ProductList from "@/components/home/ProductList";
import { getCategoriesForHome, getProducts } from "@/lib/db/products";

type SP = { search?: string; category?: string; sort?: string };

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  const [categories, products] = await Promise.all([
    getCategoriesForHome(4),
    getProducts({ search: sp.search, category: sp.category, sort: sp.sort, limit: 4, offset: 0 }),
  ]);

  const qs = new URLSearchParams();
  if (sp.search) qs.set("search", sp.search);
  if (sp.category) qs.set("category", sp.category);
  if (sp.sort) qs.set("sort", sp.sort);

  const seeMoreHref = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;

  return (
    <div className="bg-background px-4 py-8 sm:py-12 lg:py-16 lg:px-8 min-h-screen">
      <div className="text-center mx-auto mb-10 space-y-3">
        <h1 className="text-primary text-4xl font-semibold tracking-tight text-balance xl:text-5xl">
          Design Your Future
        </h1>

        <p className="text-foreground text-base max-w-3xl mx-auto text-balance sm:text-lg">
          From lecture halls to creative studios, find a laptop that matches your style and fuels your inspiration without breaking the bank.
        </p>
      </div>

      <ProductList products={products} categories={categories} selectedCategory={sp.category ?? "all"} />

      <div className="mt-8 flex justify-center">
        <Link href={seeMoreHref} className="rounded-full border px-5 py-2 text-sm font-medium hover:bg-muted transition">
          See more products
        </Link>
      </div>
    </div>
  );
}