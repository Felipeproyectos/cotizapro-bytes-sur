import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, Search, Download, ArrowUpRight, Trash2 } from "lucide-react";
import QuotePDF from "../components/quotes/QuotePDF";

const STATUS_COLORS = {
  Borrador: { bg: "#94a3b820", text: "#94a3b8" },
  Enviada: { bg: "#3b82f620", text: "#3b82f6" },
  Aceptada: { bg: "#10b98120", text: "#10b981" },
  Rechazada: { bg: "#ef444420", text: "#ef4444" },
  Ejecutada: { bg: "#8b5cf620", text: "#8b5cf6" },
};

export default function History() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pdfQuote, setPdfQuote] = useState(null);

  const [tab, setTab] = useState("activas"); // activas | eliminadas
  const [deleted, setDeleted] = useState([]);

  useEffect(() => {
    base44.entities.Quote.list("-created_date").then(data => {
      setQuotes(data.filter(q => q.status === "Ejecutada" || q.status === "Aceptada"));
      setLoading(false);
    });
    // Load all quotes to find "deleted" ones - we track them via a special status
    base44.entities.Quote.filter({ status: "Rechazada" }, "-created_date").then(data => {
      setDeleted(data);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const filtered = quotes.filter(q => {
    if (!search) return true;
    return (
      q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.client_company?.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalRevenue = filtered.reduce((sum, q) => sum + (q.total || 0), 0);

  // Group by month
  const grouped = filtered.reduce((acc, q) => {
    const key = format(new Date(q.created_date), "MMMM yyyy", { locale: es });
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      {pdfQuote && <QuotePDF quote={pdfQuote} onClose={() => setPdfQuote(null)} />}

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Historial de Trabajos</h1>
          <p className="text-sm text-slate-500 mt-1">Cotizaciones aceptadas y ejecutadas</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Trabajos totales</p>
              <p className="text-xl font-bold text-slate-900">{filtered.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Ingresos totales</p>
              <p className="text-xl font-bold text-slate-900">{formatCLP(totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            placeholder="Buscar por cliente, empresa o número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay trabajos ejecutados aún</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, items]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest capitalize">{month}</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-slate-400">{formatCLP(items.reduce((s, q) => s + (q.total || 0), 0))}</span>
                </div>
                <div className="space-y-2">
                  {items.map(q => {
                    const sc = STATUS_COLORS[q.status] || { bg: "#94a3b820", text: "#94a3b8" };
                    return (
                      <div key={q.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{q.client_name}</p>
                            {q.client_company && <span className="text-xs text-slate-400">· {q.client_company}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs text-slate-400">{q.quote_number}</p>
                            <p className="text-xs text-slate-400">{format(new Date(q.created_date), "dd MMM yyyy", { locale: es })}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
                              {q.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(q.items || []).slice(0, 3).map((item, i) => (
                              <span key={i} className="text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md text-slate-500">
                                {item.service_name || item.description}
                              </span>
                            ))}
                            {(q.items || []).length > 3 && (
                              <span className="text-xs text-slate-400">+{q.items.length - 3} más</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">{formatCLP(q.total)}</p>
                          {q.include_iva && <p className="text-xs text-slate-400">IVA incluido</p>}
                        </div>
                        <button onClick={() => setPdfQuote(q)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0" title="Ver PDF">
                          <Download className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}