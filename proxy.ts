import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 0) skip static / next assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          // IMPORTANT: set ke res yang sama
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          // IMPORTANT: remove beneran (maxAge 0)
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // 1) Ini penting supaya token refresh terjadi di middleware bila perlu
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2) Allow callback lewat tanpa ganggu
  if (pathname.startsWith("/auth/callback")) return res;

  // 3) Proteksi admin (kalau ga login, redirect)
  if (!user) {
    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      res = NextResponse.redirect(url);
      return res; // cookie removal/set handled by adapter
    }
    return res;
  }

  // 4) Ambil role hanya kalau perlu (admin area atau home)
  const isAtAdminArea = pathname.startsWith("/admin");
  const isAtHome = pathname === "/";

  if (isAtAdminArea || isAtHome) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;

    if (isAtHome && role === "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/products";
      res = NextResponse.redirect(url);
      return res;
    }

    if (isAtAdminArea && role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      res = NextResponse.redirect(url);
      return res;
    }
  }

  return res;
}

// optional: limit matcher biar middleware ga kepanggil di semua path
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
