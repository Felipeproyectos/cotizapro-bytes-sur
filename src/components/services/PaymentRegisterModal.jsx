import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Loader2, Receipt, Paperclip } from "lucide-react";
import { formatCLP } from "@/lib/recurring";

export default function PaymentRegisterModal({ charge, monthDate, onClose, onConfirm, busy }) {
  const [form, setForm] = useState({
    amount: charge.amount || "",
    paidDate: format(new Date(), "yyyy-MM-dd"),
    invoiceNumber: "",
    invoiceFile: null,
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = () => {
    onConfirm({
      amount: parseFloat(form.amount) || 0,
      paidDate: form.paidDate,
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceFile: form.invoiceFile,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Registrar pago</h2>
            <p className="text-xs text-slate-400 truncate">{charge.client_name} · {charge.title || "Servicio mensual"}</p>
            <p className="text-xs text-slate-400 capitalize">
              Período {format(monthDate, "MMMM yyyy", { locale: es })} · Mensualidad {formatCLP(charge.amount)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Monto pagado</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Fecha de pago</label>
              <input
                type="date"
                value={form.paidDate}
                onChange={(e) => set("paidDate", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">N° de factura <span className="text-slate-300">(opcional)</span></label>
            <div className="relative">
              <Receipt className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
                placeholder="Ej: 1234"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Archivo de factura <span className="text-slate-300">(opcional)</span></label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-400">
              <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {form.invoiceFile ? form.invoiceFile.name : "Adjuntar PDF o imagen"}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => set("invoiceFile", e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Guardando..." : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}