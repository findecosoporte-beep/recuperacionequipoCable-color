import { NextRequest, NextResponse } from "next/server";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import { ZodError } from "zod";
import { corsAllowOrigin, getAllowedOrigins } from "@/lib/env";
import { ApiError, badRequest, internalError } from "@/lib/errors";
import { assertAuth } from "@/lib/auth";
import { enforceRateLimit, type RateLimitKind } from "@/lib/rate-limit";

type RouteParams = Record<string, string>;

type Handler = (
  request: NextRequest,
  params: RouteParams,
) => Promise<NextResponse> | NextResponse;

interface HandlerOptions {
  auth?: boolean;
  rateLimit?: boolean | RateLimitKind;
}

function resolveAllowedOrigin(origin: string | null): string {
  return corsAllowOrigin(origin, getAllowedOrigins());
}

export function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function securityHeaders(): HeadersInit {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  };
}

export async function readJson(
  request: NextRequest,
  options: { maxBytes?: number } = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? 512_000;
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length) && length > maxBytes) {
      throw badRequest(`El cuerpo no puede superar ${Math.floor(maxBytes / 1024)} KB`);
    }
  }
  try {
    return await request.json();
  } catch {
    throw badRequest("El cuerpo de la solicitud no es un JSON válido");
  }
}

export function json<T>(
  data: T,
  status = 200,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...extra,
    },
    { status },
  );
}

export function errorResponse(error: ApiError): NextResponse {
  const headers: Record<string, string> = {};
  if (error.retryAfterSeconds && error.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    },
    { status: error.status, headers },
  );
}

function fromUnknown(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ApiError(400, "VALIDATION_ERROR", "Datos inválidos", error.issues);
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const fields = error.meta?.target;
      const fieldList = Array.isArray(fields)
        ? fields.join(",")
        : String(fields ?? "");
      const message = fieldList.includes("email")
        ? "Ya existe un usuario con ese email"
        : fieldList.includes("orden")
          ? "Ya existe una orden con ese número"
          : "Ya existe un registro con ese valor";
      return new ApiError(409, "CONFLICT", message, {
        fields: error.meta?.target,
      });
    }
    if (error.code === "P2025") {
      return new ApiError(404, "NOT_FOUND", "Orden no encontrada");
    }
  }

  if (error instanceof SyntaxError) {
    return new ApiError(400, "BAD_REQUEST", "El cuerpo no es un JSON válido");
  }

  if (isDatabaseUnavailable(error)) {
    return new ApiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Base de datos no disponible",
    );
  }

  console.error("[api]", error);
  return internalError();
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof PrismaClientInitializationError) {
    return true;
  }
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const maybe = error as { name?: string; message?: string; constructor?: { name?: string } };
  return (
    maybe.name === "PrismaClientInitializationError" ||
    maybe.constructor?.name === "PrismaClientInitializationError" ||
    (typeof maybe.message === "string" &&
      maybe.message.includes("Can't reach database server"))
  );
}

function applyCommonHeaders(response: NextResponse, origin: string | null): NextResponse {
  const headers = {
    ...corsHeaders(origin),
    ...securityHeaders(),
  };
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function apiHandler(handler: Handler, options: HandlerOptions = {}) {
  const { auth = true, rateLimit = true } = options;

  return async (
    request: NextRequest,
    context?: { params?: Promise<RouteParams> },
  ): Promise<NextResponse> => {
    const origin = request.headers.get("origin");
    const started = Date.now();

    if (request.method === "OPTIONS") {
      return applyCommonHeaders(new NextResponse(null, { status: 204 }), origin);
    }

    try {
      if (rateLimit) {
        await enforceRateLimit(
          request,
          rateLimit === true ? "api" : rateLimit,
        );
      }
      if (auth) {
        await assertAuth(request);
      }

      const params = context?.params ? await context.params : {};
      const response = await handler(request, params);
      applyCommonHeaders(response, origin);

      console.info(
        JSON.stringify({
          method: request.method,
          path: request.nextUrl.pathname,
          status: response.status,
          ms: Date.now() - started,
        }),
      );

      return response;
    } catch (error) {
      const apiError = fromUnknown(error);
      const response = applyCommonHeaders(errorResponse(apiError), origin);
      console.info(
        JSON.stringify({
          method: request.method,
          path: request.nextUrl.pathname,
          status: apiError.status,
          code: apiError.code,
          ms: Date.now() - started,
        }),
      );
      return response;
    }
  };
}

export const handleOptions = apiHandler(
  async () => new NextResponse(null, { status: 204 }),
  { auth: false, rateLimit: false },
);
