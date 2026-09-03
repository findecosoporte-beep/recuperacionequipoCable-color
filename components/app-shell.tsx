"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { useAuth } from "@/components/auth-provider";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = useMemo<MenuItem[]>(
    () => [
      {
        label: "Órdenes",
        icon: "pi pi-list",
        className: pathname === "/" ? "ordenes-menu-active" : undefined,
        command: () => {
          router.push("/");
        },
      },
      {
        label: "Estado",
        icon: "pi pi-check-square",
        className: pathname === "/estado" ? "ordenes-menu-active" : undefined,
        command: () => {
          router.push("/estado");
        },
      },
      {
        label: "Acuses",
        icon: "pi pi-file",
        className: pathname === "/acuses" ? "ordenes-menu-active" : undefined,
        command: () => {
          router.push("/acuses");
        },
      },
      {
        label: "Técnicos",
        icon: "pi pi-users",
        className: pathname === "/tecnicos" ? "ordenes-menu-active" : undefined,
        command: () => {
          router.push("/tecnicos");
        },
      },
      {
        label: "Asignación",
        icon: "pi pi-map-marker",
        className: pathname === "/asignacion" ? "ordenes-menu-active" : undefined,
        command: () => {
          router.push("/asignacion");
        },
      },
    ],
    [pathname, router],
  );

  return (
    <div className="ordenes-shell">
      <aside className="ordenes-sidebar">
        <div className="ordenes-sidebar-inner">
          <div className="ordenes-sidebar-brand">
            <img
              src="/cable-color.jpg"
              alt="Cable Color"
              className="ordenes-sidebar-logo"
            />
            <p className="ordenes-sidebar-kicker">Cable Color</p>
            <p className="ordenes-sidebar-title">Panel de órdenes</p>
          </div>
          <Menu model={items} popup={false} className="ordenes-sidebar-menu" />
          <div className="ordenes-sidebar-footer">
            {user ? (
              <>
                <p className="ordenes-sidebar-user">{user.nombre}</p>
                <Button
                  type="button"
                  label="Salir"
                  icon="pi pi-sign-out"
                  outlined
                  className="w-full"
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                />
              </>
            ) : (
              <Button
                type="button"
                label="Entrar"
                icon="pi pi-sign-in"
                className="w-full"
                onClick={() => {
                  router.push("/login");
                }}
              />
            )}
          </div>
        </div>
      </aside>

      <div className="ordenes-shell-main">
        <header className="ordenes-app-header">
          <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6">
            <div>
              {subtitle ? (
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                  {subtitle}
                </p>
              ) : null}
              <h1 className="m-0 text-xl font-semibold">{title}</h1>
            </div>
          </div>
        </header>
        <div className="ordenes-shell-content">{children}</div>
      </div>
    </div>
  );
}
