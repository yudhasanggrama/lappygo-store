import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import MobileBottomBar from "@/components/layout/MobileBottomBar";
import AppProviders from "@/components/providers/AppProviders";
import ClientOnly from "@/components/ClientOnly";

import { createSupabaseServer } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LAPPYGO",
  description:
    "Discover a wide selection of trendy clothes, shoes and accessories on Bloom E-Commerce. Enjoy fast delivery and free returns. Shop now!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialUser: null | { email: string | null; full_name: string | null; role: string | null } =
    null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    initialUser = {
      email: user.email ?? null,
      full_name: profile?.full_name ?? null,
      role: profile?.role ?? null,
    };
  }

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <AppProviders initialUser={initialUser}>
          {!isAdmin && <Header initialUser={initialUser} />}

          <main className="grow">{children}</main>

          <Toaster />

          {/* ✅ render hanya setelah mounted (hindari hydration mismatch) */}
          {!isAdmin && (
            <ClientOnly>
              <MobileBottomBar />
            </ClientOnly>
          )}

          {!isAdmin && <Footer />}
        </AppProviders>
      </body>
    </html>
  );
}