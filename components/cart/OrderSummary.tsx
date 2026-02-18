"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Heart, Shield, Truck } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart.store";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function OrderSummary() {
  const cart = useCartStore((s) => s.cart);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const shipping = subtotal > 500_000 ? 0 : 25_000;
  const tax = 0;
  const total = subtotal + shipping + tax;

  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({itemCount} items)
            </span>
            <span className="font-medium">{formatIDR(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {shipping === 0 ? (
                <Badge variant="secondary" className="text-xs">
                  Free
                </Badge>
              ) : (
                formatIDR(shipping)
              )}
            </span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatIDR(tax)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">
              {formatIDR(total)}
            </span>
          </div>
        </div>

        {shipping > 0 && (
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium text-accent-foreground">
                Free shipping on orders over {formatIDR(500_000)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Add {formatIDR(Math.max(0, 500_000 - subtotal))} more to qualify!
            </p>
          </div>
        )}

        <Button size="lg" className="w-full text-black" asChild>
          <Link href="/checkout" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Proceed to Checkout
          </Link>
        </Button>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure checkout</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 text-blue-500" />
            <span>Fast delivery</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-red-500" />
            <span>24/7 customer support</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}