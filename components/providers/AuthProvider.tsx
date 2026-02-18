"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore, type AuthUser } from "@/stores/auth.store";

export type InitialUser =
  | { email: string | null; full_name: string | null; role: string | null }
  | null;

export default function AuthProvider({ initialUser }: { initialUser: InitialUser }) {
  const supabase = createSupabaseBrowser();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  const reqIdRef = useRef(0);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const reqId = ++reqIdRef.current;

      const { data } = await supabase.auth.getUser();
      if (!alive || reqId !== reqIdRef.current) return;

      const u = data.user;
      if (!u) {
        setUser(null);
        setHydrated(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", u.id)
        .maybeSingle();

      if (!alive || reqId !== reqIdRef.current) return;

      const mapped: AuthUser = {
        email: u.email ?? null,
        full_name: profile?.full_name ?? null,
        role: (profile?.role as any) ?? null,
      };

      setUser(mapped);
      setHydrated(true);
    };

    // ✅ penting: kalau ada initialUser, set hydrated = true supaya header tidak sempat skeleton/geser
    if (initialUser?.email) {
      setUser({
        email: initialUser.email,
        full_name: initialUser.full_name,
        role: (initialUser.role as any) ?? null,
      });
      setHydrated(true);
    }

    // tetap sync ke session client (misal cookie berubah)
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setHydrated(true);
      } else if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        load();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, setUser, setHydrated, initialUser]);

  return null;
}