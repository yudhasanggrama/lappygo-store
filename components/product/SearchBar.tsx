"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";

export default function SearchBar({ debounceMs = 400 }: { debounceMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [value, setValue] = useState(sp.get("search") ?? "");

  // sync kalau user back/forward atau query berubah dari luar
  useEffect(() => {
    setValue(sp.get("search") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams(sp.toString());
      const v = value.trim();

      if (v) qs.set("search", v);
      else qs.delete("search");

      // kalau kamu pakai pagination, reset:
      qs.delete("page");

      router.push(`${pathname}${qs.toString() ? `?${qs.toString()}` : ""}`);
    }, debounceMs);

    return () => clearTimeout(t);
  }, [value, debounceMs, pathname, router, sp]);

  return (
    <div className="mt-6 flex justify-center">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        className="w-full max-w-xl"
      />
    </div>
  );
}