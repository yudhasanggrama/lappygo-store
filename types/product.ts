export type Product = {
  id: string;
  slug: string;
  image_url: string | null;
  image_signed_url?: string | null;
  name: string;
  brand: string;
  price: number;
  stock: number;
  category_id: string | null;
  description?: string | null;
  is_active?: boolean;
};
