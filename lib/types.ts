export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  telefono?: string | null;
  zona?: string | null;
  activo?: boolean;
}

export interface Tecnico {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  zona: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TecnicoPayload {
  nombre: string;
  email: string;
  password?: string;
  telefono: string;
  zona: string;
  activo: boolean;
}

export interface OrdenTecnico {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface Orden {
  id: string;
  orden: string;
  cliente: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  telefono: string;
  comentario: string | null;
  estadoAnulacion: string | null;
  tecnicoId?: string | null;
  tecnico?: OrdenTecnico | null;
  createdAt: string;
  updatedAt: string;
}

export interface CiudadAsignacion {
  ciudad: string;
  total: number;
  libres: number;
  asignadas: number;
  otras: number;
}

export interface ResumenAsignacion {
  tecnico: {
    id: string;
    nombre: string;
    zona: string | null;
    activo: boolean;
  } | null;
  totalAsignadas: number;
  ciudades: CiudadAsignacion[];
}

export interface OrdenPayload {
  orden: string;
  cliente: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  telefono: string;
  comentario: string;
}

export interface BulkImportResult {
  inserted: number;
  skipped: number;
  duplicates: string[];
  items: Orden[];
}

export interface ApiErrorBody {
  success: false;
  error?: { code?: string; message?: string };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;
