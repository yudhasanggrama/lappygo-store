"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Eye, Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/cart.store";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { toast } from "sonner";


const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function ProductCard({ product }: { product: Product }) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { isAuthed } = useAuthUser();
  const openAuthModal = useAuthModalStore((s) => s.openModal);


  const addToCart = useCartStore((s) => s.addToCart);

  const imgSrc = useMemo(() => product.image_signed_url ?? null, [product.image_signed_url]);

  useEffect(() => {
    setImageError(false);
    setImgLoaded(false);
  }, [product.id]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthed) {
      openAuthModal(async () => {
        await addToCart(
          {
            id: product.id,
            price: product.price,
            stock: product.stock ?? 0,
            name: product.name,
            slug: product.slug,
            image: imgSrc ?? "",
          },
          1
        );
      });
      return;
    }

    setIsAdding(true);
      await new Promise((resolve) => setTimeout(resolve, 250));

      await addToCart(
        {
          id: product.id,
          price: product.price,
          stock: product.stock ?? 0,
          name: product.name,
          slug: product.slug,
          image: imgSrc ?? "",
        },
        1
      );

      setIsAdding(false);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
      toast.success("Product added to cart");
  };


  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked((v) => !v);
  };

  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <Card className={cn(
      "group relative overflow-hidden border-border bg-card",
      "transition-all duration-300 ease-out",
      "hover:-translate-y-1 hover:shadow-lg",
      "focus-within:ring-2 focus-within:ring-primary/30"
    )}>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-3 top-3 z-10 h-9 w-9 rounded-full",
            "bg-background/80 backdrop-blur-sm",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
            "transition-all duration-200",
            isLiked && "text-destructive"
          )}
          onClick={handleToggleLike}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        </Button>

        <div className="absolute left-3 top-3 z-10">
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            outOfStock ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {outOfStock ? "Out of stocks" : `Stock ${product.stock}`}
          </span>
        </div>

        <Link href={`/product/${product.slug}`} className="block">
          <div className="relative aspect-square bg-muted overflow-hidden">
            <div className={cn(
              "absolute inset-0 bg-muted transition-opacity duration-500",
              imgLoaded ? "opacity-0" : "opacity-100"
            )} />

            {!imageError && imgSrc ? (
              <Image
                src={imgSrc}
                alt={product.name}
                width={500}
                height={500}
                className={cn(
                  "h-full w-full object-cover",
                  "transition duration-500 will-change-transform",
                  "group-hover:scale-105",
                  imgLoaded ? "blur-0 scale-100" : "blur-sm scale-[1.02]"
                )}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">No image</span>
              </div>
            )}

            <div className={cn(
              "absolute inset-x-0 bottom-0 p-3",
              "bg-linear-to-t from-background/80 to-transparent",
              "hidden sm:block opacity-0 group-hover:opacity-100",
              "transition-opacity duration-200"
              )}>
                <Button
                  size="sm"
                  className="w-full"
                  variant="secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show Details
                </Button>
            </div>
          </div>
        </Link>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <Link href={`/product/${product.slug}`} className="block">
            <h2 className="line-clamp-2 font-semibold text-foreground transition-colors hover:text-primary">
              {product.name}
            </h2>
          </Link>

          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold text-foreground">{formatIDR(product.price)}</span>
            {product.brand ? (
              <span className="text-xs text-muted-foreground">{product.brand}</span>
            ) : null}
          </div>
        </div>


        <Button
          className={cn(
            "w-full transition-all duration-300",
            justAdded ? "bg-green-600 text-white hover:bg-green-600"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={handleAddToCart}
          disabled={isAdding || outOfStock}
        >
          {isAdding ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Adding...
            </div>
          ) : justAdded ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Add to Cart
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? "Out Of Stock" : "Add to Cart"}
            </div>
          )}
        </Button>

         <div className="sm:hidden flex items-center justify-center gap-2 ">
            <Button variant="outline" asChild className="w-full">
              <Link href={`/product/${product.slug}`}>
                <Eye className="mr-2 h-4 w-4" />
                Detail
              </Link>
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
