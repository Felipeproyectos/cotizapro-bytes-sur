import { base44 } from "@/api/base44Client";
import {
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  differenceInDays,
} from "date-fns";

export const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

export const monthKeyOf = (date) => format(date, "yyyy-MM");

// Fecha de cobro del servicio dentro de un mes (respeta meses cortos)
export function dueDateOf(charge, monthDate) {
  const day = charge.billing_day || 5;
  const lastDay = endOfMonth(monthDate).getDate();
  return new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(day, lastDay));
}

// ¿El servicio está dentro de su rango de vigencia en ese mes?
export function isActiveInMonth(charge, monthDate) {
  if (charge.active === false) return false;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  if (charge.start_date && isAfter(parseISO(charge.start_date), monthEnd)) return false;
  if (charge.end_date && isBefore(parseISO(charge.end_date), monthStart)) return false;
  return true;
}

export function findPayment(payments, chargeId, monthKey) {
  return (payments || []).find((p) => p.charge_id === chargeId && p.period === monthKey) || null;
}

// pagado | vencido | pendiente
export function chargeStatus(charge, monthDate, payment) {
  if (payment) return "pagado";
  const due = startOfDay(dueDateOf(charge, monthDate));
  return isBefore(due, startOfDay(new Date())) ? "vencido" : "pendiente";
}

export function daysLate(charge, monthDate) {
  const diff = differenceInDays(startOfDay(new Date()), startOfDay(dueDateOf(charge, monthDate)));
  return diff > 0 ? diff : 0;
}

// Registra el pago del mes: la alerta desaparece y queda en el historial
export async function registerPayment(charge, monthDate, file) {
  let proof = null;
  if (file) {
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    proof = file_uri;
  }
  return base44.entities.ChargePayment.create({
    charge_id: charge.id,
    client_name: charge.client_name,
    client_company: charge.client_company || "",
    service_title: charge.title || "Servicio mensual",
    period: monthKeyOf(monthDate),
    due_date: format(dueDateOf(charge, monthDate), "yyyy-MM-dd"),
    amount: charge.amount || 0,
    paid_date: format(new Date(), "yyyy-MM-dd"),
    ...(proof ? { payment_proof_url: proof } : {}),
  });
}

export function openProof(url) {
  if (!url) return;
  if (/^https?:/i.test(url)) {
    window.open(url, "_blank", "noopener");
    return;
  }
  base44.integrations.Core.CreateFileSignedUrl({ file_uri: url, expires_in: 600 })
    .then(({ signed_url }) => window.open(signed_url, "_blank", "noopener"));
}

export function vigenciaLabel(charge) {
  const fmt = (d) => (d ? format(parseISO(d), "dd/MM/yyyy") : "—");
  return `${fmt(charge.start_date)} → ${fmt(charge.end_date)}`;
}