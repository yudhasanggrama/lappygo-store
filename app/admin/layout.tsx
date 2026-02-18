import AdminShell from "@/components/admin/AdminShell";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";


export default async function AdminLayout({
  
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/");

  return <AdminShell>{children}</AdminShell>;
}
