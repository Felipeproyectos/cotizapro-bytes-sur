import { useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle, CheckCircle, Clock, History, Loader2, Pencil, Power, Trash2, Upload, Eye, Undo2,
} from "lucide-react";
import { chargeStatus, daysLate, dueDateOf, formatCLP, openProof, vigenciaLabel } from "@/lib/recurring";

const ROW_STYLES = {
  pagado: "border-gray-100 bg-white",
  vencido: "border-red-200 bg-red-50",
  pendiente: "border-amber-200 bg-amber-50/60",
  fuera: "border-gray-100 bg-gray-50/60",
};

export default function ServiceRow({
  charge, payment, monthDate, inRange = true, busy, showAdmin,
  onPaid, onUndo, onHistory, onEdit, onToggleActive, onDelete,
}) {
  const fileRef = useRef(null);
  const status = inRange ? chargeStatus(charge, monthDate, payment) : "fuera";
  const due = dueDateOf(charge, monthDate);
  const late = inRange ? daysLate(charge, monthDate) : 0;

  const pickFile = () => fileRef.current?.click();

  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${ROW_STYLES[status]}`}>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
        status === "pagado" ? "bg-emerald-400" :
        status === "vencido" ? "bg-red-500 animate-pulse" :
        status === "pendiente" ? "bg-amber-400" : "bg-slate-300"
      }`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onHistory?.(charge)}
            className="text-sm font-bold text-slate-900 hover:text-blue-600 truncate flex items-center gap-1"
            title="Ver historial de pagos"
          >
            {charge.client_name}
            <History className="w-3 h-3 text-slate-300" />
          </button>
          {charge.client_company && <span className="text-xs text-slate-400 truncate">· {charge.client_company}</span>}
        </div>
        <p className="text-xs text-slate-500 truncate">{charge.title || "Servicio mensual"}</p>
        <p className={`text-xs mt-0.5 ${
          status === "pagado" ? "text-emerald-600" :
          status === "vencido" ? "text-red-600 font-semibold" :
          status === "pendiente" ? "text-amber-600" : "text-slate-400"
        }`}>
          {status === "pagado" && `✓ Pagado${payment?.paid_date ? ` el ${format(new Date(payment.paid_date), "dd MMM yyyy", { locale: es })}` : ""}`}
          {status === "vencido" && `⚠ Venció el ${format(due, "dd MMM", { locale: es })}${late > 0 ? ` · ${late} día(s) de atraso` : ""}`}
          {status === "pendiente" && `Cobro día ${charge.billing_day} · vence ${format(due, "dd MMM", { locale: es })}`}
          {status === "fuera" && (charge.active === false ? "Servicio pausado" : "Fuera de vigencia este mes")}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">Vigencia {vigenciaLabel(charge)}</p>
      </div>

      <div className="flex items-center gap-2 sm:justify-end shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold ${status === "vencido" ? "text-red-700" : status === "fuera" ? "text-slate-400" : "text-slate-900"}`}>
            {formatCLP(payment?.amount || charge.amount)}
          </p>
          <p className={`text-[11px] font-medium ${
            status === "pagado" ? "text-emerald-600" :
            status === "vencido" ? "text-red-500" :
            status === "pendiente" ? "text-amber-600" : "text-slate-400"
          }`}>
            {status === "pagado" ? "Pagado" : status === "vencido" ? "Vencido" : status === "pendiente" ? "Pendiente" : "—"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {payment?.payment_proof_url && (
            <button onClick={() => openProof(payment.payment_proof_url)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" title="Ver comprobante">
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          {inRange && !payment && (
            <>
              <button
                onClick={() => onPaid?.(charge, null)}
                disabled={busy}
                className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Marcar pagado
              </button>
              <button onClick={pickFile} disabled={busy} className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50" title="Pagar y adjuntar comprobante">
                <Upload className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {payment && onUndo && (
            <button onClick={() => onUndo(payment)} disabled={busy} className="p-2 rounded-lg hover:bg-gray-100 text-slate-400" title="Anular pago">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}

          {showAdmin && (
            <>
              <button onClick={() => onEdit?.(charge)} className="p-2 rounded-lg hover:bg-gray-100" title="Editar servicio">
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button onClick={() => onToggleActive?.(charge)} className="p-2 rounded-lg hover:bg-gray-100" title={charge.active === false ? "Reactivar" : "Pausar"}>
                <Power className={`w-3.5 h-3.5 ${charge.active === false ? "text-slate-300" : "text-emerald-500"}`} />
              </button>
              <button onClick={() => onDelete?.(charge)} className="p-2 rounded-lg hover:bg-red-50" title="Eliminar servicio">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPaid?.(charge, file);
        }}
      />
    </div>
  );
}