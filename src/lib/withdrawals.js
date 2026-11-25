export const WITHDRAWAL_TYPES = ["Retiro", "Giro", "Transferencia", "Gasto"];

// Destino para gastos de uso general de la empresa (no asignados a un socio)
export const GENERAL_TARGET = { id: "general", full_name: "General" };

// Socios más el destino General
export const withGeneral = (partners) => [...partners, GENERAL_TARGET];

export const formatCLP = (amount) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount || 0);

// Deja solo dígitos: los montos en CLP son enteros positivos
export const parseAmount = (value) => Number(String(value ?? "").replace(/\D/g, "")) || 0;

export const buildDistributions = (partners, amounts) =>
  partners
    .map((p) => ({ partner_id: p.id, partner_name: p.full_name, amount: parseAmount(amounts[p.id]) }))
    .filter((d) => d.amount > 0);

export const sumDistributions = (distributions = []) =>
  distributions.reduce((sum, d) => sum + (d.amount || 0), 0);

// Totales por socio; los movimientos anulados no suman
export const totalsByPartner = (movements) =>
  movements
    .filter((m) => !m.is_voided)
    .flatMap((m) => m.distributions || [])
    .reduce((acc, d) => {
      const current = acc[d.partner_id] || { name: d.partner_name, total: 0 };
      acc[d.partner_id] = { ...current, total: current.total + (d.amount || 0) };
      return acc;
    }, {});
