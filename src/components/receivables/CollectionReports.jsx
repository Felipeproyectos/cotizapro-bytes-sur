import { useMemo, useState } from "react";
import { format } from "date-fns";
import { TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import PaidQuotesList from "./PaidQuotesList";
import { fmtCLP, getAbonosVigentes, getSaldo, getDaysOverdue, isReceivable } from "@/lib/receivables";

export default function CollectionReports({ quotes, onOpen }) {
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));

  const receivables = quotes.filter(isReceivable);
  const totalPendiente = receivables.reduce((s, q) => s + getSaldo(q), 0);
  const totalVencido = receivables.reduce((s, q) => {
    const days = getDaysOverdue(q);
    return days !== null && days > 0 ? s + getSaldo(q) : s;
  }, 0);

  const recaudado = quotes.reduce(
    (sum, q) =>
      sum +
      getAbonosVigentes(q)
        .filter((a) => (a.fecha || "").slice(0, 7) === period)
        .reduce((s, a) => s + (Number(a.monto) || 0), 0),
    0
  );

  const topDebtors = useMemo(() => {
    const map = new Map();
    receivables.forEach((q) => {
      const key = (q.client_company || q.client_name || "Sin nombre").trim();
      map.set(key, (map.get(key) || 0) + getSaldo(q));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [receivables]);

  const paidQuotes = quotes.filter((q) => getSaldo(q) <= 0 && getAbonosVigentes(q).length > 0);

  const card = "bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3";
  const iconBox = "w-9 h-9 rounded-xl flex items-center justify-center shrink-0";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Resumen y recaudación</h2>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">Período</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={card}>
          <div className={`${iconBox} bg-slate-900`}><Wallet className="w-4 h-4 text-white" /></div>
          <div>
            <p className="text-xs text-slate-500">Total por cobrar</p>
            <p className="text-lg font-bold text-slate-900">{fmtCLP(totalPendiente)}</p>
          </div>
        </div>
        <div className={card}>
          <div className={`${iconBox} bg-red-500`}><AlertTriangle className="w-4 h-4 text-white" /></div>
          <div>
            <p className="text-xs text-slate-500">Total vencido</p>
            <p className="text-lg font-bold text-slate-900">{fmtCLP(totalVencido)}</p>
          </div>
        </div>
        <div className={card}>
          <div className={`${iconBox} bg-emerald-500`}><TrendingUp className="w-4 h-4 text-white" /></div>
          <div>
            <p className="text-xs text-slate-500">Recaudado en {period}</p>
            <p className="text-lg font-bold text-slate-900">{fmtCLP(recaudado)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-slate-900 mb-3">Clientes con mayor saldo pendiente</p>
        {!topDebtors.length ? (
          <p className="text-[11px] text-slate-400">Sin deudas pendientes.</p>
        ) : (
          <div className="space-y-2">
            {topDebtors.map(([name, saldo]) => {
              const max = topDebtors[0][1] || 1;
              return (
                <div key={name} className="flex items-center gap-3">
                  <p className="text-xs text-slate-700 w-40 truncate">{name}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: `${Math.max(6, (saldo / max) * 100)}%` }} />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 w-24 text-right">{fmtCLP(saldo)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-900 mb-2">Historial de cotizaciones pagadas</p>
        <PaidQuotesList quotes={paidQuotes} onOpen={onOpen} />
      </div>
    </div>
  );
}