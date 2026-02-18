"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { productSchema, type ProductFormValues } from "@/validator/products";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Resolver, SubmitHandler } from "react-hook-form";

// ✅ shadcn dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

type Category = { id: string; name: string; slug: string };

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  image_signed_url?: string | null;
  is_active: boolean;
};

export function AdminProductForm({
  categories,
  defaultValues,
}: {
  categories: Category[];
  defaultValues?: Partial<ProductRow>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ✅ delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!previewUrl && defaultValues?.image_signed_url) {
      setPreviewUrl(defaultValues.image_signed_url);
    }
  }, [defaultValues?.image_signed_url, previewUrl]);

  const isEdit = Boolean(defaultValues?.id);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as unknown as Resolver<ProductFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      brand: defaultValues?.brand ?? "",
      description: defaultValues?.description ?? null,
      price: defaultValues?.price ?? 0,
      stock: defaultValues?.stock ?? 0,
      category_id: defaultValues?.category_id ?? null,
      image_url: defaultValues?.image_url ?? null,
      is_active: defaultValues?.is_active ?? true,
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = form;

  const nameValue = watch("name");
  const slugValue = watch("slug");

  async function uploadImage(file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `products/${filename}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;
    return path;
  }

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    setSaving(true);
    try {
      const normalized = {
        ...values,
        is_active:
          typeof (values as any).is_active === "string"
            ? (values as any).is_active === "true"
            : values.is_active,
      };

      const parsed = productSchema.safeParse(normalized);
      if (!parsed.success) {
        toast.error("Validation failed");
        return;
      }

      const payload = parsed.data;

      const { error } = isEdit
        ? await supabase.from("products").update(payload).eq("id", defaultValues!.id)
        : await supabase.from("products").insert(payload);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(isEdit ? "Product updated" : "Product created");
      router.push("/admin/products");
    } finally {
      setSaving(false);
    }
  };

  // ✅ delete handler without confirm() — triggered from the dialog
  async function confirmDelete() {
    if (!defaultValues?.id) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", defaultValues.id);
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Product deleted");
      setDeleteOpen(false);
      router.push("/admin/products");
    } finally {
      setDeleting(false);
    }
  }

  const busy = uploading || saving || deleting || isSubmitting;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isEdit ? "Edit Product" : "Create Product"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the product details, then save your changes.
          </p>
        </div>

        <a
          href="/admin/products"
          className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted"
        >
          Back
        </a>
      </div>

      <form
        suppressHydrationWarning
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border bg-background shadow-sm"
      >
        <div className="border-b p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Name */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <input
                suppressHydrationWarning
                className={cn(
                  "h-10 rounded-md border px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.name && "border-red-500 focus:ring-red-500/10"
                )}
                placeholder="Example: Samsung Galaxy S24"
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Slug */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Slug</label>
              <input
                className={cn(
                  "h-10 rounded-md border px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.slug && "border-red-500 focus:ring-red-500/10"
                )}
                placeholder="samsung-galaxy-s24"
                {...register("slug")}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  URL format: lowercase letters, numbers, and dashes (-).
                </p>
                <p className="text-xs text-muted-foreground">{slugValue?.length ?? 0} chars</p>
              </div>
              <FieldError message={errors.slug?.message} />
            </div>

            {/* Brand */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Brand</label>
              <input
                className={cn(
                  "h-10 rounded-md border px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.brand && "border-red-500 focus:ring-red-500/10"
                )}
                placeholder="Example: Samsung"
                {...register("brand")}
              />
              <FieldError message={errors.brand?.message} />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <select
                className={cn(
                  "h-10 rounded-md border px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.category_id && "border-red-500 focus:ring-red-500/10"
                )}
                {...register("category_id", { setValueAs: (v) => (v ? v : null) })}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.category_id?.message} />
            </div>

            {/* Price */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Price</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Rp
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  className={cn(
                    "h-10 w-full rounded-md border pl-10 pr-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                    errors.price && "border-red-500 focus:ring-red-500/10"
                  )}
                  {...register("price", { valueAsNumber: true })}
                />
              </div>
              <FieldError message={errors.price?.message} />
            </div>

            {/* Stock */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Stock</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className={cn(
                  "h-10 rounded-md border px-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.stock && "border-red-500 focus:ring-red-500/10"
                )}
                {...register("stock", { valueAsNumber: true })}
              />
              <FieldError message={errors.stock?.message} />
            </div>

            {/* Active */}
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValue("is_active", true, { shouldValidate: true })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-md border px-3 text-sm transition",
                    watch("is_active") === true
                      ? "bg-foreground text-background border-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setValue("is_active", false, { shouldValidate: true })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-md border px-3 text-sm transition",
                    watch("is_active") === false
                      ? "bg-foreground text-background border-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  Inactive
                </button>
              </div>
              <FieldError message={errors.is_active?.message} />
            </div>

            {/* Description */}
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Description</label>
                <p className="text-xs text-muted-foreground">
                  {nameValue ? `About ${nameValue}` : "Product description"}
                </p>
              </div>

              <textarea
                className={cn(
                  "min-h-30 rounded-md border px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10",
                  errors.description && "border-red-500 focus:ring-red-500/10"
                )}
                placeholder="Write a short description, specifications, and product highlights..."
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </div>
        </div>

        {/* Image section */}
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Product Image</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload JPG/PNG/WebP. Recommended ratios: 1:1 or 4:3.
              </p>
            </div>
            {uploading ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-3 text-sm hover:bg-muted",
                  uploading && "cursor-not-allowed opacity-60"
                )}
              >
                <span className="text-sm">{uploading ? "Uploading..." : "Choose an image file"}</span>
                <span className="rounded-md border px-2 py-1 text-xs">Browse</span>
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const inputEl = e.currentTarget;
                    const file = inputEl.files?.[0];
                    if (!file) return;

                    setPreviewUrl((prev) => {
                      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(file);
                    });

                    const maxMb = 3;
                    if (file.size > maxMb * 1024 * 1024) {
                      toast.error(`Max file size is ${maxMb}MB`);
                      setPreviewUrl(null);
                      inputEl.value = "";
                      return;
                    }

                    setUploading(true);
                    try {
                      const path = await uploadImage(file);
                      setValue("image_url", path, { shouldValidate: true, shouldDirty: true });

                      if (defaultValues?.id) {
                        const { error } = await supabase
                          .from("products")
                          .update({ image_url: path })
                          .eq("id", defaultValues.id);

                        if (error) return toast.error(error.message);
                      }

                      toast.success("Image uploaded");
                    } catch (err: any) {
                      toast.error(err?.message ?? "Upload failed");
                    } finally {
                      setUploading(false);
                      inputEl.value = "";
                      router.refresh();
                    }
                  }}
                />
              </label>

              {!isEdit ? (
                <p className="text-xs text-muted-foreground">
                  *For new products, the image_url will be saved when you click Create.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="preview"
                  className="aspect-square w-full rounded-lg border object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-background">
                  <p className="text-xs text-muted-foreground">No image</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition",
                "bg-foreground text-background hover:opacity-90",
                busy && "opacity-60"
              )}
              type="submit"
            >
              {saving || isSubmitting ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
            </button>

            {/* ✅ Delete button uses dialog */}
            {isEdit ? (
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted",
                      (deleting || busy) && "pointer-events-none opacity-60"
                    )}
                    type="button"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[460px]">
                  <DialogHeader>
                    <DialogTitle>Delete this product?</DialogTitle>

                    <DialogDescription>
                      This action cannot be undone. The product will be removed from the catalog.
                    </DialogDescription>

                    {/* ✅ moved outside DialogDescription to avoid <div> inside <p> */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Product:</span>{" "}
                      <span className="font-mono">{defaultValues?.name ?? defaultValues?.id}</span>
                    </div>
                  </DialogHeader>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm hover:bg-muted"
                      onClick={() => setDeleteOpen(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleting}
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
                        "bg-red-600 text-white hover:bg-red-700",
                        deleting && "opacity-60"
                      )}
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {busy ? "Processing…" : "Make sure the slug is unique and a category is selected."}
          </p>
        </div>
      </form>
    </div>
  );
}