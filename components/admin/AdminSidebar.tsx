"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // kalau belum ada, boleh pakai helper cn kamu sendiri
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen border-r bg-background">
      <div className="px-5 py-5">
        <Link href="/admin" className="block">
          <div className="text-lg font-semibold tracking-tight">
            LAPPY<span className="text-primary">GO</span>
          </div>
          <div className="text-xs text-muted-foreground">Admin Panel</div>
        </Link>
      </div>

      <Separator />

      <nav className="px-3 py-3 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-5">
        <div className="rounded-xl bg-muted p-4">
          <div className="text-sm font-medium">Quick tip</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep stock updated to avoid missed orders.
          </p>
        </div>
      </div>
    </aside>
  );
}
