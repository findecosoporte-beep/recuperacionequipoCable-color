"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { useAuth } from "@/components/auth-provider";
import { esRolPanel } from "@/lib/roles";

export default function AccesoAppPage() {
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (esRolPanel(user.rol)) {
      router.replace("/");
    }
  }, [ready, user, router]);

  if (!ready || !user || esRolPanel(user.rol)) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md" title="App de campo">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-color)]">
          Técnico recuperador
        </p>
        <p className="mb-6 mt-2 text-sm text-[var(--text-color-secondary)]">
          Hola {user.nombre}. Esta cuenta es para la aplicación de técnicos, no
          para el panel web. Entra desde el celular con el mismo email y
          contraseña.
        </p>
        <Button
          type="button"
          label="Salir"
          icon="pi pi-sign-out"
          className="w-full"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        />
      </Card>
    </div>
  );
}
