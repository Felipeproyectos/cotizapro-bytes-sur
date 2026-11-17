import { base44 } from "@/api/base44Client";

/** Llama la función de servidor que valida y registra la gestión de cobranza. */
export async function sendCollectionAction(quoteId, action, payload = {}) {
  try {
    const res = await base44.functions.invoke("updateQuoteCollection", { quoteId, action, ...payload });
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  } catch (err) {
    const status = err?.response?.status || err?.status;
    const message = err?.response?.data?.error || err?.message || "No se pudo completar la operación";
    if (status === 401 || message === "No autenticado") {
      base44.auth.redirectToLogin(window.location.href);
      throw new Error("Debes iniciar sesión para continuar. Redirigiendo al inicio de sesión…");
    }
    throw new Error(message);
  }
}

export const newRequestId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);