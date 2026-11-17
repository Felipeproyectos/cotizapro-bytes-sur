import { Wallet, AlertTriangle, Users, Briefcase, CalendarClock } from "lucide-react";
import { fmtCLP } from "@/lib/receivables";

const cards = [
  { key: "totalPendiente", label: "Total por cobrar", icon: Wallet, tone: "bg-slate-900", money: true },
  { key: "totalVencido", label: "Monto vencido", icon: AlertTriangle, tone: "bg-red-500", money: true },
  { key: "countTrabajos", label: "Trabajos con saldo", icon: Briefcase, tone: "bg-blue-500" },
  { key: "countClientes", label: "Clientes con deuda", icon: Users, tone: "bg-violet-500" },
  { key: "porVencer", label: "Próximos a vencer (3 días)", icon: CalendarClock, tone: "bg-amber-500", amountKey: "totalPorVencer" },
];

export default function ReceivablesSummary({ summary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
      {cards.map(({ key, label, icon: Icon, tone, amountKey, money }) => (
        <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium leading-tight">{label}</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">{money ? fmtCLP(summary[key]) : summary[key]}</p>
            {amountKey && <p className="text-[11px] text-slate-400">{fmtCLP(summary[amountKey])}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}