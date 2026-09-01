"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/components/auth-provider";
import { esRolPanel } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready && user) {
      router.replace(esRolPanel(user.rol) ? "/" : "/acceso-app");
    }
  }, [ready, user, router]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md" title="Iniciar sesión">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-color)]">
          Órdenes de campo
        </p>
        <p className="mb-6 mt-0 text-sm text-[var(--text-color-secondary)]">
          Entra con tu email y contraseña para ver las órdenes.
        </p>
        <LoginForm />
      </Card>
    </div>
  );
}
