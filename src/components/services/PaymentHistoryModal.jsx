import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, CheckCircle, Eye, Receipt } from "lucide-react";
import { formatCLP, openProof, vigenciaLabel } from "@/lib/recurring";

export default function PaymentHistoryModal({ charge, payments, onClose }) {
  const list = [...payments].sort((a, b) => (a.period < b.period ? 1 : -1));
  const total = list.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{charge.client_name}</h2>
            <p className="text-xs text-slate-400 truncate">{charge.title || "Servicio mensual"}</p>
            <p className="text-xs text-slate-400 truncate">
              Cobro día {charge.billing_day} · Vigencia {vigenciaLabel(charge)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-2 border-b border-gray-100">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-slate-900">{list.length}</p>
            <p className="text-[11px] text-slate-400">Meses pagados</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-emerald-700">{formatCLP(total)}</p>
            <p className="text-[11px] text-emerald-500">Total cobrado</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-slate-900">{formatCLP(charge.amount)}</p>
            <p className="text-[11px] text-slate-400">Mensualidad</p>
          </div>
        </div>

        <div className="p-6 space-y-2">
          {list.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Todavía no hay pagos registrados</p>
            </div>
          )}
          {list.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {format(new Date(`${p.period}-01T00:00:00`), "MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {p.paid_date ? `Pagado: ${format(new Date(p.paid_date), "dd MMM yyyy", { locale: es })}` : "Sin fecha de pago"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">{formatCLP(p.amount)}</p>
                {p.payment_proof_url ? (
                  <button onClick={() => openProof(p.payment_proof_url)} className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3" /> Comprobante
                  </button>
                ) : (
                  <p className="text-[11px] text-emerald-600 mt-0.5">Pagado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}