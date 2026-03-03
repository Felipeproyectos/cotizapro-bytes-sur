import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";

const CATEGORIES = ["Redes", "Software", "Hardware", "Soporte", "Seguridad", "Infraestructura", "Consultoría", "Otro"];
const CATEGORY_COLORS = {
  Redes: "bg-blue-100 text-blue-700",
  Software: "bg-violet-100 text-violet-700",
  Hardware: "bg-amber-100 text-amber-700",
  Soporte: "bg-emerald-100 text-emerald-700",
  Seguridad: "bg-red-100 text-red-700",
  Infraestructura: "bg-slate-100 text-slate-700",
  "Consultoría": "bg-pink-100 text-pink-700",
  Otro: "bg-gray-100 text-gray-700",
};

const empty = { name: "", description: "", default_price: "", category: "Soporte", unit: "unidad", active: true };

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed, {} = new, {id} = editing
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.ServiceType.list("name");
    setServices(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, default_price: parseFloat(form.default_price) || 0 };
    if (form.id) {
      await base44.entities.ServiceType.update(form.id, payload);
    } else {
      await base44.entities.ServiceType.create(payload);
    }
    setForm(null);
    setSaving(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await base44.entities.ServiceType.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tipos de Servicio</h1>
            <p className="text-sm text-slate-500 mt-1">Administra los servicios que ofreces</p>
          </div>
          <button
            onClick={() => setForm({ ...empty })}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        </div>

        {/* Form */}
        {form && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">{form.id ? "Editar Servicio" : "Nuevo Servicio"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nombre *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Instalación de Switch"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Categoría</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Precio Base (CLP)</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.default_price}
                  onChange={e => setForm({ ...form, default_price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Unidad</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="unidad, hora, proyecto..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Descripción</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del servicio..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setForm(null)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl border border-gray-200 hover:bg-gray-50">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {services.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Tag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No hay servicios aún. Crea el primero.</p>
              </div>
            )}
            {services.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[s.category] || "bg-gray-100 text-gray-600"}`}>
                      {s.category}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900">${(s.default_price || 0).toLocaleString("es-CL")}</p>
                  <p className="text-xs text-slate-400">{s.unit}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setForm({ ...s })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}