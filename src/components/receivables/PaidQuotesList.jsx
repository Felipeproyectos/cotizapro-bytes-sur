import { ChevronRight } from "lucide-react";
import { fmtCLP, fmtDate, getTotalAcordado, getTotalAbonado, getAbonosVigentes } from "@/lib/receivables";

export default function PaidQuotesList({ quotes, onOpen }) {
  if (!quotes.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-sm text-slate-400">Aún no hay cotizaciones ejecutadas completamente pagadas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-slate-50/60">
            <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 pl-4 pr-2">Cotización</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Cliente</th>
            <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Total</th>
            <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Abonado</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Abonos</th>
            <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Último pago</th>
            <th className="py-2.5 pl-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const abonos = getAbonosVigentes(q).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
            return (
              <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/60">
                <td className="py-2.5 pl-4 pr-2 align-top">
                  <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">{q.quote_number}</p>
                  <p className="text-[11px] text-slate-400">{q.executed_date ? fmtDate(q.executed_date) : "—"}</p>
                </td>
                <td className="py-2.5 px-2 align-top">
                  <p className="text-xs font-medium text-slate-900 truncate max-w-[150px]">{q.client_name}</p>
                  {q.client_company && <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{q.client_company}</p>}
                </td>
                <td className="py-2.5 px-2 text-right align-top text-xs text-slate-600 whitespace-nowrap">{fmtCLP(getTotalAcordado(q))}</td>
                <td className="py-2.5 px-2 text-right align-top text-xs font-semibold text-emerald-600 whitespace-nowrap">{fmtCLP(getTotalAbonado(q))}</td>
                <td className="py-2.5 px-2 align-top text-xs text-slate-500">{abonos.length}</td>
                <td className="py-2.5 px-2 align-top text-xs text-slate-500 whitespace-nowrap">{abonos[0] ? fmtDate(abonos[0].fecha) : "—"}</td>
                <td className="py-2.5 pl-2 pr-4 text-right align-top">
                  <button
                    onClick={() => onOpen(q)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-slate-400 whitespace-nowrap"
                  >
                    Ver pagos <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}