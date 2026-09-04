export const ROLES = {
  admin: "admin",
  operador: "operador",
  tecnico: "tecnico",
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

export const ROL_TECNICO = ROLES.tecnico;

export function esRolPanel(rol: string): boolean {
  return rol === ROLES.admin || rol === ROLES.operador;
}

export function esAdmin(rol: string): boolean {
  return rol === ROLES.admin;
}

export function usuarioSesionValida(
  user: { activo: boolean } | null | undefined,
): boolean {
  return Boolean(user?.activo);
}

export type AccionAdmin = "tecnicos.write" | "ordenes.delete";

export function puedeAccionAdmin(
  actor: { kind: "jwt"; rol: string } | { kind: "api_key" },
  _accion: AccionAdmin,
): boolean {
  if (actor.kind === "api_key") return true;
  return esAdmin(actor.rol);
}

export function etiquetaRol(rol: string): string {
  if (rol === ROLES.tecnico) return "Técnico recuperador";
  if (rol === ROLES.admin) return "Administrador";
  if (rol === ROLES.operador) return "Operador";
  return rol;
}
