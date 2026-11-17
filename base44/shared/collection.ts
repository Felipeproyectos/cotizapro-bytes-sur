export const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Otro"];
export const WORK_STATUSES = ["Pendiente", "En ejecución", "Por entregar", "Ejecutado", "Cancelado"];

const isDateString = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const todayString = () => new Date().toISOString().slice(0, 10);

export const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CL")}`;

export function computeTotals(quote) {
  const total = Number(quote?.total_client ?? quote?.total ?? 0) || 0;
  const abonado = (quote?.abonos || [])
    .filter((a) => !a.anulado)
    .reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  return { total, abonado, saldo: total - abonado };
}

const logEntry = (type, text, user) => ({
  at: new Date().toISOString(),
  type,
  text,
  user: user?.email || user?.full_name || "sistema",
});

/**
 * Aplica una acción de cobranza sobre una cotización, con validación en servidor.
 * Devuelve { quote } o { error: { status, message } }.
 */
export async function runAction(base44, body, user) {
  const { quoteId, action } = body;
  const quote = await base44.asServiceRole.entities.Quote.get(quoteId).catch((e) =>
    e.status === 404 ? null : Promise.reject(e)
  );
  if (!quote) return { error: { status: 404, message: "Cotización no encontrada" } };

  const abonos = Array.isArray(quote.abonos) ? [...quote.abonos] : [];
  const log = Array.isArray(quote.collection_log) ? [...quote.collection_log] : [];
  const totals = computeTotals(quote);
  const updates = {};

  if (action === "add_payment") {
    const monto = Number(body.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return { error: { status: 400, message: "El monto debe ser un número mayor a cero" } };
    }
    if (!isDateString(body.fecha)) {
      return { error: { status: 400, message: "La fecha del pago debe tener formato AAAA-MM-DD" } };
    }
    if (!body.requestId) {
      return { error: { status: 400, message: "Falta la clave de la operación (requestId)" } };
    }
    if (abonos.some((a) => a.request_id === body.requestId)) {
      return { quote, duplicate: true };
    }
    if (monto > totals.saldo + 0.5) {
      return {
        error: { status: 400, message: `El monto excede el saldo pendiente (${money(totals.saldo)})` },
      };
    }
    const medio = MEDIOS_PAGO.includes(body.medio_pago) ? body.medio_pago : "Otro";
    const entry = {
      id: crypto.randomUUID(),
      fecha: body.fecha,
      monto: Math.round(monto),
      medio_pago: medio,
      referencia: String(body.referencia || "").trim().slice(0, 120),
      nota: String(body.observaciones || "").trim().slice(0, 500),
      registrado_por: user?.email || user?.full_name || "",
      registrado_at: new Date().toISOString(),
      request_id: body.requestId,
      anulado: false,
    };
    abonos.push(entry);
    updates.abonos = abonos;
    log.push(
      logEntry(
        "pago",
        `Abono de ${money(entry.monto)} vía ${medio}${entry.referencia ? ` (ref. ${entry.referencia})` : ""}. Saldo pendiente: ${money(
          Math.max(0, totals.saldo - entry.monto)
        )}.`,
        user
      )
    );
    updates.collection_log = log;
  } else if (action === "void_payment") {
    const index = abonos.findIndex((a) => a.id && a.id === body.abonoId);
    if (index === -1) {
      return { error: { status: 404, message: "Abono no encontrado" } };
    }
    if (abonos[index].anulado) {
      return { error: { status: 400, message: "Este abono ya está anulado" } };
    }
    const motivo = String(body.motivo || "").trim().slice(0, 300);
    abonos[index] = {
      ...abonos[index],
      anulado: true,
      anulado_por: user?.email || user?.full_name || "",
      anulado_at: new Date().toISOString(),
      anulado_motivo: motivo,
    };
    updates.abonos = abonos;
    log.push(
      logEntry(
        "anulacion",
        `Se anuló el abono de ${money(abonos[index].monto)} del ${abonos[index].fecha}${motivo ? ` — ${motivo}` : ""}.`,
        user
      )
    );
    updates.collection_log = log;
  } else if (action === "add_note") {
    const text = String(body.text || "").trim();
    if (!text) return { error: { status: 400, message: "La observación no puede estar vacía" } };
    log.push(logEntry("nota", text.slice(0, 1000), user));
    if (isDateString(body.next_followup_date)) {
      updates.next_followup_date = body.next_followup_date;
      log.push(logEntry("seguimiento", `Próximo seguimiento agendado para ${body.next_followup_date}.`, user));
    }
    updates.collection_log = log;
  } else if (action === "set_followup") {
    if (body.next_followup_date && !isDateString(body.next_followup_date)) {
      return { error: { status: 400, message: "Fecha de seguimiento inválida" } };
    }
    updates.next_followup_date = body.next_followup_date || null;
    log.push(
      logEntry(
        "seguimiento",
        body.next_followup_date
          ? `Próximo seguimiento agendado para ${body.next_followup_date}.`
          : "Se quitó la fecha de próximo seguimiento.",
        user
      )
    );
    updates.collection_log = log;
  } else if (action === "set_due_date") {
    if (body.payment_due_date && !isDateString(body.payment_due_date)) {
      return { error: { status: 400, message: "Fecha de vencimiento inválida" } };
    }
    updates.payment_due_date = body.payment_due_date || null;
    log.push(
      logEntry(
        "vencimiento",
        body.payment_due_date
          ? `Vencimiento del pago definido para ${body.payment_due_date}.`
          : "Se quitó la fecha de vencimiento del pago.",
        user
      )
    );
    updates.collection_log = log;
  } else if (action === "set_work_status") {
    if (!WORK_STATUSES.includes(body.work_status)) {
      return { error: { status: 400, message: "Estado del trabajo inválido" } };
    }
    updates.work_status = body.work_status;
    if (body.work_status === "Ejecutado") {
      updates.status = "Ejecutada";
      updates.executed_date =
        isDateString(body.executed_date) ? body.executed_date : quote.executed_date || todayString();
    } else if (body.work_status === "Cancelado") {
      updates.status = "Rechazada";
    } else {
      updates.status = "Aceptada";
    }
    log.push(logEntry("estado", `Estado del trabajo: ${body.work_status}.`, user));
    updates.collection_log = log;
  } else {
    return { error: { status: 400, message: "Acción no reconocida" } };
  }

  const updated = await base44.asServiceRole.entities.Quote.update(quoteId, updates);
  return { quote: updated };
}