import { Search, Download } from "lucide-react";
import { AGING_BUCKETS } from "@/lib/receivables";

const selectClass =
  "border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10";

const VENCIMIENTOS = [
  { key: "todas", label: "Todos los vencimientos" },
  { key: "vencidas", label: "Vencidas" },
  { key: "por_vencer", label: "Por vencer (3 días)" },
  { key: "al_dia", label: "Al día" },
  { key: "sin_fecha", label: "Sin fecha" },
];

const ESTADOS_PAGO = ["Todos", "Sin pago", "Abonado parcialmente", "Pagado"];

const ORDENES = [
  { key: "prioridad", label: "Vencidas primero" },
  { key: "saldo", label: "Mayor saldo" },
  { key: "cliente", label: "Cliente (A-Z)" },
];

export default function ReceivablesFilters({ search, onSearch, filters, onFilterChange, clients, onExport }) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por cliente, empresa, cotización o trabajo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <button
          onClick={onExport}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-slate-400 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className={selectClass} value={filters.cliente} onChange={(e) => onFilterChange("cliente", e.target.value)}>
          <option value="todos">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.estadoPago} onChange={(e) => onFilterChange("estadoPago", e.target.value)}>
          {ESTADOS_PAGO.map((s) => (
            <option key={s} value={s}>{s === "Todos" ? "Estado de pago: todos" : s}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.vencimiento} onChange={(e) => onFilterChange("vencimiento", e.target.value)}>
          {VENCIMIENTOS.map((v) => (
            <option key={v.key} value={v.key}>{v.label}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.antiguedad} onChange={(e) => onFilterChange("antiguedad", e.target.value)}>
          {AGING_BUCKETS.map((b) => (
            <option key={b.key} value={b.key}>{b.key === "todas" ? "Antigüedad: todas" : b.label}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.orden} onChange={(e) => onFilterChange("orden", e.target.value)}>
          {ORDENES.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}