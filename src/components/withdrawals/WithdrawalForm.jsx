import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { WITHDRAWAL_TYPES, buildDistributions, sumDistributions, parseAmount, formatCLP } from "@/lib/withdrawals";

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";
const labelClass = "text-xs font-medium text-slate-500 mb-1.5 block";

export default function WithdrawalForm({ movement, partners, onClose, onSaved }) {
  // Incluye socios eliminados que figuren en el movimiento, para no perder sus montos al editar
  const formPartners = [
    ...partners,
    ...(movement?.distributions || [])
      .filter((d) => !partners.some((p) => p.id === d.partner_id))
      .map((d) => ({ id: d.partner_id, full_name: d.partner_name })),
  ];

  const [form, setForm] = useState({
    date: movement?.date?.substring(0, 10) || format(new Date(), "yyyy-MM-dd"),
    type: movement?.type || "Retiro",
    concept: movement?.concept || "",
    reference: movement?.reference || "",
    notes: movement?.notes || "",
  });
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries((movement?.distributions || []).map((d) => [d.partner_id, String(d.amount)]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const distributions = buildDistributions(formPartners, amounts);
  const total = sumDistributions(distributions);
  const canSave = !!form.date && total > 0 && !saving;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    const payload = { ...form, distributions, total_amount: total };
    try {
      if (movement?.id) await base44.entities.Withdrawal.update(movement.id, payload);
      else await base44.entities.Withdrawal.create({ ...payload, is_voided: false });
      onSaved();
    } catch {
      setError("No se pudo guardar el movimiento. Inténtalo nuevamente.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">{movement ? "Editar movimiento" : "Nuevo giro / retiro"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className={labelClass}>Fecha *</span>
              <input type="date" required className={inputClass} value={form.date} onChange={setField("date")} />
            </label>
            <label>
              <span className={labelClass}>Tipo</span>
              <select className={inputClass} value={form.type} onChange={setField("type")}>
                {WITHDRAWAL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <div className="border border-gray-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Monto recibido por cada socio (CLP) *</p>
            {formPartners.map((p) => (
              <label key={p.id} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 flex-1 truncate">{p.full_name}</span>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  className={`${inputClass} !w-36 text-right`}
                  value={amounts[p.id] ? parseAmount(amounts[p.id]).toLocaleString("es-CL") : ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                />
              </label>
            ))}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-semibold text-slate-900">Total sacado de la cuenta</span>
              <span className="text-base font-bold text-red-600">{formatCLP(total)}</span>
            </div>
          </div>

          <label className="block">
            <span className={labelClass}>Concepto</span>
            <input className={inputClass} maxLength={200} value={form.concept} onChange={setField("concept")} placeholder="Ej: Retiro de utilidades" />
          </label>
          <label className="block">
            <span className={labelClass}>N° comprobante / operación</span>
            <input className={inputClass} maxLength={60} value={form.reference} onChange={setField("reference")} />
          </label>
          <label className="block">
            <span className={labelClass}>Notas</span>
            <textarea rows={2} maxLength={500} className={`${inputClass} resize-none`} value={form.notes} onChange={setField("notes")} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={!canSave} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Guardando..." : movement ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
