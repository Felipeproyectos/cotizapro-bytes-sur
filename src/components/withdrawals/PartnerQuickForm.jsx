import { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";
const labelClass = "text-xs font-medium text-slate-500 mb-1.5 block";

export default function PartnerQuickForm({ onClose, onSaved }) {
  const [fullName, setFullName] = useState("");
  const [rut, setRut] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.Partner.create({ full_name: fullName.trim(), rut: rut.trim() });
      onSaved();
    } catch {
      setError("No se pudo guardar el socio. Inténtalo nuevamente.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">Agregar socio</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className={labelClass}>Nombre completo *</span>
            <input required maxLength={120} className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="block">
            <span className={labelClass}>RUT</span>
            <input maxLength={12} className={inputClass} value={rut} onChange={(e) => setRut(e.target.value)} />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !fullName.trim()} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar socio"}
          </button>
        </div>
      </form>
    </div>
  );
}
