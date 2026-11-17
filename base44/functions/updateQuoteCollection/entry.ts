import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { runAction } from "../../shared/collection.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    // App pública: si no hay sesión se registra como "Usuario de la app"
    const user = authUser || { email: "publico", full_name: "Usuario de la app" };

    const body = await req.json().catch(() => ({}));
    if (!body.quoteId || !body.action) {
      return Response.json({ error: "quoteId y action son obligatorios" }, { status: 400 });
    }

    const result = await runAction(base44, body, user);
    if (result.error) {
      return Response.json({ error: result.error.message }, { status: result.error.status });
    }
    return Response.json({ success: true, duplicate: !!result.duplicate, quote: result.quote });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}