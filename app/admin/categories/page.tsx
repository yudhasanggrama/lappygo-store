import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminCategoriesRealtime from "./ui/CategoriesRealTimeList";
import CategoriesRealtimeList from "./ui/CategoriesRealTimeList";

export default function AdminCategoriesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Categories</h1>

        <Button asChild className="text-black">
          <Link href="/admin/categories/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      <CategoriesRealtimeList />
    </div>
  );
}