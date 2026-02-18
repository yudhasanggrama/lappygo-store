"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import GoogleIcon from "@/components/icons/google-icon";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        router.replace(next);
        router.refresh();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        router.replace(next);
        router.refresh();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, next, supabase]);
    

  async function loginWithGoogle() {
    try {
      setLoadingGoogle(true);

      // safest: pakai origin runtime (lokal: http://localhost:3000, prod: https://lappygo.vercel.app)
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;

      const redirectTo = `${baseUrl}/auth/callback`;

      console.log("redirectTo:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        console.error("oauth error:", error);
        toast.error(error.message);
        return;
      }

      console.log("oauth data:", data);
    } catch (e: any) {
      console.error("loginWithGoogle catch:", e);
      toast.error(e?.message ?? "Unexpected error");
    } finally {
      setLoadingGoogle(false);
    }
  }



  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingEmail(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return toast.error(error.message);

      // 🔥 redirect langsung
      router.replace(next);
      router.refresh();

    } finally {
      setLoadingEmail(false);
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to start shopping</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 hover:bg-primary/10"
            onClick={loginWithGoogle}
            disabled={loadingEmail || loadingGoogle}
          >
            <GoogleIcon size={18} />
            {loadingGoogle ? "Redirect to Google..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">atau</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button className="w-full text-black" disabled={loadingEmail || loadingGoogle}>
              {loadingEmail ? "Loading..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link className="underline text-foreground" href="/signup">
              Signup
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
