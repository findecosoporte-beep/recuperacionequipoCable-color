"use client";

import { AuthProvider } from "@/components/auth-provider";
import { PrimeProvider } from "@/components/prime-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrimeProvider>
      <AuthProvider>{children}</AuthProvider>
    </PrimeProvider>
  );
}
