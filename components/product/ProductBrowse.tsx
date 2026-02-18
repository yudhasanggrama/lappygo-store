"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, CheckCircle2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Product } from "@/lib/db/products";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";

type Category = { id: string; name: string; slug: string };

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ProductBrowse({
  products,
  categories,
  selectedCategory,
  search,
  sort,
  page,
}: {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  search: string;
  sort: string;
  page: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // --- 1) REFS & STABLE IDS ---
  const isMountedRef = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adminAddingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useMemo(() => Math.random().toString(36).slice(2), []);

  // --- 2) STATE ---
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ✅ indicator when a new product is inserted (e.g., by admin)
  const [adminAdding, setAdminAdding] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);

  const addToCart = useCartStore((s) => s.addToCart);
  const user = useAuthStore((s) => s.user);
  const openModal = useAuthModalStore((s) => s.openModal);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  // --- 3) LIFECYCLE ---
  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);

    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (adminAddingTimerRef.current) clearTimeout(adminAddingTimerRef.current);
    };
  }, []);

  // keep local state in sync with server props (after router.refresh)
  useEffect(() => {
    setLocalCategories(categories);
    setLocalProducts(products);
  }, [categories, products]);

  // --- 4) QUERY HELPERS ---
  const setQuery = useCallback(
    (next: Record<string, string | undefined>) => {
      const qs = new URLSearchParams(sp.toString());

      Object.entries(next).forEach(([k, v]) => {
        if (!v || v === "all" || v === "") qs.delete(k);
        else qs.set(k, v);
      });

      // reset pagination on filter changes
      if (
        next.category !== undefined ||
        next.sort !== undefined ||
        next.search !== undefined
      ) {
        qs.delete("page");
      }

      router.push(`${pathname}${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    [sp, router, pathname]
  );

  // --- 5) DATA HELPERS ---
  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[categories] load error:", error.message);
      return;
    }

    if (data && isMountedRef.current) setLocalCategories(data as any);
  }, [supabase]);

  const safeRefresh = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible")
      return;
    if (!isMountedRef.current || isPending || syncing) return;

    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    refreshTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      setSyncing(true);
      startTransition(() => {
        router.refresh();

        setTimeout(() => {
          if (!isMountedRef.current) return;

          setSyncing(false);

          // ✅ if the "adminAdding" badge is shown, hide it shortly after refresh ends
          if (adminAddingTimerRef.current) clearTimeout(adminAddingTimerRef.current);
          adminAddingTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setAdminAdding(false);
          }, 600);
        }, 1200);
      });
    }, 600);
  }, [router, isPending, syncing]);

  // --- 6) REALTIME (hook stays) ---
  useResilientRealtime(
    `prod-${sessionId}`,
    { event: "*", schema: "public", table: "products" },
    safeRefresh,
    {
      enabled: mounted,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  useResilientRealtime(
    `cat-${sessionId}`,
    { event: "*", schema: "public", table: "categories" },
    loadCategories,
    {
      enabled: mounted,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  // ✅ Option A: listen specifically for INSERT events and show a lightweight loading badge
  useEffect(() => {
    if (!mounted) return;

    const ch = supabase
      .channel(`prod-insert-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        () => {
          setAdminAdding(true);

          // keep the badge visible long enough to be noticed (prevents flicker)
          if (adminAddingTimerRef.current) clearTimeout(adminAddingTimerRef.current);
          adminAddingTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setAdminAdding(false);
          }, 4000);

          safeRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [mounted, supabase, sessionId, safeRefresh]);

  // --- 7) CART ACTIONS ---
  const doAddToCart = useCallback(
    async (p: Product) => {
      if (p.stock <= 0 || loadingId === p.id) return;

      setLoadingId(p.id);
      await new Promise((r) => setTimeout(r, 250));

      addToCart(
        {
          id: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          image: p.image_signed_url || "/placeholder-product.png",
          stock: p.stock,
        },
        1
      );

      setLoadingId(null);
      setAddedId(p.id);

      setTimeout(() => {
        if (isMountedRef.current) setAddedId(null);
      }, 1200);
    },
    [addToCart, loadingId]
  );

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>, p: Product) => {
      e.preventDefault();
      e.stopPropagation();
      if (p.stock <= 0) return;

      if (!user?.email) {
        openModal(async () => {
          await doAddToCart(p);
        });
        return;
      }

      await doAddToCart(p);
    },
    [user?.email, openModal, doAddToCart]
  );

  // --- 8) MEMO ---
  const categoryItems = useMemo(
    () => [{ id: "all", name: "All Products", slug: "all" }, ...localCategories],
    [localCategories]
  );

  const activeCategory = selectedCategory || "all";

  // --- 9) UI FALLBACK ---
  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="h-8 w-44 rounded bg-muted animate-pulse" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl border bg-background animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // --- 10) RENDER ---
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Products
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              Find the best smartphones.
            </p>

            {(syncing || isPending) && (
              <Badge
                variant="outline"
                className="animate-pulse text-[10px] py-0 h-5"
              >
                Syncing...
              </Badge>
            )}

            {adminAdding && (
              <Badge
                variant="outline"
                className="animate-pulse text-[10px] py-0 h-5"
              >
                New product detected... updating
              </Badge>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          {/* Mobile/Tablet category */}
          <div className="lg:hidden">
            <Select
              value={activeCategory}
              onValueChange={(v) => setQuery({ category: v })}
            >
              <SelectTrigger className="w-full sm:w-[220px] rounded-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={sort || "name_asc"}
            onValueChange={(v) => setQuery({ sort: v })}
          >
            <SelectTrigger className="w-full sm:w-[220px] rounded-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-5 lg:gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl border bg-background p-4 sticky top-24">
            <div className="text-sm font-semibold mb-3">Categories</div>
            <div className="space-y-1">
              {categoryItems.map((c) => {
                const active = activeCategory === c.slug;
                return (
                  <button
                    key={c.id}
                    onClick={() => setQuery({ category: c.slug })}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-muted font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {c.name}
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Products */}
        <section>
          {localProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-10 sm:p-16 text-center">
              <p className="text-muted-foreground">No products found.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {localProducts.map((p, index) => (
                <div
                  key={p.id}
                  className="group relative flex flex-col rounded-2xl border bg-background p-2 sm:p-3 transition-all hover:shadow-md"
                >
                  <Link
                    href={`/product/${p.slug}`}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={p.image_signed_url || "/placeholder-product.png"}
                      alt={p.name}
                      fill
                      priority={index < 4}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {p.stock <= 0 && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Badge variant="destructive">Sold Out</Badge>
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col pt-2 sm:pt-3">
                    <h3 className="line-clamp-1 text-sm sm:text-[15px] font-medium">
                      {p.name}
                    </h3>

                    <p className="mt-1 text-base sm:text-lg font-bold text-primary">
                      Rp {formatIDR(p.price)}
                    </p>

                    <div className="mt-auto pt-3 flex gap-2">
                      <Button
                        size="sm"
                        className={cn(
                          "flex-1 rounded-xl transition-all duration-300 h-10 sm:h-9",
                          addedId === p.id
                            ? "bg-green-600 text-white hover:bg-green-600"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={(e) => handleAddToCart(e, p)}
                        disabled={loadingId === p.id || p.stock <= 0}
                      >
                        {loadingId === p.id ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Adding...</span>
                          </div>
                        ) : addedId === p.id ? (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Add</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span>{p.stock <= 0 ? "Out of stock" : "Add"}</span>
                          </div>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl flex-1 h-10 sm:h-9"
                        asChild
                      >
                        <Link href={`/product/${p.slug}`}>Details</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}