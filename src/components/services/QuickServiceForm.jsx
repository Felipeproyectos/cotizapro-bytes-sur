import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const UNITS = ["unidad", "hora", "metro", "mes", "global"];

export default function QuickServiceForm({ defaultName = "", categories = [], onCreated, onCancel }) {
  const [form, setForm] = useState({ name: defaultName, category: "", default_price: "", unit: "unidad" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      setError("Escribe un nombre para el servicio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await base44.entities.ServiceType.create({
        name: form.name.trim(),
        category: (form.category || "Otro").trim(),
        default_price: parseFloat(form.default_price) || 0,
        unit: form.unit,
        active: true,
      });
      onCreated(created);
    } catch (e) {
      setError("No se pudo crear el servicio");
      setSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-900">Nuevo servicio en el catálogo</p>
      <input
        autoFocus
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Nombre del servicio"
        className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
      />
      <input
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
        placeholder="Categoría (ej: Redes)"
        list="quick-service-categories"
        className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
      />
      <datalist id="quick-service-categories">
        {categories.filter((c) => c !== "Todas").map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          value={form.default_price}
          onChange={(e) => set("default_price", e.target.value)}
          placeholder="Precio base"
          className="flex-1 px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
        <select
          value={form.unit}
          onChange={(e) => set("unit", e.target.value)}
          className="w-28 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium text-slate-500 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Guardando..." : "Guardar y usar"}
        </button>
      </div>
    </div>
  );
}