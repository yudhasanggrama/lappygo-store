"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";

export default function RealtimeOrdersRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAt = useRef<number>(0);

  const realtimeConfig = useMemo(
    () => ({
      event: "*" as const,
      schema: "public",
      table: "orders",
    }),
    []
  );

  useResilientRealtime(
    "admin-global-orders",
    realtimeConfig,
    () => {
      if (document.visibilityState !== "visible") return;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastRefreshAt.current < 1500) return; // throttle

        lastRefreshAt.current = now;
        startTransition(() => router.refresh());
      }, 300);
    },
    {
      enabled: true,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return isPending ? (
    <div className="fixed bottom-4 right-4 bg-primary text-white p-2 rounded-md text-xs animate-pulse z-50">
      Syncing...
    </div>
  ) : null;
}