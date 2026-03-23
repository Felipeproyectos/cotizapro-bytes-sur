import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isPast, isToday, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, X } from "lucide-react";

export default function MonthlyServicesPanel() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.RecurringCharge.filter({ active: true });
    setCharges(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePaid = async (charge) => {
    const today = new Date().toISOString().split("T")[0];
    const current = parseISO(charge.next_billing_date);
    const next = new Date(current);
    next.setMonth(next.getMonth() + 1);
    await base44.entities.RecurringCharge.update(charge.id, { status: "pagado", paid_date: today, active: false });
    await base44.entities.RecurringCharge.create({
      quote_id: charge.quote_id,
      client_name: charge.client_name,
      client_company: charge.client_company || "",
      title: charge.title,
      amount: charge.amount,
      billing_day: charge.billing_day,
      next_billing_date: next.toISOString().split("T")[0],
      status: "pendiente",
      active: true,
    });
    load();
  };

  const handleDeactivate = async (charge) => {
    if (!confirm(`¿Desactivar servicio mensual de ${charge.client_name}?`)) return;
    await base44.entities.RecurringCharge.update(charge.id, { active: false });
    load();
  };

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const getStatus = (charge) => {
    if (!charge.next_billing_date) return "ok";
    const d = parseISO(charge.next_billing_date);
    if (isPast(d) || isToday(d)) return "vencido";
    if (d <= addDays(new Date(), 5)) return "proximo";
    return "ok";
  };

  if (loading) return null;

  const pending = charges.filter(c => c.status === "pendiente");
  const vencidos = pending.filter(c => getStatus(c) === "vencido");
  const proximos = pending.filter(c => getStatus(c) === "proximo");
  const alDia = pending.filter(c => getStatus(c) === "ok");

  if (charges.length === 0) return null;

  const totalMensual = pending.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Servicios Mensuales Contratados</p>
            <p className="text-xs text-slate-400">{pending.length} activo(s) · {formatCLP(totalMensual)}/mes</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          {vencidos.length > 0 && (
            <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" /> {vencidos.length} vencido(s)
            </span>
          )}
          {proximos.length > 0 && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
              <Clock className="w-3 h-3" /> {proximos.length} próximo(s)
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {[...vencidos, ...proximos, ...alDia].map(c => {
          const status = getStatus(c);
          return (
            <div key={c.id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
              status === "vencido" ? "border-red-100 bg-red-50/40" :
              status === "proximo" ? "border-amber-100 bg-amber-50/30" :
              "border-gray-100 bg-gray-50/30"
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                status === "vencido" ? "bg-red-400" :
                status === "proximo" ? "bg-amber-400" :
                "bg-emerald-400"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{c.client_name}</p>
                  {c.client_company && <span className="text-xs text-slate-400">· {c.client_company}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{c.title}</p>
                <p className={`text-xs mt-0.5 font-medium ${
                  status === "vencido" ? "text-red-500" :
                  status === "proximo" ? "text-amber-500" :
                  "text-slate-400"
                }`}>
                  {status === "vencido" ? "⚠️ Vencido · " : status === "proximo" ? "🔔 Próximo · " : "✅ Al día · "}
                  Cobro día {c.billing_day} — {c.next_billing_date
                    ? format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })
                    : "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900">{formatCLP(c.amount)}</p>
                <p className="text-xs text-slate-400">mensual</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(status === "vencido" || status === "proximo") && (
                  <button onClick={() => handlePaid(c)}
                    className="flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Pagado
                  </button>
                )}
                <button onClick={() => handleDeactivate(c)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors" title="Desactivar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}