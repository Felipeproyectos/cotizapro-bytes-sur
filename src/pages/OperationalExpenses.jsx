import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Calendar, FileText, DollarSign, Search } from "lucide-react";

const formatCLP = (amount) => {
  if (!amount && amount !== 0) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
};

const STATUS_COLORS = {
  Borrador: { bg: "#94a3b820", text: "#94a3b8" },
  Enviada: { bg: "#3b82f620", text: "#3b82f6" },
  Aceptada: { bg: "#10b98120", text: "#10b981" },
  Rechazada: { bg: "#ef444420", text: "#ef4444" },
  Ejecutada: { bg: "#8b5cf620", text: "#8b5cf6" },
};

export default function OperationalExpenses() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.Quote.list("-created_date");
      setQuotes(data);
      setLoading(false);
    };
    load();
  }, []);

  const allExpenses = quotes.flatMap((quote) => {
    const opItems = (quote.items || []).filter((item) => item.is_operational_expense);
    return opItems.map((item) => ({
      ...item,
      quoteNumber: quote.quote_number || quote.id?.slice(-6) || "-",
      quoteTitle: quote.title || "Sin título",
      clientName: quote.client_name || "-",
      quoteDate: quote.created_date || quote.executed_date || null,
      quoteStatus: quote.status || "-",
      quoteId: quote.id,
    }));
  });

  const filtered = allExpenses.filter((exp) => {
    const matchSearch =
      !search ||
      exp.service_name?.toLowerCase().includes(search.toLowerCase()) ||
      exp.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      exp.quoteNumber?.toLowerCase().includes(search.toLowerCase());
    const matchMonth =
      !filterMonth || (exp.quoteDate && exp.quoteDate.startsWith(filterMonth));
    return matchSearch && matchMonth;
  });

  const totalGastos = filtered.reduce((sum, exp) => sum + (exp.total || 0), 0);

  const byQuote = filtered.reduce((acc, exp) => {
    const key = exp.quoteId;
    if (!acc[key]) {
      acc[key] = {
        quoteNumber: exp.quoteNumber,
        quoteTitle: exp.quoteTitle,
        clientName: exp.clientName,
        quoteDate: exp.quoteDate,
        quoteStatus: exp.quoteStatus,
        items: [],
        total: 0,
      };
    }
    acc[key].items.push(exp);
    acc[key].total += exp.total || 0;
    return acc;
  }, {});

  const quoteSummaries = Object.values(byQuote);

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
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Gastos Operacionales</h1>
        </div>
        <p className="text-sm text-slate-500 ml-11">
          Gastos internos registrados en cotizaciones (no afectan el precio al cliente)
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Resumen total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Gastos (filtro)</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCLP(totalGastos)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Cotizaciones con Gastos</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{quoteSummaries.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Ítems de Gasto</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, servicio o Nº cotización..."
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

        {/* Lista de gastos por cotización */}
        {quoteSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No hay gastos operacionales registrados</p>
            <p className="text-slate-400 text-sm mt-1">
              Marca ítems como "Gasto Operacional" al crear cotizaciones
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quoteSummaries.map((q, idx) => {
              const statusColor = STATUS_COLORS[q.quoteStatus] || { bg: "#94a3b820", text: "#94a3b8" };
              return (
                <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400">#{q.quoteNumber}</span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                          {q.quoteStatus}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{q.quoteTitle}</p>
                      <p className="text-xs text-slate-500">{q.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">Total gastos en esta cotización</p>
                      <p className="text-lg font-bold text-red-600">{formatCLP(q.total)}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {q.items.map((item, iIdx) => (
                      <div key={iIdx} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-50 rounded-md flex items-center justify-center flex-shrink-0">
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{item.service_name || "Sin nombre"}</p>
                            {item.description && (
                              <p className="text-xs text-slate-400">{item.description}</p>
                            )}
                            <p className="text-xs text-slate-400">
                              {item.quantity || 1} x {formatCLP(item.unit_price || 0)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCLP(item.total || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}