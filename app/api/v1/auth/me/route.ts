import { requireSessionUser } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request) => {
  const user = await requireSessionUser(request);
  return json(user);
});
