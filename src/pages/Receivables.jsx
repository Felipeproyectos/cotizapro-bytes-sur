import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Wallet } from "lucide-react";
import ReceivablesSummary from "@/components/receivables/ReceivablesSummary";
import ReceivablesFilters from "@/components/receivables/ReceivablesFilters";
import ReceivablesTable from "@/components/receivables/ReceivablesTable";
import ClassificationTable from "@/components/receivables/ClassificationTable";
import CollectionReports from "@/components/receivables/CollectionReports";
import CollectionModal from "@/components/receivables/CollectionModal";
import {
  fmtCLP,
  isMonthly,
  isReceivable,
  getSaldo,
  getTotalAcordado,
  getPaymentStatus,
  getCollectionState,
  getAgingBucket,
  resolveWorkStatus,
  sortReceivables,
  summarizeReceivables,
  downloadReceivablesCsv,
} from "@/lib/receivables";

const TABS = [
  { key: "pendientes", label: "Pendientes" },
  { key: "clasificar", label: "Por clasificar" },
  { key: "historial", label: "Historial y reportes" },
];

export default function Receivables() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pendientes");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    cliente: "todos",
    estadoPago: "Todos",
    vencimiento: "todas",
    antiguedad: "todas",
    orden: "prioridad",
  });

  const load = async () => {
    const data = await base44.entities.Quote.list("-created_date", 500);
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Quote.subscribe(() => load());
    return () => unsubscribe();
  }, []);

  const applyUpdated = (updated) => {
    setQuotes((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
  };

  const handleDelete = async (quote) => {
    const ok = window.confirm(
      `¿Eliminar la cotización ${quote.quote_number} de ${quote.client_name || "cliente"}?\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      await base44.entities.Quote.delete(quote.id);
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
    } catch (e) {
      window.alert("No se pudo eliminar la cotización. Intenta nuevamente.");
    }
  };

  const base = useMemo(() => quotes.filter((q) => !isMonthly(q)), [quotes]);
  const receivables = useMemo(() => base.filter(isReceivable), [base]);
  const summary = useMemo(() => summarizeReceivables(quotes), [quotes]);
  const pendingClassify = useMemo(
    () => base.filter((q) => !resolveWorkStatus(q) && getSaldo(q) > 0 && ["Enviada", "Aceptada"].includes(q.status)),
    [base]
  );
  const paidQuotes = useMemo(
    () =>
      base.filter(
        (q) => resolveWorkStatus(q) === "Ejecutado" && getTotalAcordado(q) > 0 && getSaldo(q) <= 0
      ),
    [base]
  );

  const clients = useMemo(
    () =>
      [...new Set(receivables.map((q) => q.client_company || q.client_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [receivables]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = receivables.filter((q) => {
      if (filters.cliente !== "todos" && (q.client_company || q.client_name) !== filters.cliente) return false;
      if (filters.estadoPago !== "Todos" && getPaymentStatus(q) !== filters.estadoPago) return false;
      const stateKey = getCollectionState(q).key;
      if (filters.vencimiento !== "todas") {
        const map = { vencidas: "vencido", por_vencer: "por_vencer", al_dia: "al_dia", sin_fecha: "sin_fecha" };
        if (stateKey !== map[filters.vencimiento]) return false;
      }
      if (filters.antiguedad !== "todas" && getAgingBucket(q) !== filters.antiguedad) return false;
      if (!term) return true;
      return [q.quote_number, q.client_name, q.client_company, q.title].some((v) =>
        (v || "").toLowerCase().includes(term)
      );
    });
    return sortReceivables(list, filters.orden);
  }, [receivables, filters, search]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const alerts = [];
  if (summary.vencidos > 0) {
    alerts.push(`Tienes ${summary.vencidos} trabajo${summary.vencidos > 1 ? "s" : ""} con pago vencido por ${fmtCLP(summary.totalVencido)}.`);
  }
  if (summary.porVencer > 0) {
    alerts.push(`${summary.porVencer} vence${summary.porVencer > 1 ? "n" : ""} en los próximos 3 días por ${fmtCLP(summary.totalPorVencer)}.`);
  }
  if (summary.countTrabajos > 0) {
    alerts.push(`${summary.countTrabajos} trabajo${summary.countTrabajos > 1 ? "s" : ""} ejecutado${summary.countTrabajos > 1 ? "s" : ""} con pagos pendientes por un total de ${fmtCLP(summary.totalPendiente)}.`);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cuentas por Cobrar</h1>
            <p className="text-sm text-slate-500 mt-1">Trabajos ejecutados con saldo pendiente y seguimiento de pagos</p>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{alerts.join(" ")}</p>
          </div>
        )}

        <ReceivablesSummary summary={summary} />

        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => {
            const count = t.key === "pendientes" ? receivables.length : t.key === "clasificar" ? pendingClassify.length : paidQuotes.length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
                }`}
              >
                {t.key === "pendientes" && <Wallet className="w-4 h-4" />}
                {t.label}
                <span className={`text-[11px] px-1.5 rounded-full ${active ? "bg-white/20" : "bg-gray-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "pendientes" ? (
          <>
            <ReceivablesFilters
              search={search}
              onSearch={setSearch}
              filters={filters}
              onFilterChange={setFilter}
              clients={clients}
              onExport={() => downloadReceivablesCsv(filtered)}
            />
            <ReceivablesTable quotes={filtered} onOpen={setSelected} onDelete={handleDelete} />
            <p className="text-[11px] text-slate-400 mt-3">
              {filtered.length} de {receivables.length} cuentas por cobrar · montos en pesos chilenos
            </p>
          </>
        ) : tab === "clasificar" ? (
          <ClassificationTable quotes={pendingClassify} onClassified={applyUpdated} />
        ) : (
          <CollectionReports quotes={base} onOpen={setSelected} />
        )}
      </div>

      {selected && <CollectionModal quote={selected} onClose={() => setSelected(null)} onUpdated={applyUpdated} />}
    </div>
  );
}