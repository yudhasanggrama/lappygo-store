"use client";

import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart.store";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import { toast } from "sonner";

export default function AuthCartProvider() {
  const hydrate = useCartStore((s) => s.hydrate);
  const clearLocalState = useCartStore((s) => s.clearLocalState);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    const runPostLogin = async () => {
      await hydrate().catch(() => {});
      const modal = useAuthModalStore.getState();
      const hadNext = !!modal.nextAction;

      await modal.consumeNextAction();
      modal.closeModal();

      if (hadNext) toast.success("Berhasil, item ditambahkan ke cart");
    };

    const runPostLogout = () => {
      clearLocalState();
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) runPostLogin();
      else runPostLogout();
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await runPostLogin();
      else runPostLogout();
    });

    return () => sub.subscription.unsubscribe();
  }, [hydrate, clearLocalState]);

  return null;
}