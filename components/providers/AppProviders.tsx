"use client";

import AuthModal from "@/components/auth/AuthModal";
import AuthCartProvider from "./AuthCartProvider";
import AuthProvider from "@/components/providers/AuthProvider";

type InitialUser =
  | { email: string | null; full_name: string | null; role: string | null }
  | null;

export default function AppProviders({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: InitialUser;
}) {
  return (
    <>
      {/* ✅ 1 listener global di client */}
      <AuthProvider initialUser={initialUser} />

      <AuthCartProvider />
      {children}
      <AuthModal />
    </>
  );
}