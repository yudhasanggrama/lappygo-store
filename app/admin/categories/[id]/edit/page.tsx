import { createSupabaseServer } from "@/lib/supabase/server";
import EditForm from "./ui";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();

  if (!data) return notFound();

  return <EditForm category={data} />;
}