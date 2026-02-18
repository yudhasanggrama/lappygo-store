"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import CartItem from "./CartItem";
import { useCartStore } from "@/stores/cart.store";

export default function CartItemList() {
  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clearCart);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Cart Items</CardTitle>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          disabled={cart.length === 0}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cart kamu masih kosong.</p>
        ) : (
          cart.map((item, index) => (
            <CartItem
              key={item.id} // ✅ jangan pakai index
              item={item}
              isLast={index === cart.length - 1}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}