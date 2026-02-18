"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackButton({
  fallbackHref = "/orders",
}: {
  fallbackHref?: string;
}) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="lg:hidden mt-1"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}