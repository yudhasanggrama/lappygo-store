"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";

export async function clientLogout() {
  const supabase = createSupabaseBrowser();

  // ✅ bener-bener sign out session supabase di browser
  await supabase.auth.signOut();

  // ✅ bersihin auth store biar UI langsung kosong
  useAuthStore.getState().clear();

  // ✅ bersihin cart badge/state
  useCartStore.getState().clearLocalState();
}