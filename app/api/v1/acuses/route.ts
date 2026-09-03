import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { listAcuses } from "@/lib/acuses";
import { acuseListQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = acuseListQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await listAcuses(query);
  return json(result.items, 200, { meta: result.meta });
});
