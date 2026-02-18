"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar"
import AdminTopbar from "./AdminTopBar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Optional: hide shell on login page (kalau kamu punya /admin/login)
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:w-72 lg:shrink-0">
          <AdminSidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
