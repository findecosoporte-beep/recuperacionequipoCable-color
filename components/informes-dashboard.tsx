"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { esRolPanel } from "@/lib/roles";

export function InformesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!esRolPanel(user.rol)) {
      router.replace("/acceso-app");
    }
  }, [ready, user, router]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Informes generales" subtitle="Recuperación">
      <main className="mx-auto grid w-full flex-1 grid-cols-4 gap-4 px-4 py-6 sm:px-6">
        <div className="col-span-4 min-h-[28rem] rounded-md border border-[var(--surface-200)] bg-white px-6 py-10">
          <header className="text-center">
            <p className="m-0 text-base uppercase tracking-wide text-[#5c2d91]">
              CABLE COLOR
            </p>
            <h1 className="m-0 mt-1 text-2xl font-bold uppercase tracking-wide text-black sm:text-3xl">
              ADMINISTRACION DE EQUIPOS
            </h1>
            <p className="m-0 mt-1 text-base uppercase tracking-wide text-black">
              CONTROL DE RECEPCIÓN DE EQUIPOS
            </p>
          </header>
        </div>
      </main>
    </AppShell>
  );
}
