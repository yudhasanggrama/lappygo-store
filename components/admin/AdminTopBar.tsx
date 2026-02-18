"use client";

import { Menu, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AdminSidebar from "./AdminSidebar";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function AdminTopbar() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createSupabaseBrowser();
        await supabase.auth.signOut();

        router.push("/");
        router.refresh();
    };

    return (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <SheetTitle>
                                    <Button variant="outline" size="icon">
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </SheetTitle>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72">
                                <AdminSidebar />
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div>
                        <div className="text-sm font-semibold">Admin</div>
                        <div className="text-xs text-muted-foreground">
                        Manage store operations
                        </div>
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleLogout} className="hover:bg-primary/10">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
}
