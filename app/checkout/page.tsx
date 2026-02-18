"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const cart = useCartStore((s) => s.cart);
  const hydrated = useCartStore((s) => s.hydrated);
  const hydrate = useCartStore((s) => s.hydrate);
  const clearCart = useCartStore((s) => s.clearCart);

  const [loading, setLoading] = useState(false);
  const [shipping, setShipping] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Hitung Summary (Client side hanya untuk tampilan)
  const subtotal = cart.reduce((sum, it) => sum + it.price * it.qty, 0);
  const shipping_fee = subtotal > 500_000 ? 0 : 25_000;
  const tax = 0
  const total = subtotal + shipping_fee + tax;

  useEffect(() => {
    if (!hydrated) hydrate().catch(() => {});
  }, [hydrated, hydrate]);

  const finalizeOrder = async (orderId: string) => {
    try {
      // Pastikan keranjang bersih sebelum pindah halaman
      await (clearCart as any)();
    } finally {
      router.push(`/orders/${orderId}/confirmation`);
    }
  };

  async function handlePay() {
    // Validasi input sederhana
    if (!shipping.name || !shipping.email || !shipping.address) {
      alert("Mohon isi data pengiriman dengan lengkap.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/checkout");
        return;
      }

      const items = cart.map((it) => ({
        product_id: it.id,
        quantity: it.qty,
      }));

      if (items.length === 0) {
        alert("Keranjang belanja kosong.");
        router.push("/cart");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shipping }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Gagal memproses pesanan");

      const { order_id, snap_token } = json;

      const w = window as any;
      if (!w.snap) {
        throw new Error("Sistem pembayaran belum siap. Silakan refresh halaman.");
      }

      w.snap.pay(snap_token, {
        onSuccess: () => finalizeOrder(order_id),
        onPending: () => finalizeOrder(order_id),
        onError: () => finalizeOrder(order_id),
        onClose: () => {
          setLoading(false);
          finalizeOrder(order_id);
        },
      });
    } catch (e: any) {
      alert(e?.message ?? "Terjadi kesalahan sistem");
      setLoading(false);
    }
  }

  const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl space-y-6">
      <Script
        src={
          isProd
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />

      <div>
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground mt-1">
          Isi data pengiriman, lalu lanjut pembayaran via Midtrans Sandbox.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Full name"
              value={shipping.name}
              onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={shipping.email}
              onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={shipping.phone}
              onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
            />
            <Textarea
              placeholder="Address"
              value={shipping.address}
              onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
            />
          </CardContent>
        </Card>

        <Card className="md:sticky md:top-4 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">{formatIDR(shipping_fee)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">{formatIDR(tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatIDR(total)}</span>
            </div>

            <Button
              className="w-full text-black"
              size="lg"
              disabled={loading || cart.length === 0}
              onClick={handlePay}
            >
              {loading ? "Processing..." : "Pay with Midtrans"}
            </Button>

            {cart.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cart kosong. Kembali ke cart.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}