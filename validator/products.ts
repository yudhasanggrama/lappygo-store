import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  brand: z.string().min(2),

  description: z.string().nullable().optional(),

  price: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0),

  // ✅ nullable uuid
  category_id: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().uuid().nullable()
  ),

  // ✅ PATH private bucket boleh string biasa / null
  image_url: z.string().nullable().optional(),

  is_active: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean()
  ),
});

export type ProductFormValues = z.infer<typeof productSchema>;
