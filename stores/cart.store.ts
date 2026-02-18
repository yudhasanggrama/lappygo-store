"use client";

import { create } from "zustand";

export type AddToCartPayload = {
  id: string;
  price: number;
  stock?: number;
  name?: string;
  slug?: string;
  image?: string;
};

export type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  qty: number;
  stock: number;

  image_path: string | null;
  image_url: string | null; // signed url
  brand?: string;
};

type CartState = {
  cart: CartItem[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  clearLocalState: () => void;

  addToCart: (p: AddToCartPayload, addQty?: number) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  setStock: (productId: string, stock: number) => void;

  itemCount: () => number;
  subtotal: () => number;
};

async function apiGetCart() {
  const res = await fetch("/api/cart", { method: "GET", credentials: "include" });
  if (res.status === 401) return { items: [] };
  if (!res.ok) throw new Error("FETCH_CART_FAILED");
  return res.json();
}

async function apiSetQty(productId: string, qty: number, price: number) {
  const res = await fetch("/api/cart", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, qty, price }),
  });

  if (res.status === 401) throw new Error("LOGIN_REQUIRED");

  if (!res.ok) {
    let msg = "SET_QTY_FAILED";
    try {
      const data = await res.json();
      msg = data?.message ? `${msg}: ${data.message}` : msg;
    } catch {}
    throw new Error(msg);
  }
}

async function apiRemove(productId: string) {
  const res = await fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("REMOVE_FAILED");
}

/** ✅ NEW: clear all items (server-side) */
async function apiClearCart() {
  const res = await fetch("/api/cart", {
    method: "DELETE", // tanpa productId
    credentials: "include",
  });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("CLEAR_CART_FAILED");
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  hydrated: false,

  clearLocalState: () => set({ cart: [], hydrated: false }),

  hydrate: async () => {
    const data = await apiGetCart();

    const items: CartItem[] = (data.items ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      brand: row.brand ?? undefined,
      price: row.price,
      stock: row.stock ?? 0,
      qty: row.qty ?? 0,
      image_path: row.image_path ?? null,
      image_url: row.image_signed_url ?? null,
    }));

    set({ cart: items, hydrated: true });
  },

  addToCart: async (p, addQty = 1) => {
    const existing = get().cart.find((x) => x.id === p.id);
    const baseNextQty = (existing?.qty ?? 0) + Math.max(1, addQty);

    const nextQty =
      typeof p.stock === "number"
        ? Math.min(baseNextQty, Math.max(0, p.stock))
        : baseNextQty;

    await apiSetQty(p.id, nextQty, p.price);
    await get().hydrate();
  },

  updateQty: async (productId, qty) => {
    const item = get().cart.find((x) => x.id === productId);
    const price = item?.price ?? 0;

    await apiSetQty(productId, Math.max(1, qty), price);
    await get().hydrate();
  },

  setStock: (productId, stock) => {
    set((state) => ({
      cart: state.cart.map((it) => {
        if (it.id !== productId) return it;

        const safeStock = Math.max(0, stock);
        const safeQty = Math.min(it.qty, safeStock);
        return { ...it, stock: safeStock, qty: safeQty };
      }),
    }));
  },

  remove: async (productId) => {
    await apiRemove(productId);
    await get().hydrate();
  },

  /** ✅ clear cart: 1 request, UI langsung kosong */
  clearCart: async () => {
    await apiClearCart();
    set({ cart: [], hydrated: true });
    // optional:
    // await get().hydrate();
  },

  itemCount: () => get().cart.reduce((a, c) => a + c.qty, 0),
  subtotal: () => get().cart.reduce((a, c) => a + c.price * c.qty, 0),
}));