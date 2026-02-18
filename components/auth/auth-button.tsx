"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogIn, Settings, Package, Shield, LogOut, ChevronDown } from "lucide-react";
import { clientLogout } from "@/lib/auth/logout";
import { useAuthStore } from "@/stores/auth.store";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InitialUser =
  | { email: string | null; full_name: string | null; role: string | null }
  | null;

export default function AuthButtons({ initialUser }: { initialUser: InitialUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  const hide =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/complete-profile";

  if (hide) return null;

  // ✅ stabil: kalau belum hydrated, tapi initialUser ada → render UI initialUser biar gak shift
  const effective = hydrated ? user : initialUser;

  if (!effective?.email) {
    return (
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Link>
      </Button>
    );
  }

  const nameForUI = (effective.full_name?.trim() || effective.email || "Account").trim();

  const initials = nameForUI
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = effective.role === "admin";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {/* ✅ style seperti sebelumnya: h-10, rounded-full, px-2.5, hover bg muted */}
        <Button
          variant="outline"
          className={cn("rounded-full h-10 px-2.5 gap-2 hover:bg-muted min-w-0")}
        >
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>

          {/* ✅ max-w valid (pengganti max-w-35) */}
          <span className="hidden sm:block min-w-0 max-w-35 truncate text-sm font-medium">
            {nameForUI}
          </span>

          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-semibold truncate">{nameForUI}</div>
          <div className="text-xs text-muted-foreground truncate">{effective.email}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/my-order">
            <Package className="mr-2 h-4 w-4" />
            Orders
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive cursor-pointer"
          onSelect={async (e) => {
            e.preventDefault();
            setOpen(false);

            await clientLogout();
            router.replace("/login");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}