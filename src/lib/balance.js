// Saldo disponible de la cuenta principal: saldo inicial + mensualidades cobradas - retiros,
// considerando solo lo registrado después del corte (lo anterior ya está en el saldo inicial).
export const OPENING_BALANCE = {
  amount: 375420,
  setAt: "2026-11-25T14:25:00Z",
  date: "2026-11-25",
};

// Base44 entrega created_date en UTC, a veces sin indicar la zona
const toTime = (value) => {
  if (!value) return NaN;
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
};

const isAfterCut = (createdDate, date, opening) =>
  toTime(createdDate) > toTime(opening.setAt) && (!date || date.substring(0, 10) >= opening.date);

// Une ingresos y retiros (más recientes primero), cada uno con el saldo que queda tras él.
// balanceAfter es null en los movimientos que no afectan el saldo (anteriores al corte o anulados).
export function buildLedger(withdrawals, payments, opening = OPENING_BALANCE) {
  const outgoing = withdrawals.map((w) => ({
    kind: "withdrawal",
    key: `w-${w.id}`,
    date: w.date?.substring(0, 10) || "",
    created: w.created_date,
    amount: w.total_amount || 0,
    counts: !w.is_voided && isAfterCut(w.created_date, w.date, opening),
    data: w,
  }));

  const incoming = payments
    .filter((p) => isAfterCut(p.created_date, p.paid_date, opening))
    .map((p) => ({
      kind: "income",
      key: `p-${p.id}`,
      date: (p.paid_date || p.created_date || "").substring(0, 10),
      created: p.created_date,
      amount: p.amount || 0,
      counts: true,
      data: p,
    }));

  let balance = opening.amount;
  const entries = [...outgoing, ...incoming]
    .sort((a, b) => a.date.localeCompare(b.date) || (toTime(a.created) || 0) - (toTime(b.created) || 0))
    .map((e) => {
      if (!e.counts) return { ...e, balanceAfter: null };
      balance += e.kind === "income" ? e.amount : -e.amount;
      return { ...e, balanceAfter: balance };
    })
    .reverse();

  return { entries, balance };
}
