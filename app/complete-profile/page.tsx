"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CompleteProfilePage() {
    const router = useRouter();
    const supabase = createSupabaseBrowser();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function load() {
            // 1) cek session dulu (lebih reliable untuk client)
            const { data: sessionRes } = await supabase.auth.getSession();
            console.log("hasSession:", !!sessionRes.session);
            console.log("userId:", sessionRes.session?.user?.id);

            
            let user = sessionRes.session?.user ?? null;

            // 2) kalau belum ada, tunggu event SIGNED_IN sebentar
            if (!user) {
            const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
                if (!mounted) return;
                const u = session?.user;
                if (u) {
                user = u;
                initWithUser(u);
                sub.subscription.unsubscribe();
                }
            });

            // fallback: kalau setelah 1.5 detik tetap tidak ada session, baru redirect
            setTimeout(() => {
                if (!mounted) return;
                if (!user) {
                toast.error("Please login first.");
                router.replace("/login");
                }
            }, 1500);

            return;
            }

            await initWithUser(user);
        }

        async function initWithUser(user: any) {
            // NOTE: kalau kolom email tidak ada di table profiles, JANGAN select email.
            const { data: profile, error } = await supabase
            .from("profiles")
            .select("full_name") // <-- amankan dulu
            .eq("id", user.id)
            .maybeSingle();

            const fromGoogle =
            user.user_metadata?.full_name || user.user_metadata?.name || "";

            setFullName(profile?.full_name || fromGoogle || "");
            setEmail(user.email || "");
            setChecking(false);

            if (error) {
            console.log("profiles select error:", error.message);
            }
        }

        load();

        return () => {
            mounted = false;
        };
        }, [router, supabase]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        // 🔥 gunakan getUser (lebih stabil dari getSession)
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;

        if (!user) {
            setLoading(false);
            toast.error("Session expired. Please login again.");
            router.replace("/login");
            return;
        }

        const uid = user.id;
        const email = user.email ?? "";

        const name = fullName.trim();
        if (!name) {
            setLoading(false);
            toast.error("Full name is required.");
            return;
        }

        console.log("auth.uid()", uid);

        const { error } = await supabase
            .from("profiles")
            .upsert(
            {
                id: uid,
                full_name: name,
                email,
            },
            { onConflict: "id" }
            );

        setLoading(false);

        if (error) {
            console.log("upsert error:", error);
            return toast.error(error.message);
        }

        toast.success("Profile saved.");
        router.push("/");
        router.refresh();
    }



    if (checking) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>Please fill your details to continue.</CardDescription>
            </CardHeader>

            <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
                <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                />

                <Input
                type="email"
                placeholder="Email"
                value={email}
                disabled
                />

                <Button className="w-full text-black" disabled={loading}>
                {loading ? "Saving..." : "Save & Continue"}
                </Button>
            </form>
            </CardContent>

            <CardFooter className="text-xs text-muted-foreground">
            This helps personalize your shopping experience.
            </CardFooter>
        </Card>
        </div>
    );
}
