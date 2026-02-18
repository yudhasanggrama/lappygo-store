"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthModalStore } from "@/stores/auth-modal.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import GoogleIcon from "../icons/google-icon";

export default function AuthModal() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const pathname = usePathname();

  const open = useAuthModalStore((s) => s.open);
  const closeModal = useAuthModalStore((s) => s.closeModal);
  const consumeNextAction = useAuthModalStore((s) => s.consumeNextAction);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ penanda: setelah login sukses, kita jalankan nextAction sekali saat SIGNED_IN
  const shouldConsumeRef = useRef(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        // close & reset selalu, biar sinkron dengan header/bottombar
        closeModal();
        resetForm();

        // jalankan aksi yang tertahan (add to cart, dsb) hanya kalau diminta
        if (shouldConsumeRef.current) {
          shouldConsumeRef.current = false;
          try {
            await consumeNextAction();
          } catch (e: any) {
            toast.error(e?.message ?? "Action failed");
          }
        }

        router.refresh();
      }

      if (event === "SIGNED_OUT") {
        // optional: kalau user logout, pastikan modal bersih
        shouldConsumeRef.current = false;
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, closeModal, consumeNextAction, router]);

  const loginEmail = async () => {
    const e = email.trim();
    if (!e || !password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Berhasil login");

    // ✅ biar nextAction jalan setelah session benar-benar aktif
    shouldConsumeRef.current = true;

    // NOTE:
    // - Jangan closeModal di sini (biarkan SIGNED_IN handler yang close),
    //   supaya alurnya konsisten juga untuk Google OAuth.
  };

  const loginGoogle = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          pathname || "/"
        )}`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Google OAuth akan redirect → setelah balik, SIGNED_IN handler yang close + consume
    shouldConsumeRef.current = true;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          shouldConsumeRef.current = false;
          closeModal();
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login untuk lanjut</DialogTitle>
          <DialogDescription>
            Kamu perlu login dulu untuk menambahkan produk ke keranjang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={loginGoogle} disabled={loading}>
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
          />

          <Button
            className="w-full text-black"
            onClick={loginEmail}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Loading..." : "Login"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}