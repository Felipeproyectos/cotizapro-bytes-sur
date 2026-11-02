import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { addMonths, addYears, format, parseISO } from "date-fns";
import { X, Loader2 } from "lucide-react";

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";

export default function ServiceFormModal({ service, onClose, onSave }) {
  const [form, setForm] = useState({
    client_name: service?.client_name || "",
    client_company: service?.client_company || "",
    title: service?.title || "",
    amount: service?.amount ?? "",
    billing_day: service?.billing_day || 5,
    start_date: service?.start_date || format(new Date(), "yyyy-MM-dd"),
    end_date: service?.end_date || format(addYears(new Date(), 1), "yyyy-MM-dd"),
    active: service?.active !== false,
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const setMonths = (months) => {
    const base = form.start_date ? parseISO(form.start_date) : new Date();
    set("end_date", format(addMonths(base, months), "yyyy-MM-dd"));
  };

  const valid = form.client_name.trim() && form.title.trim() && Number(form.amount) > 0 && form.start_date && form.end_date;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      billing_day: Number(form.billing_day) || 5,
    };
    if (service?.id) await base44.entities.RecurringCharge.update(service.id, payload);
    else await base44.entities.RecurringCharge.create(payload);
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{service?.id ? "Editar servicio" : "Nuevo servicio mensual"}</h2>
            <p className="text-xs text-slate-400">{service?.id ? "Ajusta monto, día de cobro o vigencia" : "Define el cobro mensual y su período de vigencia"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Cliente *</label>
              <input className={inputCls} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Simón López" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Empresa</label>
              <input className={inputCls} value={form.client_company} onChange={(e) => set("client_company", e.target.value)} placeholder="Transportes Cordillera" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Servicio *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Mantención sistema web" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Monto mensual (CLP) *</label>
              <input type="number" min="0" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="107100" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Día de cobro de cada mes *</label>
              <input type="number" min="1" max="28" className={inputCls} value={form.billing_day} onChange={(e) => set("billing_day", e.target.value)} />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
            <p className="text-xs font-semibold text-slate-600 mb-3">Período de vigencia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Desde</label>
                <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Hasta</label>
                <input type="date" className={inputCls} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {[
                { label: "6 meses", months: 6 },
                { label: "1 año", months: 12 },
                { label: "2 años", months: 24 },
              ].map((o) => (
                <button key={o.months} type="button" onClick={() => setMonths(o.months)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-500 hover:border-slate-400">
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !valid}
            className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {service?.id ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </div>
    </div>
  );
}