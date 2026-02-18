"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewCategoryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const n = name.trim();
    if (!n) return;

    setLoading(true);

    const s = slug.trim() ? slugify(slug) : slugify(n);

    const { error } = await supabase.from("categories").insert({
      name: n,
      slug: s,
    });

    setLoading(false);

    if (error) return alert(error.message);

    // balik ke list (list realtime akan langsung nampilin)
    router.push("/admin/categories");
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Add Category</h1>

      <Input
        placeholder="Category name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slug.trim()) setSlug(slugify(e.target.value));
        }}
      />

      <Input
        placeholder="Slug (optional)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />

      <div className="flex gap-2">
        <Button className="text-black" onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}