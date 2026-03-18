import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isPast, isToday, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckCircle, RefreshCw, X } from "lucide-react";

export default function RecurringAlerts() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.RecurringCharge.filter({ active: true, status: "pendiente" });
    // Solo mostrar los que ya vencieron o vencen hoy
    const due = data.filter(c => {
      if (!c.next_billing_date) return false;
      const d = parseISO(c.next_billing_date);
      return isPast(d) || isToday(d);
    });
    setCharges(due);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePaid = async (charge) => {
    const today = new Date().toISOString().split("T")[0];
    // Calcular próximo vencimiento
    const current = parseISO(charge.next_billing_date);
    const next = addMonths(current, 1);
    const nextStr = next.toISOString().split("T")[0];

    // Marcar actual como pagado y crear el próximo
    await base44.entities.RecurringCharge.update(charge.id, {
      status: "pagado",
      paid_date: today,
      active: false,
    });
    await base44.entities.RecurringCharge.create({
      quote_id: charge.quote_id,
      client_name: charge.client_name,
      client_company: charge.client_company || "",
      title: charge.title,
      amount: charge.amount,
      billing_day: charge.billing_day,
      next_billing_date: nextStr,
      status: "pendiente",
      active: true,
    });
    load();
  };

  const handleDeactivate = async (charge) => {
    if (!confirm(`¿Desactivar cobro recurrente de ${charge.client_name}?`)) return;
    await base44.entities.RecurringCharge.update(charge.id, { active: false });
    load();
  };

  if (loading || charges.length === 0) return null;

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Cobros Recurrentes Pendientes</p>
          <p className="text-xs text-amber-600">{charges.length} cobro(s) por registrar</p>
        </div>
      </div>

      <div className="space-y-2">
        {charges.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{c.client_name}
                {c.client_company && <span className="font-normal text-slate-400"> · {c.client_company}</span>}
              </p>
              <p className="text-xs text-slate-500">{c.title}</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Venció: {format(parseISO(c.next_billing_date), "dd 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900">{formatCLP(c.amount)}</p>
              <p className="text-xs text-slate-400">mensual</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handlePaid(c)}
                className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Pagado
              </button>
              <button
                onClick={() => handleDeactivate(c)}
                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors"
                title="Desactivar cobro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}