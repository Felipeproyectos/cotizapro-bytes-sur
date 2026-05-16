import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, CheckCircle2, Circle, AlertCircle, Search, RotateCcw } from "lucide-react";

const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

function getChargeStatus(charge) {
  if (!charge.active) return "inactivo";
  if (charge.status === "pagado") return "pagado";
  const next = new Date(charge.next_billing_date);
  if (isPast(next) || isToday(next)) return "vencido";
  const days = differenceInDays(next, new Date());
  if (days <= 5) return "proximo";
  return "pendiente";
}

const STATUS_STYLES = {
  vencido:  { bg: "bg-red-50",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    label: "Vencido" },
  proximo:  { bg: "bg-amber-50",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700", label: "Próximo" },
  pendiente:{ bg: "bg-blue-50/40",text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",  label: "Pendiente" },
  pagado:   { bg: "bg-gray-50",   text: "text-slate-400",  badge: "bg-gray-100 text-slate-500", label: "Pagado" },
  inactivo: { bg: "bg-gray-50",   text: "text-slate-300",  badge: "bg-gray-100 text-slate-400", label: "Inactivo" },
};

export default function RecurringChargesPanel() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  const load = async () => {
    const data = await base44.entities.RecurringCharge.filter({ active: true }, "-next_billing_date");
    setCharges(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTogglePaid = async (charge) => {
    setSaving(charge.id);
    const chargeStatus = getChargeStatus(charge);

    if (chargeStatus === "pagado") {
      // Revertir a pendiente
      await base44.entities.RecurringCharge.update(charge.id, {
        status: "pendiente",
        paid_date: null,
      });
    } else {
      // Marcar como pagado y calcular siguiente fecha de cobro
      const today = new Date();
      const day = charge.billing_day || 5;
      let nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
      // Asegurar que el día no sea mayor al último día del mes
      const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      if (day > lastDay) nextDate.setDate(lastDay);

      await base44.entities.RecurringCharge.update(charge.id, {
        status: "pagado",
        paid_date: format(today, "yyyy-MM-dd"),
        next_billing_date: format(nextDate, "yyyy-MM-dd"),
      });
    }

    setSaving(null);
    load();
  };

  const filtered = charges.filter(c => {
    const matchSearch = !search ||
      c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_company?.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase());
    const chargeStatus = getChargeStatus(c);
    const matchFilter = filterStatus === "todos" || chargeStatus === filterStatus;
    return matchSearch && matchFilter;
  });

  const totalMensual = charges
    .filter(c => c.active && c.status === "pendiente")
    .reduce((s, c) => s + (c.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cobros activos", value: charges.filter(c => c.active).length, color: "bg-slate-900" },
          { label: "Pendientes de cobro", value: charges.filter(c => getChargeStatus(c) === "pendiente" || getChargeStatus(c) === "vencido" || getChargeStatus(c) === "proximo").length, color: "bg-amber-500" },
          { label: "Ingreso mensual esperado", value: formatCLP(totalMensual), color: "bg-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o servicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "todos", label: "Todos" },
            { key: "vencido", label: "Vencidos" },
            { key: "proximo", label: "Próximos" },
            { key: "pendiente", label: "Pendientes" },
            { key: "pagado", label: "Pagados" },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterStatus(opt.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                filterStatus === opt.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <RefreshCw className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No hay cobros recurrentes activos</p>
          <p className="text-xs text-slate-300 mt-1">Se generan al ejecutar cotizaciones de tipo "Mensual"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(charge => {
            const st = getChargeStatus(charge);
            const style = STATUS_STYLES[st];
            const isPaid = st === "pagado";
            const isLoading = saving === charge.id;

            return (
              <div
                key={charge.id}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-100 transition-all ${style.bg} ${isPaid ? "opacity-60" : ""}`}
              >
                {/* Toggle button (like checkbox) */}
                <button
                  onClick={() => handleTogglePaid(charge)}
                  disabled={isLoading}
                  className="flex-shrink-0"
                  title={isPaid ? "Marcar como pendiente" : "Marcar como pagado"}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : isPaid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : st === "vencido" ? (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 hover:text-slate-500 transition-colors" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${isPaid ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {charge.client_name}
                    </p>
                    {charge.client_company && (
                      <span className="text-xs text-slate-400">· {charge.client_company}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isPaid ? "text-slate-300" : "text-slate-500"}`}>
                    {charge.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-400">
                      Cobro el día <span className="font-semibold text-slate-600">{charge.billing_day}</span> de cada mes
                    </span>
                    {charge.next_billing_date && (
                      <span className={`text-xs font-medium ${st === "vencido" ? "text-red-600" : st === "proximo" ? "text-amber-600" : "text-slate-500"}`}>
                        {isPaid ? "Próximo cobro:" : "Fecha:"} {format(new Date(charge.next_billing_date), "dd MMM yyyy", { locale: es })}
                      </span>
                    )}
                    {isPaid && charge.paid_date && (
                      <span className="text-xs text-emerald-600">
                        Pagado: {format(new Date(charge.paid_date), "dd MMM yyyy", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${isPaid ? "text-slate-400" : "text-slate-900"}`}>
                    {formatCLP(charge.amount)}
                  </p>
                  <p className="text-xs text-slate-400">mensual</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}