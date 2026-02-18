"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import type { Product } from "@/types/product";

type Category = { id: string; name: string; slug: string };

export default function ProductList({
  products,
  categories,
  selectedCategory,
}: {
  products: Product[];
  categories: Category[];
  selectedCategory: string; // "all" atau slug
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  const buildHref = (categorySlug: string) => {
    const params = new URLSearchParams(sp.toString());

    if (categorySlug === "all") params.delete("category");
    else params.set("category", categorySlug);

    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  };

  return (
    <div className="w-full">
      {/* category bar (tokopedia-ish, tapi clean) */}
      <div className="mb-6 flex justify-center">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* semua */}
          <Link
            href={buildHref("all")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted text-muted-foreground"
            )}
          >
            All Categories
          </Link>

          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref(c.slug)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                selectedCategory === c.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted text-muted-foreground"
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* grid (responsif & aman) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {!products.length && (
        <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Produk tidak ditemukan.</p>
        </div>
      )}
    </div>
  );
}
