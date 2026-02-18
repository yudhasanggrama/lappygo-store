import { createSupabaseServer } from "@/lib/supabase/server";

const BUCKET = "product-images"; // ✅ samakan dengan bucket kamu
const SIGN_EXPIRES_IN = 60 * 10; // 10 menit

async function requireUser() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error("UNAUTHORIZED");
  if (!data.user) throw new Error("UNAUTHORIZED");

  return { supabase, user: data.user };
}

async function getOrCreateActiveCartId(userId: string, supabase: any) {
  // cari cart aktif
  const { data: existing, error: findErr } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  if (existing?.id) return existing.id as string;

  // bikin cart baru
  const { data: created, error: createErr } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single();

  if (createErr) throw new Error(createErr.message);
  return created.id as string;
}

export async function fetchMyCart() {
  const { supabase, user } = await requireUser();
  const cartId = await getOrCreateActiveCartId(user.id, supabase);

  // ambil items + join product
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      qty,
      price,
      product:products (
        id, name, slug, brand, price, stock, image_url
      )
    `
    )
    .eq("cart_id", cartId);

  if (error) throw new Error(error.message);

  const items = await Promise.all(
    (data ?? []).map(async (row: any) => {
      const p = row.product;
      const image_path: string | null = p?.image_url ?? null;

      let image_signed_url: string | null = null;
      if (image_path) {
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(image_path, SIGN_EXPIRES_IN);

        if (!sErr) image_signed_url = signed?.signedUrl ?? null;
      }

      return {
        // FE pakai ini sebagai identity product di cart
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand ?? null,
        price: p.price,
        stock: p.stock ?? 0,

        qty: row.qty ?? 0,

        image_path,
        image_signed_url,
      };
    })
  );

  return { items };
}

export async function setCartItemQty(productId: string, qty: number, _priceFromClient?: number) {
  const { supabase, user } = await requireUser();
  const cartId = await getOrCreateActiveCartId(user.id, supabase);

  // cari existing item berdasarkan (cart_id, product_id)
  const { data: existing, error: findErr } = await supabase
    .from("cart_items")
    .select("id")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  // kalau qty <= 0 => delete
  if (qty <= 0) {
    if (!existing?.id) return;

    const { error: delErr } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", existing.id);

    if (delErr) throw new Error(delErr.message);
    return;
  }

  // ✅ ambil price asli dari products (lebih aman daripada dari client)
  const { data: prod, error: prodErr } = await supabase
    .from("products")
    .select("price, stock")
    .eq("id", productId)
    .single();

  if (prodErr) throw new Error(prodErr.message);

  const safeQty = Math.max(1, Math.min(qty, Math.max(0, prod.stock ?? 0)));

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from("cart_items")
      .update({ qty: safeQty, price: prod.price, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (upErr) throw new Error(upErr.message);
    return;
  }

  const { error: insErr } = await supabase.from("cart_items").insert({
    cart_id: cartId,
    product_id: productId,
    qty: safeQty,
    price: prod.price,
  });

  if (insErr) throw new Error(insErr.message);
}

export async function removeCartItem(productId: string) {
  const { supabase, user } = await requireUser();
  const cartId = await getOrCreateActiveCartId(user.id, supabase);

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId)
    .eq("product_id", productId);

  if (error) throw new Error(error.message);
}

export async function clearMyCart() {
  const { supabase, user } = await requireUser();
  const cartId = await getOrCreateActiveCartId(user.id, supabase);

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId);

  if (error) throw new Error(error.message);

  return { ok: true };
}