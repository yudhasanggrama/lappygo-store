import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(
        error_description ?? ""
      )}`
    );
  }

  if (!code) return NextResponse.redirect(`${origin}/login?error=no_code`);

  const supabase = await createSupabaseServer();
  
  // 1. Tukar code dengan session di sisi server
  const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(code);

  if (exErr || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_exchange&message=${encodeURIComponent(exErr?.message ?? "")}`
    );
  }

  // 2. Ambil profile secara instan di server untuk cek role & kelengkapan
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  // 3. Tentukan arah redirect langsung dari server
  // Cek apakah profil sudah lengkap (full_name)
  if (!profile || !profile.full_name?.trim()) {
    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  // Jika admin, langsung tembak ke dashboard admin
  if (profile.role === "admin") {
    return NextResponse.redirect(`${origin}/admin/products`);
  }

  // User biasa ke home
  return NextResponse.redirect(`${origin}/`);
}