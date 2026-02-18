"use client";

import CartItemList from "@/components/cart/CartItemList";
import EmptyCart from "@/components/cart/EmptyCart";
import OrderSummary from "@/components/cart/OrderSummary";
import Recommendations from "@/components/cart/Recommendations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function Cart() {
  const cart = useCartStore((s) => s.cart);
  const itemCount = useCartStore((s) => s.itemCount)();
  const setStock = useCartStore((s) => s.setStock);
  
  useEffect(() => {
    if (!cart.length) return;

    const supabase = createSupabaseBrowser();

    const channels = cart.map((item) => {
      const ch = supabase
        .channel(`cart-stock-${item.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${item.id}` },
          (payload) => {
            const next = payload.new as any;
            if (typeof next.stock === "number") setStock(item.id, next.stock);
          }
        )
        .subscribe();

      return ch;
    });

    return () => {
      channels.forEach((ch) => ch.unsubscribe()); // ✅ lebih aman dari removeChannel saat connect belum siap
    };
  }, [cart.length, setStock]);

  if (cart.length === 0) return <EmptyCart />;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
          <p className="text-muted-foreground mt-2">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CartItemList />
        </div>

        <div className="lg:col-span-1">
          <OrderSummary />
        </div>
      </div>

      <Recommendations />
    </div>
  );
}
