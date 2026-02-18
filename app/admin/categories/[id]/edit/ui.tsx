"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditForm({ category }: { category: any }) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [name, setName] = useState(category.name);
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const { error } = await supabase
      .from("categories")
      .update({ name, slug })
      .eq("id", category.id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Edit Category</h1>

      <Input value={name} onChange={(e) => setName(e.target.value)} />

      <Button onClick={handleUpdate} disabled={loading} className="text-black">
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}