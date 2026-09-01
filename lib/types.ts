export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
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
  createdAt: string;
  updatedAt: string;
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
