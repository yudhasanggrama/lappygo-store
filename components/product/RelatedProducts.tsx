import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/db/products";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function RelatedProducts({ relatedProducts }: { relatedProducts: Product[] }) {
  if (!relatedProducts?.length) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Related Products</h2>
        <Button variant="ghost" asChild>
          <Link href="/products" className="text-primary hover:text-primary/80">
            View All
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((p) => (
          <Card
            key={p.id}
            className="group overflow-hidden border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            {/* ✅ route dibenerin jadi /products */}
            <Link href={`/products/${p.slug}`} className="block">
              <div className="aspect-square overflow-hidden bg-muted">
                {p.image_signed_url ? (
                  <Image
                    src={p.image_signed_url}
                    alt={p.name}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">No image</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-1">
                <h3 className="font-semibold text-foreground line-clamp-1">{p.name}</h3>
                <p className="text-lg font-bold text-primary">{formatIDR(p.price)}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
