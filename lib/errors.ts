export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "API key inválida o ausente"): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "No tienes permiso para esta acción"): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Recurso no encontrado"): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, "CONFLICT", message, details);
}

export function tooManyRequests(message = "Demasiadas solicitudes"): ApiError {
  return new ApiError(429, "RATE_LIMITED", message);
}

export function internalError(
  message = "Error interno del servidor",
): ApiError {
  return new ApiError(500, "INTERNAL_ERROR", message);
}
