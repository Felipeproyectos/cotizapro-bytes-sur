import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ArrowUpRight, Wallet, Users, Briefcase, CalendarClock } from "lucide-react";
import { fmtCLP, summarizeReceivables } from "@/lib/receivables";

export default function CollectionControl() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      const quotes = await base44.entities.Quote.list("-created_date", 500);
      setSummary(summarizeReceivables(quotes));
    };
    load();
    const unsubscribe = base44.entities.Quote.subscribe(() => load());
    return () => unsubscribe();
  }, []);

  if (!summary) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 h-32 animate-pulse" />;
  }

  const stats = [
    { label: "Total por cobrar", value: fmtCLP(summary.totalPendiente), icon: Wallet, tone: "bg-slate-900" },
    { label: "Monto vencido", value: fmtCLP(summary.totalVencido), icon: AlertTriangle, tone: "bg-red-500" },
    { label: "Trabajos con saldo", value: summary.countTrabajos, icon: Briefcase, tone: "bg-blue-500" },
    { label: "Clientes con deuda", value: summary.countClientes, icon: Users, tone: "bg-violet-500" },
    { label: "Próximos a vencer (3 días)", value: summary.porVencer, icon: CalendarClock, tone: "bg-amber-500", sub: fmtCLP(summary.totalPorVencer) },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Control de Cobranza</h2>
          <p className="text-xs text-slate-500 mt-0.5">Trabajos ejecutados con pagos pendientes</p>
        </div>
        <Link
          to="/Receivables"
          className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          Ver cuentas por cobrar <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {summary.countTrabajos > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Tienes {summary.countTrabajos} trabajo{summary.countTrabajos > 1 ? "s" : ""} ejecutado
            {summary.countTrabajos > 1 ? "s" : ""} con pagos pendientes por un total de {fmtCLP(summary.totalPendiente)}.
            {summary.vencidos > 0
              ? ` De ellos, ${summary.vencidos} presenta${summary.vencidos > 1 ? "n" : ""} pagos vencidos por ${fmtCLP(summary.totalVencido)}.`
              : " Ninguno presenta pagos vencidos."}
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-emerald-700">Sin pagos pendientes: todos los trabajos ejecutados están pagados.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(({ label, value, icon: Icon, tone, sub }) => (
          <div key={label} className="flex items-start gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
              {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}