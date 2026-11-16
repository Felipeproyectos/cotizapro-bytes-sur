import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { sendCollectionAction } from "@/lib/collectionApi";
import { fmtCLP, fmtDate, getTotalAcordado, getSaldo, workSummary } from "@/lib/receivables";

export default function ClassificationTable({ quotes, onClassified }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const classify = async (quote, work_status) => {
    setError("");
    setBusyId(quote.id);
    try {
      const res = await sendCollectionAction(quote.id, "set_work_status", { work_status });
      if (res.quote) onClassified(res.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!quotes.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <p className="text-sm text-slate-400">Todas las cotizaciones aceptadas o enviadas están clasificadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="bg-slate-50 border border-gray-100 rounded-2xl p-3">
        <p className="text-[11px] text-slate-500">
          Estas cotizaciones todavía no tienen estado de trabajo definido. Márcalas como ejecutadas solo cuando el trabajo esté terminado:
          entonces entrarán a cuentas por cobrar con su saldo real.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50/60">
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 pl-4 pr-2">Cotización</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Cliente</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Trabajo</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Total / Saldo</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Estado cotización</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2 pr-4">Clasificar</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/60">
                <td className="py-2.5 pl-4 pr-2 align-top">
                  <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">{q.quote_number}</p>
                  <p className="text-[11px] text-slate-400">{fmtDate(q.created_date)}</p>
                </td>
                <td className="py-2.5 px-2 align-top">
                  <p className="text-xs font-medium text-slate-900 truncate max-w-[150px]">{q.client_name}</p>
                  {q.client_company && <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{q.client_company}</p>}
                </td>
                <td className="py-2.5 px-2 align-top">
                  <p className="text-xs text-slate-600 truncate max-w-[180px]">{workSummary(q)}</p>
                </td>
                <td className="py-2.5 px-2 align-top text-right whitespace-nowrap">
                  <p className="text-[11px] text-slate-400">{fmtCLP(getTotalAcordado(q))}</p>
                  <p className="text-xs font-semibold text-slate-900">{fmtCLP(getSaldo(q))}</p>
                </td>
                <td className="py-2.5 px-2 align-top">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{q.status}</span>
                </td>
                <td className="py-2.5 px-2 pr-4 align-top">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => classify(q, "Ejecutado")}
                      disabled={busyId === q.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg px-2 py-1.5 hover:bg-emerald-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {busyId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Ejecutado
                    </button>
                    <button
                      onClick={() => classify(q, "Cancelado")}
                      disabled={busyId === q.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      <XCircle className="w-3 h-3" /> Cancelado
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}