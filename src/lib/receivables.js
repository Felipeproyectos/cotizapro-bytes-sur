import { differenceInCalendarDays, format } from "date-fns";

/* ─────────── constantes ─────────── */

export const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Otro"];

export const WORK_STATUSES = ["Pendiente", "En ejecución", "Ejecutado", "Cancelado"];

/** Días hacia adelante que se consideran "próximo a vencer". */
export const PROXIMO_VENCER_DIAS = 3;

/* ─────────── formato chileno ─────────── */

export const fmtCLP = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CL")}`;

/** Interpreta "AAAA-MM-DD" como fecha local (evita el desfase de zona horaria). */
export const parseLocalDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const fmtDate = (value) => {
  const d = parseLocalDate(value);
  if (!d) return "—";
  return format(d, "dd-MM-yyyy");
};

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ─────────── montos ─────────── */

export const getTotalAcordado = (q) => {
  const value = q?.total_client ?? q?.total ?? 0;
  return Number(value) || 0;
};

export const getAbonosVigentes = (q) => (q?.abonos || []).filter((a) => !a.anulado);

export const getTotalAbonado = (q) =>
  getAbonosVigentes(q).reduce((sum, a) => sum + (Number(a.monto) || 0), 0);

export const getSaldo = (q) => getTotalAcordado(q) - getTotalAbonado(q);

export const getPaymentStatus = (q) => {
  const saldo = getSaldo(q);
  if (saldo <= 0) return "Pagado";
  if (getTotalAbonado(q) > 0) return "Abonado parcialmente";
  return "Sin pago";
};

/* ─────────── clasificación del trabajo ─────────── */

/**
 * Estado del trabajo. Si la cotización no tiene `work_status` se deduce solo de los
 * estados que ya existían (Ejecutada / Rechazada); el resto queda "Sin clasificar"
 * para que el usuario lo defina explícitamente.
 */
export const resolveWorkStatus = (q) => {
  if (q?.work_status) return q.work_status;
  if (q?.status === "Ejecutada") return "Ejecutado";
  if (q?.status === "Rechazada") return "Cancelado";
  return null;
};

export const workStatusLabel = (q) => resolveWorkStatus(q) || "Sin clasificar";

/** Las mensualidades se cobran desde el módulo de Servicios mensuales. */
export const isMonthly = (q) => q?.billing_type === "Mensual";

export const isReceivable = (q) =>
  !isMonthly(q) && resolveWorkStatus(q) === "Ejecutado" && getSaldo(q) > 0;

export const getDaysOverdue = (q) => {
  const due = parseLocalDate(q?.payment_due_date);
  if (!due) return null;
  return differenceInCalendarDays(todayStart(), due);
};

/**
 * Indicador visual de cobranza.
 * keys: pagado | sin_fecha | vencido | por_vencer | al_dia
 */
export const getCollectionState = (q) => {
  if (getSaldo(q) <= 0) {
    return { key: "pagado", label: "Pagado", badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" };
  }
  const days = getDaysOverdue(q);
  if (days === null) {
    return { key: "sin_fecha", label: "Sin vencimiento", badge: "bg-gray-100 text-slate-500", dot: "bg-slate-300" };
  }
  if (days > 0) {
    return { key: "vencido", label: `Vencido ${days} d`, badge: "bg-red-50 text-red-600", dot: "bg-red-500", days };
  }
  const remaining = -days;
  if (remaining <= PROXIMO_VENCER_DIAS) {
    return {
      key: "por_vencer",
      label: remaining === 0 ? "Vence hoy" : `Vence en ${remaining} d`,
      badge: "bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
      days: remaining,
    };
  }
  return { key: "al_dia", label: "Al día", badge: "bg-blue-50 text-blue-600", dot: "bg-blue-500", days: remaining };
};

export const getPaymentBadge = (q) => {
  const s = getPaymentStatus(q);
  if (s === "Pagado") return "bg-emerald-50 text-emerald-600";
  if (s === "Abonado parcialmente") return "bg-amber-50 text-amber-600";
  return "bg-slate-100 text-slate-500";
};

export const AGING_BUCKETS = [
  { key: "todas", label: "Todas" },
  { key: "al_dia", label: "Al día" },
  { key: "d1_30", label: "1-30 días" },
  { key: "d31_60", label: "31-60 días" },
  { key: "d60", label: "+60 días" },
  { key: "sin_fecha", label: "Sin vencimiento" },
];

export const getAgingBucket = (q) => {
  const days = getDaysOverdue(q);
  if (days === null) return "sin_fecha";
  if (days <= 0) return "al_dia";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  return "d60";
};

/* ─────────── resúmenes ─────────── */

export const summarizeReceivables = (quotes) => {
  const pending = quotes.filter(isReceivable);
  let totalPendiente = 0;
  let totalVencido = 0;
  let vencidos = 0;
  let porVencer = 0;
  let totalPorVencer = 0;
  const clientes = new Set();

  pending.forEach((q) => {
    const saldo = getSaldo(q);
    totalPendiente += saldo;
    clientes.add((q.client_company || q.client_name || "").trim().toLowerCase());
    const state = getCollectionState(q);
    if (state.key === "vencido") {
      totalVencido += saldo;
      vencidos += 1;
    }
    if (state.key === "por_vencer") {
      porVencer += 1;
      totalPorVencer += saldo;
    }
  });

  return {
    items: pending,
    countTrabajos: pending.length,
    countClientes: [...clientes].filter(Boolean).length,
    totalPendiente,
    totalVencido,
    vencidos,
    porVencer,
    totalPorVencer,
  };
};

/** Orden por defecto: vencidos primero y luego por vencimiento más próximo. */
export const sortReceivables = (list, mode = "prioridad") => {
  const copy = [...list];
  if (mode === "saldo") return copy.sort((a, b) => getSaldo(b) - getSaldo(a));
  if (mode === "cliente") {
    return copy.sort((a, b) =>
      (a.client_company || a.client_name || "").localeCompare(b.client_company || b.client_name || "", "es")
    );
  }
  return copy.sort((a, b) => {
    const da = getDaysOverdue(a);
    const db = getDaysOverdue(b);
    const rankA = da === null ? 2 : da > 0 ? 0 : 1;
    const rankB = db === null ? 2 : db > 0 ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;
    if (rankA === 0) return db - da;
    if (rankA === 1) return da - db;
    return getSaldo(b) - getSaldo(a);
  });
};

export const workSummary = (q) => {
  const items = q.items || [];
  const regular = items.filter((i) => !i.is_operational_expense);
  const source = regular.length ? regular : items;
  if (!source.length) return q.title || "Sin detalle";
  if (source.length === 1) return source[0].service_name || source[0].description || q.title || "Sin detalle";
  const first = source[0].service_name || source[0].description || "Servicio";
  return `${first} (+${source.length - 1} ítem${source.length - 1 > 1 ? "s" : ""})`;
};

/* ─────────── exportación ─────────── */

export const RECEIVABLE_CSV_HEADERS = [
  "Cotización",
  "Cliente",
  "Empresa",
  "Trabajo",
  "Fecha ejecución",
  "Total acordado",
  "Total abonado",
  "Saldo pendiente",
  "Vencimiento",
  "Días de atraso",
  "Estado del pago",
  "Estado de cobranza",
];

export const receivablesToCsv = (quotes) => {
  const rows = quotes.map((q) => {
    const days = getDaysOverdue(q);
    return [
      q.quote_number || "",
      q.client_name || "",
      q.client_company || "",
      workSummary(q),
      q.executed_date ? fmtDate(q.executed_date) : "",
      getTotalAcordado(q),
      getTotalAbonado(q),
      getSaldo(q),
      q.payment_due_date ? fmtDate(q.payment_due_date) : "Sin fecha",
      days !== null && days > 0 ? days : 0,
      getPaymentStatus(q),
      getCollectionState(q).label,
    ];
  });
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  return [RECEIVABLE_CSV_HEADERS, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
};

export const downloadReceivablesCsv = (quotes) => {
  const csv = `\uFEFF${receivablesToCsv(quotes)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cuentas-por-cobrar-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};