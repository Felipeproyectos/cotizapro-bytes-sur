import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Calendar, FileText, DollarSign, Search, Plus, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

const formatCLP = (amount) => {
  if (!amount && amount !== 0) return "$0";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);
};

const STATUS_COLORS = {
  Borrador: { bg: "#94a3b820", text: "#94a3b8" },
  Enviada: { bg: "#3b82f620", text: "#3b82f6" },
  Aceptada: { bg: "#10b98120", text: "#10b981" },
  Rechazada: { bg: "#ef444420", text: "#ef4444" },
  Ejecutada: { bg: "#8b5cf620", text: "#8b5cf6" },
};

const CATEGORIES = ["Materiales", "Herramientas", "Transporte", "Arriendo", "Servicios", "Sueldos", "Software", "Otros"];

const CAT_COLORS = {
  Materiales: "bg-blue-100 text-blue-700",
  Herramientas: "bg-purple-100 text-purple-700",
  Transporte: "bg-cyan-100 text-cyan-700",
  Arriendo: "bg-amber-100 text-amber-700",
  Servicios: "bg-green-100 text-green-700",
  Sueldos: "bg-pink-100 text-pink-700",
  Software: "bg-indigo-100 text-indigo-700",
  Otros: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  category: "Materiales",
  description: "",
  amount: "",
  supplier: "",
  notes: "",
};

export default function OperationalExpenses() {
  const [quotes, setQuotes] = useState([]);
  const [directExpenses, setDirectExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [quotesData, expensesData] = await Promise.all([
      base44.entities.Quote.list("-created_date"),
      base44.entities.OperationalExpense.list("-date"),
    ]);
    setQuotes(quotesData);
    setDirectExpenses(expensesData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Gastos desde cotizaciones
  const quoteExpenses = quotes.flatMap((quote) => {
    const opItems = (quote.items || []).filter((item) => item.is_operational_expense);
    return opItems.map((item) => ({
      id: `q-${quote.id}-${item.service_name}`,
      type: "quote",
      date: quote.created_date || null,
      description: item.service_name || item.description || "Sin nombre",
      amount: item.total || 0,
      category: "Materiales",
      quoteNumber: quote.quote_number,
      quoteTitle: quote.title || "Sin título",
      clientName: quote.client_name,
      quoteStatus: quote.status,
    }));
  });

  // Unir todos los gastos
  const allExpenses = [
    ...directExpenses.map(e => ({ ...e, type: "direct" })),
    ...quoteExpenses,
  ];

  const filtered = allExpenses.filter((exp) => {
    const matchSearch =
      !search ||
      exp.description?.toLowerCase().includes(search.toLowerCase()) ||
      exp.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      exp.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      exp.category?.toLowerCase().includes(search.toLowerCase());
    const dateStr = exp.date ? exp.date.substring(0, 7) : "";
    const matchMonth = !filterMonth || dateStr === filterMonth;
    return matchSearch && matchMonth;
  });

  const totalGastos = filtered.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalDirectos = filtered.filter(e => e.type === "direct").reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCotizaciones = filtered.filter(e => e.type === "quote").reduce((sum, e) => sum + (e.amount || 0), 0);

  const openNew = () => {
    setEditingExpense(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditingExpense(expense);
    setForm({ date: expense.date || "", category: expense.category || "Otros", description: expense.description || "", amount: expense.amount || "", supplier: expense.supplier || "", notes: expense.notes || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editingExpense?.id) {
      await base44.entities.OperationalExpense.update(editingExpense.id, payload);
    } else {
      await base44.entities.OperationalExpense.create(payload);
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await base44.entities.OperationalExpense.delete(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gastos Operacionales</h1>
              <p className="text-xs text-slate-500">Gastos directos e internos de la empresa</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" /> Agregar Gasto
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Gastos</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCLP(totalGastos)}</p>
            <p className="text-xs text-slate-400 mt-1">{filtered.length} registros</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Gastos Directos</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCLP(totalDirectos)}</p>
            <p className="text-xs text-slate-400 mt-1">{filtered.filter(e => e.type === "direct").length} registros</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Desde Cotizaciones</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCLP(totalCotizaciones)}</p>
            <p className="text-xs text-slate-400 mt-1">{filtered.filter(e => e.type === "quote").length} registros</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descripción, proveedor, categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No hay gastos registrados</p>
            <p className="text-slate-400 text-sm mt-1">Usa el botón "Agregar Gasto" para registrar gastos directos</p>
            <button onClick={openNew} className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 mx-auto">
              <Plus className="w-4 h-4" /> Agregar Gasto
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((exp, idx) => {
                const statusColor = STATUS_COLORS[exp.quoteStatus] || { bg: "#94a3b820", text: "#94a3b8" };
                const catColor = CAT_COLORS[exp.category] || CAT_COLORS["Otros"];
                return (
                  <div key={exp.id || idx} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 truncate">{exp.description}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>{exp.category || "Otros"}</span>
                          {exp.type === "quote" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                              Cot. #{exp.quoteNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {exp.supplier && <p className="text-xs text-slate-400">📦 {exp.supplier}</p>}
                          {exp.clientName && <p className="text-xs text-slate-400">👤 {exp.clientName}</p>}
                          {exp.date && <p className="text-xs text-slate-400">📅 {exp.date?.substring(0, 10)}</p>}
                        </div>
                        {exp.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{exp.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-base font-bold text-red-600">{formatCLP(exp.amount)}</p>
                      {exp.type === "direct" && (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(exp)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                          </button>
                          <button onClick={() => handleDelete(exp.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Agregar/Editar Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-slate-900">{editingExpense ? "Editar Gasto" : "Nuevo Gasto Operacional"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Fecha *</label>
                  <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Categoría</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Descripción *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Compra de cables, Gasolina visita terreno..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Monto (CLP) *</label>
                  <input type="number" min="0" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Proveedor</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Ej: Easy, Sodimac..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notas</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones adicionales..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.description || !form.amount}
                className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Guardando..." : editingExpense ? "Actualizar" : "Guardar Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}