"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesFilter,
} from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef } from "react";

type RTEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type RTConfig = {
  event: RTEvent;
  schema: string;
  table: string;
  filter?: string;
};

type Options = {
  enabled?: boolean;
  maxRetries?: number;
  maxDelayMs?: number;
  baseDelayMs?: number;
  jitterRatio?: number;
  resubscribeIntervalMs?: number;

  // avoid resubscribe storms
  resubscribeDebounceMs?: number;

  // optional: disable auto auth wiring if you want
  syncAuthToRealtime?: boolean;
};

function withJitter(ms: number, ratio: number) {
  const r = Math.max(0, ratio);
  const delta = ms * r;
  const min = ms - delta;
  const max = ms + delta;
  return Math.floor(min + Math.random() * (max - min));
}

export function useResilientRealtime(
  channelName: string,
  config: RTConfig,
  callback: (payload: any) => void,
  options: Options = {}
) {
  const {
    enabled = true,
    maxRetries = 30,
    maxDelayMs = 10_000,
    baseDelayMs = 800,
    jitterRatio = 0.2,
    resubscribeIntervalMs = 0,
    resubscribeDebounceMs = 600,
    syncAuthToRealtime = true,
  } = options;

  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resubTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUnmountingRef = useRef(false);
  const subscribingRef = useRef(false);

  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const configKey = `${config.event}|${config.schema}|${config.table}|${config.filter ?? ""}`;

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearResubTimer = useCallback(() => {
    if (resubTimerRef.current) {
      clearInterval(resubTimerRef.current);
      resubTimerRef.current = null;
    }
  }, []);

  // Debounce resubscribe triggers (visibility/online/auth) to avoid storms
  const resubDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleResubscribe = useCallback(
    (fn: () => void) => {
      if (resubDebounceRef.current) clearTimeout(resubDebounceRef.current);
      resubDebounceRef.current = setTimeout(() => {
        if (isUnmountingRef.current) return;
        fn();
      }, resubscribeDebounceMs);
    },
    [resubscribeDebounceMs]
  );

  const cleanupChannel = useCallback(() => {
    const ch = channelRef.current;
    channelRef.current = null;
    if (!ch) return;

    try {
      ch.unsubscribe();
    } catch {}

    try {
      supabase.removeChannel(ch);
    } catch {}
  }, [supabase]);

  const scheduleRetry = useCallback(() => {
    if (isUnmountingRef.current) return;

    if (retryCountRef.current >= maxRetries) {
      clearRetryTimer();
      retryTimerRef.current = setTimeout(() => {
        if (isUnmountingRef.current) return;
        retryCountRef.current = 0;
        subscribeRef.current?.();
      }, 15_000);
      return;
    }

    const exp = Math.min(baseDelayMs * Math.pow(2, retryCountRef.current), maxDelayMs);
    const delay = withJitter(exp, jitterRatio);

    retryCountRef.current += 1;

    clearRetryTimer();
    retryTimerRef.current = setTimeout(() => {
      if (isUnmountingRef.current) return;
      subscribeRef.current?.();
    }, delay);
  }, [baseDelayMs, clearRetryTimer, jitterRatio, maxDelayMs, maxRetries]);

  const subscribeRef = useRef<(() => void) | null>(null);

  const ensureRealtimeAuth = useCallback(async () => {
    if (!syncAuthToRealtime) return;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? "";

      // supabase-js v2: realtime.setAuth exists
      // @ts-ignore
      supabase.realtime?.setAuth?.(token);
    } catch {
      // ignore
    }
  }, [supabase, syncAuthToRealtime]);

  const subscribe = useCallback(async () => {
    if (!enabled) return;
    if (isUnmountingRef.current) return;

    // prevent overlapping subscribe calls
    if (subscribingRef.current) return;
    subscribingRef.current = true;

    try {
      clearRetryTimer();

      // cleanup old channel best-effort
      cleanupChannel();

      // ✅ critical fix: make sure realtime has the latest token BEFORE subscribing
      await ensureRealtimeAuth();

      const filter: RealtimePostgresChangesFilter<RTEvent> = {
        event: config.event,
        schema: config.schema,
        table: config.table,
        ...(config.filter ? { filter: config.filter } : {}),
      };

      const ch = supabase
        .channel(channelName)
        .on("postgres_changes", filter, (payload) => {
          if (isUnmountingRef.current) return;
          retryCountRef.current = 0;
          savedCallback.current(payload);
        })
        .subscribe((status) => {
          if (isUnmountingRef.current) return;

          if (status === "SUBSCRIBED") {
            retryCountRef.current = 0;
            subscribingRef.current = false;
            clearRetryTimer();
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            subscribingRef.current = false;
            scheduleRetry();
          }
        });

      channelRef.current = ch;
    } catch {
      subscribingRef.current = false;
      scheduleRetry();
    }
  }, [
    enabled,
    channelName,
    config,
    supabase,
    cleanupChannel,
    clearRetryTimer,
    scheduleRetry,
    ensureRealtimeAuth,
  ]);

  useEffect(() => {
    subscribeRef.current = () => {
      void subscribe();
    };
  }, [subscribe]);

  useEffect(() => {
    isUnmountingRef.current = false;

    if (!enabled) {
      clearRetryTimer();
      clearResubTimer();
      cleanupChannel();
      return;
    }

    // initial subscribe
    subscribeRef.current?.();

    const onVisible = () => {
      if (!enabled || isUnmountingRef.current) return;
      if (document.visibilityState === "visible") {
        scheduleResubscribe(() => subscribeRef.current?.());
      }
    };

    const onOnline = () => {
      if (!enabled || isUnmountingRef.current) return;
      scheduleResubscribe(() => subscribeRef.current?.());
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!enabled || isUnmountingRef.current) return;

      if (
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        if (syncAuthToRealtime) {
          try {
            // @ts-ignore
            supabase.realtime?.setAuth?.(session?.access_token ?? "");
          } catch {}
        }

        scheduleResubscribe(() => subscribeRef.current?.());
      }
    });

    if (resubscribeIntervalMs > 0) {
      resubTimerRef.current = setInterval(() => {
        if (!enabled || isUnmountingRef.current) return;
        if (document.visibilityState === "visible") {
          scheduleResubscribe(() => subscribeRef.current?.());
        }
      }, resubscribeIntervalMs);
    }

    return () => {
      isUnmountingRef.current = true;

      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);

      authSub?.subscription?.unsubscribe();

      if (resubDebounceRef.current) {
        clearTimeout(resubDebounceRef.current);
        resubDebounceRef.current = null;
      }

      clearRetryTimer();
      clearResubTimer();
      cleanupChannel();
    };
  }, [
    enabled,
    configKey,
    supabase,
    cleanupChannel,
    clearRetryTimer,
    clearResubTimer,
    resubscribeIntervalMs,
    scheduleResubscribe,
    syncAuthToRealtime,
  ]);
}