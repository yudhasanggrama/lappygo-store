"use client";

import { AdminProductForm } from "@/components/admin/admin-product-form";

type Category = { id: string; name: string; slug: string };

export default function AdminProductFormClient({
  categories,
  defaultValues,
}: {
  categories: Category[];
  defaultValues: any;
}) {
  return <AdminProductForm categories={categories} defaultValues={defaultValues} />;
}
