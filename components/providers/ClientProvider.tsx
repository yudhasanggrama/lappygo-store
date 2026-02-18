"use client";

import AuthProvider, { type InitialUser } from "@/components/providers/AuthProvider";
import AuthModal from "@/components/auth/AuthModal";

export default function ClientProviders({ initialUser }: { initialUser: InitialUser }) {
  return (
    <>
      <AuthProvider initialUser={initialUser} />
      <AuthModal />
    </>
  );
}