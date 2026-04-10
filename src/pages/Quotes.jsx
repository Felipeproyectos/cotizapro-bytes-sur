import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, FileText, Search, Pencil, Trash2, Download, Copy, CreditCard, X } from "lucide-react";
import { addDays, format as formatDate } from "date-fns";
import QuoteForm from "../components/quotes/QuoteForm";
import QuotePDF from "../components/quotes/QuotePDF";

const STATUS_COLORS = {
  Borrador: { bg: "#94a3b820", text: "#94a3b8" },
  Enviada: { bg: "#3b82f620", text: "#3b82f6" },
  Aceptada: { bg: "#10b98120", text: "#10b981" },
  Rechazada: { bg: "#ef444420", text: "#ef4444" },
  Ejecutada: { bg: "#8b5cf620", text: "#8b5cf6" },
};

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [abonoModal, setAbonoModal] = useState(null); // quote
  const [abonoForm, setAbonoForm] = useState({ monto: "", fecha: "", nota: "" });
  const [savingAbono, setSavingAbono] = useState(false);

  const load = async () => {
    const data = await base44.entities.Quote.list("-created_date");
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Check URL for ?new=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setView("form");
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await base44.entities.Quote.delete(id);
    load();
  };

  const handleDuplicate = async (q) => {
    const now = new Date();
    const newNumber = `COT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*900+100)}`;
    const { id, created_date, updated_date, created_by, ...rest } = q;
    await base44.entities.Quote.create({
      ...rest,
      quote_number: newNumber,
      status: "Borrador",
      abonos: [],
      valid_until: formatDate(addDays(new Date(), 30), "yyyy-MM-dd"),
    });
    load();
  };

  const openAbonoModal = (q) => {
    setAbonoModal(q);
    setAbonoForm({ monto: "", fecha: formatDate(new Date(), "yyyy-MM-dd"), nota: "" });
  };

  const handleSaveAbono = async () => {
    if (!abonoForm.monto || !abonoForm.fecha) return;
    setSavingAbono(true);
    const nuevoAbono = { fecha: abonoForm.fecha, monto: parseFloat(abonoForm.monto), nota: abonoForm.nota };
    const abonos = [...(abonoModal.abonos || []), nuevoAbono];
    await base44.entities.Quote.update(abonoModal.id, { abonos });
    setSavingAbono(false);
    setAbonoModal(null);
    load();
  };

  const ACTIVE_STATUSES = ["Borrador", "Enviada", "Aceptada"];

  const filtered = quotes.filter(q => {
    const matchStatus = statusFilter === "Todos"
      ? ACTIVE_STATUSES.includes(q.status)
      : q.status === statusFilter;
    const matchSearch = !search ||
      q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.client_company?.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  if (view === "form") {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setView("list"); setSelected(null); }} className="text-sm text-slate-500 hover:text-slate-900">
              ← Cotizaciones
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-900">{selected ? "Editar" : "Nueva Cotización"}</span>
          </div>
          <QuoteForm
            quote={selected}
            onSave={() => { setView("list"); setSelected(null); load(); }}
            onCancel={() => { setView("list"); setSelected(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      {view === "pdf" && selected && (
        <QuotePDF quote={selected} onClose={() => { setView("list"); setSelected(null); }} />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cotizaciones</h1>
            <p className="text-sm text-slate-500 mt-1">{quotes.length} cotizaciones en total</p>
          </div>
          <button
            onClick={() => { setSelected(null); setView("form"); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Cotización
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Buscar por cliente, empresa o número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["Todos", "Borrador", "Enviada", "Aceptada"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay cotizaciones que mostrar</p>
            <button onClick={() => setView("form")} className="mt-4 text-sm text-slate-900 underline underline-offset-2">
              Crear primera cotización
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => {
              const sc = STATUS_COLORS[q.status] || { bg: "#94a3b820", text: "#94a3b8" };
              return (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 hover:border-gray-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{q.client_name}</p>
                      {q.client_company && <span className="text-xs text-slate-400">· {q.client_company}</span>}
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
                        {q.status}
                      </span>
                    </div>
                    {q.title && <p className="text-xs font-medium text-slate-600 mt-0.5">{q.title}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-slate-400">{q.quote_number}</p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(q.created_date), "dd MMM yyyy", { locale: es })}
                      </p>
                      {q.include_iva && <span className="text-xs text-blue-500">Con IVA</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatCLP(q.total)}</p>
                    <p className="text-xs text-slate-400">{(q.items || []).length} ítem(s)</p>
                    {q.discount_amount > 0 && (
                      <p className="text-xs text-emerald-600">Desc: -{formatCLP(q.discount_amount)} ({(q.discount_percent || 0).toFixed(1)}%)</p>
                    )}
                    {(q.abonos || []).length > 0 && (() => {
                      const totalAbonos = q.abonos.reduce((s, a) => s + (a.monto || 0), 0);
                      const saldo = (q.total || 0) - totalAbonos;
                      return (
                        <div className="mt-1">
                          <p className="text-xs text-emerald-600">Abonado: {formatCLP(totalAbonos)}</p>
                          <p className={`text-xs font-semibold ${saldo <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            Saldo: {formatCLP(saldo)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setSelected(q); setView("pdf"); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Ver PDF">
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => { setSelected(q); setView("form"); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Editar">
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDuplicate(q)} className="p-2 hover:bg-blue-50 rounded-lg" title="Duplicar">
                      <Copy className="w-4 h-4 text-blue-400" />
                    </button>
                    {["Enviada", "Aceptada", "Ejecutada"].includes(q.status) && (
                      <button onClick={() => openAbonoModal(q)} className="p-2 hover:bg-emerald-50 rounded-lg" title="Registrar Abono">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(q.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Modal Abono */}
      {abonoModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Registrar Abono</h2>
                <p className="text-xs text-slate-400 mt-0.5">{abonoModal.client_name} · {abonoModal.quote_number}</p>
              </div>
              <button onClick={() => setAbonoModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Resumen saldos */}
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total cotización</span>
                <span className="font-semibold text-slate-900">{formatCLP(abonoModal.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total abonado</span>
                <span className="font-semibold text-emerald-600">{formatCLP((abonoModal.abonos || []).reduce((s,a) => s+(a.monto||0), 0))}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5">
                <span className="font-semibold text-slate-700">Saldo pendiente</span>
                <span className="font-bold text-red-500">{formatCLP((abonoModal.total||0) - (abonoModal.abonos||[]).reduce((s,a)=>s+(a.monto||0),0))}</span>
              </div>
            </div>

            {/* Historial abonos */}
            {(abonoModal.abonos||[]).length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">HISTORIAL DE ABONOS</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {abonoModal.abonos.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-slate-500">{a.fecha}{a.nota ? ` · ${a.nota}` : ""}</span>
                      <span className="font-semibold text-emerald-600">{formatCLP(a.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Monto del abono *</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Ej: 50000"
                  value={abonoForm.monto}
                  onChange={e => setAbonoForm(f => ({...f, monto: e.target.value}))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Fecha *</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={abonoForm.fecha}
                  onChange={e => setAbonoForm(f => ({...f, fecha: e.target.value}))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Ej: Transferencia banco"
                  value={abonoForm.nota}
                  onChange={e => setAbonoForm(f => ({...f, nota: e.target.value}))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setAbonoModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSaveAbono}
                disabled={savingAbono || !abonoForm.monto || !abonoForm.fecha}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {savingAbono ? "Guardando..." : "Registrar Abono"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}