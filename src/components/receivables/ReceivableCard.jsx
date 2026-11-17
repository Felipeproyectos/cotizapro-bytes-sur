import { useState } from "react";
import { ChevronRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import QuoteItemsBreakdown from "./QuoteItemsBreakdown";
import {
  fmtCLP,
  fmtDate,
  getTotalAcordado,
  getTotalAbonado,
  getSaldo,
  getPaymentStatus,
  getPaymentBadge,
  getCollectionState,
  getDaysOverdue,
  workSummary,
} from "@/lib/receivables";

export default function ReceivableCard({ quote, onOpen, onDelete }) {
  const [open, setOpen] = useState(false);
  const state = getCollectionState(quote);
  const days = getDaysOverdue(quote);
  const itemCount = (quote.items || []).filter((i) => !i.is_operational_expense).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{quote.client_name}</p>
          {quote.client_company && <p className="text-[11px] text-slate-400 truncate">{quote.client_company}</p>}
          <p className="text-[11px] text-slate-500 mt-1 truncate">{workSummary(quote)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-slate-400">{quote.quote_number}</p>
          <p className="text-sm font-bold text-slate-900">{fmtCLP(getSaldo(quote))}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getPaymentBadge(quote)}`}>
          {getPaymentStatus(quote)}
        </span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${state.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
          {days !== null && days > 0 ? `${days} días de atraso` : state.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
        <div>
          <p className="text-slate-400">Total</p>
          <p className="text-slate-700 font-medium">{fmtCLP(getTotalAcordado(quote))}</p>
        </div>
        <div>
          <p className="text-slate-400">Abonado</p>
          <p className="text-emerald-600 font-medium">{fmtCLP(getTotalAbonado(quote))}</p>
        </div>
        <div>
          <p className="text-slate-400">Vence</p>
          <p className="text-slate-700 font-medium">{quote.payment_due_date ? fmtDate(quote.payment_due_date) : "Sin fecha"}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 border border-gray-200 rounded-xl py-2 hover:border-slate-400"
        >
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {open ? "Ocultar ítems" : `Ítems (${itemCount})`}
        </button>
        <button
          onClick={() => onOpen(quote)}
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-slate-700 border border-gray-200 rounded-xl py-2 hover:border-slate-400 hover:text-slate-900"
        >
          Abonar <ChevronRight className="w-3 h-3" />
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(quote)}
            aria-label="Eliminar"
            className="flex items-center justify-center text-red-500 border border-red-100 rounded-xl px-3 py-2 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <QuoteItemsBreakdown quote={quote} compact />
        </div>
      )}
    </div>
  );
}