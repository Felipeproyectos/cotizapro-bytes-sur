import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { X, CheckCircle, AlertTriangle, Clock, Eye, RefreshCw } from "lucide-react";
import { getChargeStatus, formatCLP } from "@/lib/recurring";

export default function ClientChargesModal({ clientName, charges, quotesById, onClose }) {
  const sorted = [...charges].sort((a, b) => {
    const da = a.next_billing_date || a.paid_date || a.created_date;
    const db = b.next_billing_date || b.paid_date || b.created_date;
    return new Date(db) - new Date(da);
  });

  const paid = sorted.filter(c => c.status === "pagado");
  const pending = sorted.filter(c => c.status !== "pagado");
  const totalPaid = paid.reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = pending.reduce((s, c) => s + (c.amount || 0), 0);
  const company = sorted[0]?.client_company;
  const quote = quotesById?.[sorted[0]?.quote_id];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{clientName}</h2>
            <p className="text-xs text-slate-400 truncate">
              {company || "Historial de mensualidades"}
              {quote?.client_phone ? ` · ${quote.client_phone}` : ""}
            </p>
            {quote?.client_email && <p className="text-xs text-slate-400 truncate">{quote.client_email}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-2 border-b border-gray-100">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-slate-900">{sorted.length}</p>
            <p className="text-[11px] text-slate-400">Cobros</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-emerald-700">{formatCLP(totalPaid)}</p>
            <p className="text-[11px] text-emerald-500">Pagado</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${totalPending > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
            <p className={`text-sm font-bold ${totalPending > 0 ? "text-amber-700" : "text-slate-500"}`}>{formatCLP(totalPending)}</p>
            <p className={`text-[11px] ${totalPending > 0 ? "text-amber-500" : "text-slate-400"}`}>Pendiente</p>
          </div>
        </div>

        <div className="p-6 space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Sin registros de mensualidades</p>
          )}
          {sorted.map((c) => {
            const s = getChargeStatus(c);
            return (
              <div key={c.id} className={`rounded-xl border px-4 py-3 ${
                s === "pagado" ? "border-gray-100 bg-white" :
                s === "vencido" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {s === "pagado" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      {s === "vencido" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      {(s === "proximo" || s === "programado") && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title || "Servicio mensual"}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.next_billing_date && `Cobro: ${format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })}`}
                      {s === "pagado" && c.paid_date && ` · Pagado: ${format(parseISO(c.paid_date), "dd MMM yyyy", { locale: es })}`}
                    </p>
                    {quotesById?.[c.quote_id]?.quote_number && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Cotización {quotesById[c.quote_id].quote_number}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatCLP(c.amount)}</p>
                    {c.payment_proof_url ? (
                      <a
                        href={c.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 mt-0.5"
                      >
                        <Eye className="w-3 h-3" /> Comprobante
                      </a>
                    ) : (
                      <p className={`text-[11px] mt-0.5 ${
                        s === "pagado" ? "text-emerald-600" : s === "vencido" ? "text-red-500" : "text-amber-600"
                      }`}>
                        {s === "pagado" ? "Pagado" : s === "vencido" ? "Vencido" : "Pendiente"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}