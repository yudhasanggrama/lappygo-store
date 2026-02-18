"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";

export default function RealtimeMyOrdersRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realtimeEnabled = Boolean(userId);

  const realtimeConfig = useMemo(
    () => ({
      event: "*" as const,
      schema: "public",
      table: "orders",
      filter: `user_id=eq.${userId}`,
    }),
    [userId]
  );

  useResilientRealtime(
    `rt-my-orders-${userId}`,
    realtimeConfig,
    () => {
      if (document.visibilityState !== "visible") return;

      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        startTransition(() => router.refresh());
      }, 250);
    },
    {
      enabled: realtimeEnabled,
      resubscribeIntervalMs: 60_000,
      syncAuthToRealtime: true,
    }
  );

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  return isPending ? (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full animate-pulse z-50">
      Updating list...
    </div>
  ) : null;
}