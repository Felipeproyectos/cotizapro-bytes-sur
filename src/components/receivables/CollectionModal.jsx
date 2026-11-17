import { useEffect, useState } from "react";
import { X, CalendarClock, ListOrdered } from "lucide-react";
import QuoteItemsBreakdown from "./QuoteItemsBreakdown";
import PaymentForm from "./PaymentForm";
import PaymentsList from "./PaymentsList";
import CollectionStatusPanel from "./CollectionStatusPanel";
import CollectionTimeline from "./CollectionTimeline";
import {
  fmtCLP,
  fmtDate,
  getTotalAcordado,
  getTotalAbonado,
  getSaldo,
  getPaymentStatus,
  getPaymentBadge,
  getCollectionState,
  workSummary,
  resolveWorkStatus,
} from "@/lib/receivables";

export default function CollectionModal({ quote, onClose, onUpdated }) {
  const [current, setCurrent] = useState(quote);

  useEffect(() => {
    setCurrent(quote);
  }, [quote]);

  const handleUpdated = (updated) => {
    setCurrent(updated);
    onUpdated(updated);
  };

  const saldo = getSaldo(current);
  const state = getCollectionState(current);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start md:items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{current.client_name}</p>
            <p className="text-[11px] text-slate-500">
              {current.quote_number}
              {current.client_company ? ` · ${current.client_company}` : ""} · {workSummary(current)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                Trabajo: {resolveWorkStatus(current) || "Sin clasificar"}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getPaymentBadge(current)}`}>
                {getPaymentStatus(current)}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${state.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} /> {state.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total acordado</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{fmtCLP(getTotalAcordado(current))}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total abonado</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{fmtCLP(getTotalAbonado(current))}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Saldo pendiente</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmtCLP(saldo)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 bg-slate-50/60 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                Detalle de la cotización
              </p>
            </div>
            <div className="px-4 py-3">
              <QuoteItemsBreakdown quote={current} showSaldo={false} />
            </div>
          </div>

          {current.payment_due_date && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
              Vence el {fmtDate(current.payment_due_date)}
              {current.next_followup_date ? ` · próximo seguimiento ${fmtDate(current.next_followup_date)}` : ""}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {saldo > 0 ? (
                <PaymentForm quote={current} saldo={saldo} onUpdated={handleUpdated} />
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-emerald-700">Pago completado</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Esta cotización no tiene saldo pendiente.</p>
                </div>
              )}
              <PaymentsList quote={current} onUpdated={handleUpdated} />
            </div>
            <div className="space-y-4">
              <CollectionStatusPanel quote={current} onUpdated={handleUpdated} />
              <CollectionTimeline quote={current} onUpdated={handleUpdated} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}