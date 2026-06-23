import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, Edit2, FileText, Upload, X, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = ["Materiales", "Herramientas", "Software", "Servicios", "Equipos", "Otro"];

const EMPTY = {
  title: "",
  supplier: "",
  purchase_date: "",
  amount: "",
  category: "Otro",
  notes: "",
  files: [],
};

const fmtCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Purchase.list("-purchase_date");
    setPurchases(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, purchase_date: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ ...p });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.purchase_date || !form.amount) return;
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editing) {
      await base44.entities.Purchase.update(editing, payload);
    } else {
      await base44.entities.Purchase.create(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta compra?")) return;
    await base44.entities.Purchase.delete(id);
    load();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ file_url, file_name: file.name, file_type: file.type });
    }
    setForm((f) => ({ ...f, files: [...(f.files || []), ...uploaded] }));
    setUploading(false);
  };

  const removeFile = (idx) => {
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== idx) }));
  };

  const filtered = purchases.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro de compras con documentos adjuntos</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800 text-white gap-2">
          <Plus className="w-4 h-4" /> Nueva Compra
        </Button>
      </div>

      {/* Search + Summary */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          placeholder="Buscar por descripción o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-slate-600 flex items-center gap-2 whitespace-nowrap">
          <span className="text-slate-400">Total:</span>
          <span className="font-bold text-slate-900">{fmtCLP(total)}</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin compras registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  {p.category && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {p.supplier && <p className="text-xs text-slate-500">{p.supplier}</p>}
                  {p.purchase_date && (
                    <p className="text-xs text-slate-400">
                      {format(new Date(p.purchase_date), "dd MMM yyyy", { locale: es })}
                    </p>
                  )}
                  {(p.files || []).length > 0 && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {p.files.length} archivo{p.files.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {/* Files */}
                {(p.files || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.files.map((f, i) => (
                      <a
                        key={i}
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {f.file_name || "Archivo"}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-slate-900 text-base">{fmtCLP(p.amount)}</p>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-slate-900">{editing ? "Editar Compra" : "Nueva Compra"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Descripción *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Compra de materiales eléctricos" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Proveedor</label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nombre del proveedor" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Fecha *</label>
                  <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Monto (CLP) *</label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Documentos (PDF, imágenes)</label>
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 hover:border-slate-400 rounded-xl px-4 py-3 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Upload className="w-4 h-4 text-slate-400" />}
                  <span className="text-sm text-slate-500">{uploading ? "Subiendo..." : "Seleccionar archivos"}</span>
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {(form.files || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {form.files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-slate-700 truncate">{f.file_name}</span>
                        <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 ml-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleSave} disabled={saving || !form.title || !form.purchase_date || !form.amount} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Guardar" : "Crear"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}