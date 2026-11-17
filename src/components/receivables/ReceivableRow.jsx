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

export default function ReceivableRow({ quote, onOpen, onDelete }) {
  const [open, setOpen] = useState(false);
  const state = getCollectionState(quote);
  const days = getDaysOverdue(quote);
  const itemCount = (quote.items || []).filter((i) => !i.is_operational_expense).length;

  return (
    <>
    <tr className="border-b border-gray-50 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="py-3 pl-4 pr-2 align-top">
        <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">{quote.quote_number}</p>
        <p className="text-[11px] text-slate-400">{quote.executed_date ? fmtDate(quote.executed_date) : "Sin fecha ejec."}</p>
      </td>
      <td className="py-3 px-2 align-top">
        <p className="text-sm font-medium text-slate-900 truncate max-w-[160px]">{quote.client_name}</p>
        {quote.client_company && <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{quote.client_company}</p>}
      </td>
      <td className="py-3 px-2 align-top">
        <p className="text-xs text-slate-600 truncate max-w-[180px]">{workSummary(quote)}</p>
      </td>
      <td className="py-3 px-2 align-top whitespace-nowrap">
        <p className="text-xs text-slate-700">{quote.payment_due_date ? fmtDate(quote.payment_due_date) : "Sin fecha"}</p>
        {days !== null && days > 0 && <p className="text-[11px] text-red-500 font-medium">{days} días de atraso</p>}
        {days !== null && days <= 0 && <p className="text-[11px] text-slate-400">{state.label}</p>}
      </td>
      <td className="py-3 px-2 align-top text-right whitespace-nowrap">
        <p className="text-[11px] text-slate-400">{fmtCLP(getTotalAcordado(quote))}</p>
        <p className="text-[11px] text-emerald-600">Abonado {fmtCLP(getTotalAbonado(quote))}</p>
        <p className="text-sm font-bold text-slate-900">{fmtCLP(getSaldo(quote))}</p>
      </td>
      <td className="py-3 px-2 align-top">
        <div className="flex flex-col gap-1 items-start">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getPaymentBadge(quote)}`}>
            {getPaymentStatus(quote)}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${state.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} />
            {state.label}
          </span>
        </div>
      </td>
      <td className="py-3 pl-2 pr-4 align-top">
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => onOpen(quote)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-slate-400 hover:text-slate-900 whitespace-nowrap"
          >
            Abonar <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 rounded-lg px-2 py-1 hover:bg-gray-100 hover:text-slate-800 whitespace-nowrap"
          >
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? "Ocultar ítems" : `Ítems (${itemCount})`}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(quote)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 rounded-lg px-2 py-1 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
    {open && (
      <tr className="bg-slate-50/70 border-b border-gray-100">
        <td colSpan={7} className="px-4 py-3">
          <QuoteItemsBreakdown quote={quote} compact />
        </td>
      </tr>
    )}
    </>
  );
}