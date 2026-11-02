import { base44 } from "@/api/base44Client";
import { addMonths, differenceInDays, isPast, isToday, parseISO } from "date-fns";

// Mes al que pertenece un cobro (formato 'yyyy-MM')
export function chargeMonthKey(charge) {
  const date = charge?.next_billing_date || charge?.paid_date;
  if (!date) return null;
  return String(date).slice(0, 7);
}

// Estado de un cobro: pagado | vencido | proximo | programado
export function getChargeStatus(charge) {
  if (charge?.status === "pagado") return "pagado";
  if (!charge?.next_billing_date) return "programado";
  const d = parseISO(charge.next_billing_date);
  if (isPast(d) || isToday(d)) return "vencido";
  if (differenceInDays(d, new Date()) <= 7) return "proximo";
  return "programado";
}

export function daysOverdue(charge) {
  if (!charge?.next_billing_date) return 0;
  const diff = differenceInDays(new Date(), parseISO(charge.next_billing_date));
  return diff > 0 ? diff : 0;
}

// Marca el cobro como pagado y genera el cobro del mes siguiente
export async function markChargePaid(charge, proofUrl) {
  const today = new Date().toISOString().split("T")[0];
  const current = charge.next_billing_date ? parseISO(charge.next_billing_date) : new Date();
  const next = addMonths(current, 1);

  const updates = { status: "pagado", paid_date: today, active: false };
  if (proofUrl) updates.payment_proof_url = proofUrl;

  await base44.entities.RecurringCharge.update(charge.id, updates);
  await base44.entities.RecurringCharge.create({
    quote_id: charge.quote_id,
    client_name: charge.client_name,
    client_company: charge.client_company || "",
    title: charge.title,
    amount: charge.amount,
    billing_day: charge.billing_day,
    next_billing_date: next.toISOString().split("T")[0],
    status: "pendiente",
    active: true,
  });
}

export const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;