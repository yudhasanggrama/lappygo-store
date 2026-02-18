"use client";

import { Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import AuthButtons from "../auth/auth-button";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";

type InitialUser =
  | { email: string | null; full_name: string | null; role: string | null }
  | null;

export default function Header({ initialUser }: { initialUser: InitialUser }) {
  const hasHydrated = useCartStore((s) => s.hydrated);
  const cartCount = useCartStore((s) => s.cart.reduce((t, i) => t + i.qty, 0));

  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  // ✅ bikin string stabil untuk dependency
  const spString = sp.toString();
  const currentUrl = useMemo(
    () => `${pathname}${spString ? `?${spString}` : ""}`,
    [pathname, spString]
  );

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(sp.get("search") ?? "");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

  const navItems = useMemo(() => [{ href: "/contact", label: "Contact" }], []);

  // ===============================
  // Scroll shadow
  // ===============================
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ===============================
  // Close mobile when route change
  // ===============================
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // ===============================
  // Sync input with URL (stabil via spString)
  // ===============================
  useEffect(() => {
    const next = sp.get("search") ?? "";
    setSearchQuery(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString]);

  // ===============================
  // ✅ Debounce search (ONLY on /products)
  // + prevent pushing same URL
  // + prevent scroll jump
  // ===============================
  useEffect(() => {
    if (!pathname.startsWith("/products")) return;

    const t = setTimeout(() => {
      const q = searchQuery.trim();
      const qs = new URLSearchParams(spString);

      if (q) qs.set("search", q);
      else qs.delete("search");

      qs.delete("page");

      const href = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;

      // ✅ jangan navigasi kalau sama persis (ini yg bikin auto scroll ke atas)
      if (href === currentUrl) return;

      // ✅ scroll:false biar posisi scroll tidak reset
      router.replace(href, { scroll: false });
    }, 400);

    return () => clearTimeout(t);
  }, [searchQuery, pathname, router, spString, currentUrl]);

  // ===============================
  // Submit search (ENTER) — boleh dari mana saja
  // ===============================
  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const q = searchQuery.trim();
    const qs = new URLSearchParams(spString);

    if (q) qs.set("search", q);
    else qs.delete("search");

    qs.delete("page");

    const href = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;
    router.push(href); // submit boleh scroll ke atas (normal)
    setIsMobileOpen(false);
  };

  // ===============================
  // Clear search
  // ===============================
  const clearSearch = () => {
    setSearchQuery("");

    // kalau lagi bukan /products, cukup clear input aja
    if (!pathname.startsWith("/products")) return;

    const qs = new URLSearchParams(spString);
    qs.delete("search");
    qs.delete("page");

    const href = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;
    if (href === currentUrl) return;

    router.replace(href, { scroll: false });
  };

  // ===============================
  // Auth pages header
  // ===============================
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-foreground">
              LAPPY<span className="text-primary">GO</span>
            </span>
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Contact
          </Link>
        </div>
      </header>
    );
  }

  // ===============================
  // MAIN HEADER
  // ===============================
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-background/80 backdrop-blur",
        "transition-shadow",
        isScrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
            aria-label="Home"
          >
            <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              LAPPY<span className="text-primary">GO</span>
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1">
            <form onSubmit={onSubmitSearch} className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <input
                suppressHydrationWarning
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Looking for Apple, Acer, ASUS..."
                className={cn(
                  "w-full h-10 rounded-full border bg-background pl-11 pr-10 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30"
                )}
              />

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-medium transition",
                    pathname === it.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {it.label}
                </Link>
              ))}
            </nav>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative rounded-full p-2 hover:bg-muted transition"
              aria-label={`Cart with ${cartCount} items`}
            >
              <ShoppingCart className="h-5 w-5 text-foreground" />
              {hasHydrated && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground flex items-center justify-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            <div className="hidden sm:flex items-center">
              <AuthButtons initialUser={initialUser} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}