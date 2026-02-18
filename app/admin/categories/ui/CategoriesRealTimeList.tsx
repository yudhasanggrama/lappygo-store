"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export default function CategoriesRealTimeList() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,created_at")
      .order("created_at", { ascending: false });

    if (error) console.error("[admin categories] load error:", error.message);
    setRows((data ?? []) as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("realtime:admin_categories")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        (payload) => {
          console.log("[admin categories] change:", payload.eventType);
          load();
        }
      )
      .subscribe((status) => {
        console.log("[admin categories] status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function handleDelete(id: string) {
    // cek dipakai products
    const { count, error: countErr } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countErr) return alert(countErr.message);
    if ((count ?? 0) > 0) return alert(`Can't delete. Used by ${count} product(s).`);

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return alert(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <div className="border rounded-xl p-4 text-sm text-muted-foreground">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="border rounded-xl">
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-muted-foreground">
          No categories yet.
        </div>
      ) : (
        rows.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 border-b last:border-0"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.slug}</div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/categories/${c.id}/edit`}>Edit</Link>
              </Button>

              <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}