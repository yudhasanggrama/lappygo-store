"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Search, ShoppingCart, User, LogOut, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { clientLogout } from "@/lib/auth/logout";
import { useEffect, useMemo, useState } from "react";

export default function MobileBottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const spString = sp.toString();

  const hydratedCart = useCartStore((s) => s.hydrated);
  const cartCount = useCartStore((s) => s.itemCount());

  const authHydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  const hide =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(sp.get("search") ?? "");

  // sync dari URL
  useEffect(() => {
    setSearchQuery(sp.get("search") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spString]);

  // debounce (hanya saat sheet open biar gak ganggu scroll)
  useEffect(() => {
    if (!searchOpen) return;

    const t = setTimeout(() => {
      const q = searchQuery.trim();
      const qs = new URLSearchParams(spString);

      if (q) qs.set("search", q);
      else qs.delete("search");

      qs.delete("page");

      const href = `/products${qs.toString() ? `?${qs.toString()}` : ""}`;
      router.replace(href, { scroll: false });
    }, 400);

    return () => clearTimeout(t);
  }, [searchQuery, searchOpen, router, spString]);

  if (hide) return null;

  const ItemLink = ({
    href,
    label,
    icon: Icon,
    active,
    badge,
  }: {
    href: string;
    label: string;
    icon: any;
    active?: boolean;
    badge?: number;
  }) => (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
        "text-xs font-medium transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {!!badge && badge > 0 && hydratedCart && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span>{label}</span>
    </Link>
  );

  async function handleLogout() {
    await clientLogout();
    router.replace("/", { scroll: false });
    // router.refresh(); // biasanya gak perlu
  }

  const nameForUI = (user?.full_name?.trim() || user?.email || "User").trim();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const q = searchQuery.trim();
    const qs = new URLSearchParams(spString);

    if (q) qs.set("search", q);
    else qs.delete("search");

    qs.delete("page");

    router.push(`/products${qs.toString() ? `?${qs.toString()}` : ""}`);
    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    const qs = new URLSearchParams(spString);
    qs.delete("search");
    qs.delete("page");
    router.replace(`/products${qs.toString() ? `?${qs.toString()}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50">
      <div className="border-t bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/65">
        <div className="mx-auto max-w-md px-2">
          <div className="grid grid-cols-4">
            <ItemLink href="/" label="Home" icon={Home} active={pathname === "/"} />

            {/* ✅ Search sheet */}
            <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
                    "text-xs font-medium transition",
                    pathname.startsWith("/products")
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Search className="h-5 w-5 text" />
                  <span>Search</span>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Search products</SheetTitle>
                </SheetHeader>

                <form onSubmit={submitSearch} className="mt-4 space-y-3">
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Apple, Acer, ASUS..."
                      className="pr-10"
                      autoFocus
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
                  </div>

                  <Button type="submit" className="w-full text-black">
                    See results
                  </Button>
                </form>
              </SheetContent>
            </Sheet>

            <ItemLink
              href="/cart"
              label="Cart"
              icon={ShoppingCart}
              active={pathname === "/cart"}
              badge={cartCount}
            />

            {/* Account sheet (punyamu) */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  suppressHydrationWarning
                  type="button"
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2",
                    "text-xs font-medium transition",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Account</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-3">
                  {!authHydrated ? (
                    <div className="h-20 rounded-xl border bg-muted animate-pulse" />
                  ) : user?.email ? (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-sm font-semibold">{nameForUI}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="text-sm font-semibold">Not Login Yet</div>
                      <div className="text-xs text-muted-foreground">
                        Login to access account & checkout
                      </div>
                    </div>
                  )}

                  {user?.email ? (
                    <>
                    <Button asChild className="w-full text-black bg-white hover:bg-gray-200">
                      <Link href="/my-order">
                        <Package className="mr-2 h-4 w-4" />
                        Orders
                      </Link>
                    </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleLogout}
                      >
                      <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button asChild className="w-full text-black">
                      <Link href="/login">Login</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}