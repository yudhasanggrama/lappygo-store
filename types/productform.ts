export type ProductFormValues = {
    name: string;
    slug: string;
    brand: string;
    description: string | null;
    price: number;
    stock: number;
    category_id: string | null;
    image_url: string | null;
    is_active: boolean;
};

export type ProductInsert = ProductFormValues; // insert cukup field ini

export type ProductUpdate = Partial<ProductFormValues>; // update bisa partial
