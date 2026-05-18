import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, StickyNote, Trash2, Pencil, AlertTriangle, X, Save } from "lucide-react";

const CATEGORY_OPTIONS = ["General", "Legal", "Financiero", "Clientes", "Interno", "Otro"];

const COLOR_MAP = {
  amarillo: { bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-400" },
  azul:     { bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-400" },
  verde:    { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-400" },
  rojo:     { bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-400" },
  gris:     { bg: "bg-gray-50",   border: "border-gray-200",   dot: "bg-gray-400" },
};

const DEFAULT_FORM = { title: "", content: "", category: "General", is_urgent: false, color: "amarillo" };

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.Note.list("-created_date");
    setNotes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (note) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content || "", category: note.category || "General", is_urgent: note.is_urgent || false, color: note.color || "amarillo" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await base44.entities.Note.update(editing.id, form);
    } else {
      await base44.entities.Note.create(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await base44.entities.Note.delete(id);
    load();
  };

  const urgentNotes = notes.filter(n => n.is_urgent);
  const normalNotes = notes.filter(n => !n.is_urgent);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notas</h1>
            <p className="text-sm text-slate-500 mt-1">{notes.length} notas guardadas</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Nota
          </button>
        </div>

        {/* Alertas urgentes */}
        {urgentNotes.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">{urgentNotes.length} nota{urgentNotes.length > 1 ? "s" : ""} urgente{urgentNotes.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {urgentNotes.map(note => (
                <div key={note.id} className="flex items-start justify-between bg-white rounded-xl border border-red-100 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                    {note.content && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.content}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button onClick={() => openEdit(note)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas normales */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : normalNotes.length === 0 && urgentNotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <StickyNote className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay notas todavía</p>
            <button onClick={openNew} className="mt-4 text-sm text-slate-900 underline underline-offset-2">
              Crear primera nota
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {normalNotes.map(note => {
              const c = COLOR_MAP[note.color] || COLOR_MAP.amarillo;
              return (
                <div key={note.id} className={`rounded-2xl border p-4 ${c.bg} ${c.border} relative group`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
                      <p className="text-sm font-semibold text-slate-900 truncate">{note.title}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(note)} className="p-1 hover:bg-white/60 rounded-lg">
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="p-1 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {note.content && <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{note.content}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400 bg-white/60 px-2 py-0.5 rounded-full">{note.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">{editing ? "Editar Nota" : "Nueva Nota"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Título *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Título de la nota"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Contenido</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  rows={4}
                  placeholder="Escribe aquí el contenido de la nota..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-700 block mb-1">Categoría</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-700 block mb-1">Color</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  >
                    <option value="amarillo">Amarillo</option>
                    <option value="azul">Azul</option>
                    <option value="verde">Verde</option>
                    <option value="rojo">Rojo</option>
                    <option value="gris">Gris</option>
                  </select>
                </div>
              </div>

              {/* Urgente toggle */}
              <div
                onClick={() => setForm(f => ({ ...f, is_urgent: !f.is_urgent }))}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${form.is_urgent ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}
              >
                <AlertTriangle className={`w-4 h-4 ${form.is_urgent ? "text-red-500" : "text-slate-300"}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${form.is_urgent ? "text-red-700" : "text-slate-600"}`}>Marcar como urgente</p>
                  <p className="text-xs text-slate-400">Aparecerá como alerta destacada</p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_urgent ? "bg-red-500" : "bg-gray-200"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${form.is_urgent ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}