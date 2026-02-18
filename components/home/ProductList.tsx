"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import type { Product } from "@/types/product";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

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
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const sessionId = useMemo(() => Math.random().toString(36).slice(2), []);

  const [isPending, startTransition] = useTransition();
  const [rtSyncing, setRtSyncing] = useRefState(false);

  const isMountedRef = useRef(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshAtRef = useRef<number>(0);

  // build href for category tabs
  const buildHref = useCallback(
    (categorySlug: string) => {
      const params = new URLSearchParams(sp.toString());

      if (categorySlug === "all") params.delete("category");
      else params.set("category", categorySlug);

      return params.toString() ? `${pathname}?${params.toString()}` : pathname;
    },
    [sp, pathname]
  );

  // safe refresh (debounced + visibility guard)
  const safeRefresh = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible")
      return;
    if (!isMountedRef.current) return;

    // throttle: minimal jarak antar refresh
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 800) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      lastRefreshAtRef.current = Date.now();

      // show small syncing indicator
      setRtSyncing(true);

      startTransition(() => {
        router.refresh();

        // hide indicator shortly after transition
        setTimeout(() => {
          if (isMountedRef.current) setRtSyncing(false);
        }, 800);
      });
    }, 250);
  }, [router, startTransition, setRtSyncing]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ✅ realtime subscriptions
  useEffect(() => {
    const chProducts = supabase
      .channel(`rt-products-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => safeRefresh()
      )
      .subscribe();

    const chCategories = supabase
      .channel(`rt-categories-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => safeRefresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chProducts);
      supabase.removeChannel(chCategories);
    };
  }, [supabase, sessionId, safeRefresh]);

  return (
    <div className="w-full">
      {/* category bar */}
      <div className="mb-6 flex justify-center">
        <div className="flex gap-2 overflow-x-auto pb-2 items-center">
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

          {(rtSyncing || isPending) && (
            <Badge variant="outline" className="ml-2 h-8 animate-pulse">
              Syncing...
            </Badge>
          )}
        </div>
      </div>

      {/* grid */}
      <div className={cn(isPending && "opacity-60 pointer-events-none")}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {!products.length && (
          <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Produk tidak ditemukan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * small helper hook: like useState but stored in ref to avoid stale closures
 */
function useRefState<T>(initial: T): [T, (v: T) => void] {
  const [state, setState] = useTransitionState(initial);
  return [state, setState];
}

function useTransitionState<T>(initial: T): [T, (v: T) => void] {
  const [value, setValue] = ReactUseStateShim(initial);
  return [value, setValue];
}

// minimal shim to avoid extra imports in snippet
function ReactUseStateShim<T>(initial: T): [T, (v: T) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useState<T>(initial);
}
