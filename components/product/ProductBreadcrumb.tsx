"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductBreadcrumb() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  }

  return (
    <nav className="mb-8">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Shop
      </Button>
    </nav>
  );
}
