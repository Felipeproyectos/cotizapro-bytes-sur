import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { addMonths, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, CalendarClock, Users, Plus } from "lucide-react";
import {
  monthKeyOf, isActiveInMonth, findPayment, chargeStatus, dueDateOf, formatCLP, registerPayment,
} from "@/lib/recurring";
import ServiceRow from "@/components/services/ServiceRow";
import PaymentHistoryModal from "@/components/services/PaymentHistoryModal";
import ServiceFormModal from "@/components/services/ServiceFormModal";

export default function MonthlyServicesPanel() {
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [busyId, setBusyId] = useState(null);
  const [history, setHistory] = useState(null);
  const [showPaid, setShowPaid] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const [cs, ps] = await Promise.all([
      base44.entities.RecurringCharge.list("-created_date", 300),
      base44.entities.ChargePayment.list("-created_date", 500),
    ]);
    setCharges(cs);
    setPayments(ps);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const monthKey = monthKeyOf(monthDate);

  const rows = useMemo(() => charges
    .filter((c) => isActiveInMonth(c, monthDate))
    .map((c) => {
      const payment = findPayment(payments, c.id, monthKey);
      return { charge: c, payment, status: chargeStatus(c, monthDate, payment) };
    }), [charges, payments, monthKey, monthDate]);

  const pending = rows
    .filter((r) => !r.payment)
    .sort((a, b) => dueDateOf(a.charge, monthDate) - dueDateOf(b.charge, monthDate));
  const paid = rows
    .filter((r) => r.payment)
    .sort((a, b) => new Date(b.payment.paid_date || 0) - new Date(a.payment.paid_date || 0));

  const totalPaid = paid.reduce((s, r) => s + (r.payment.amount || 0), 0);
  const totalPending = pending.reduce((s, r) => s + (r.charge.amount || 0), 0);
  const overdue = pending.filter((r) => r.status === "vencido");
  const totalOverdue = overdue.reduce((s, r) => s + (r.charge.amount || 0), 0);

  const handlePaid = async (charge, file) => {
    setBusyId(charge.id);
    try {
      await registerPayment(charge, monthDate, file);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (payment) => {
    if (!confirm("¿Anular este pago? Volverá a aparecer como pendiente.")) return;
    setBusyId(payment.charge_id);
    try {
      await base44.entities.ChargePayment.delete(payment.id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 mb-6 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Servicios mensuales</p>
                <p className="text-xs text-slate-400">
                  {paid.length} de {rows.length} pagados en {format(monthDate, "MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo servicio
            </button>
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
              <button onClick={() => setMonthDate((d) => addMonths(d, -1))} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900" title="Mes anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 capitalize px-2 min-w-[110px] text-center">
                {format(monthDate, "MMMM yyyy", { locale: es })}
              </span>
              <button onClick={() => setMonthDate((d) => addMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900" title="Mes siguiente">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Cobrado</p>
              </div>
              <p className="text-lg font-bold text-emerald-700 mt-1">{formatCLP(totalPaid)}</p>
              <p className="text-[11px] text-emerald-500">{paid.length} pago(s)</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Por cobrar</p>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatCLP(totalPending)}</p>
              <p className="text-[11px] text-slate-400">{pending.length} pendiente(s)</p>
            </div>
            <div className={`rounded-xl p-3 ${totalOverdue > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>Vencido</p>
              </div>
              <p className={`text-lg font-bold mt-1 ${totalOverdue > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCLP(totalOverdue)}</p>
              <p className={`text-[11px] ${totalOverdue > 0 ? "text-red-500" : "text-slate-400"}`}>{overdue.length} atrasado(s)</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-600" />
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wide">Clientes</p>
              </div>
              <p className="text-lg font-bold text-violet-700 mt-1">{paid.length} de {rows.length}</p>
              <p className="text-[11px] text-violet-500">con pago este mes</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {rows.length === 0 && (
            <div className="text-center py-10">
              <RefreshCw className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay servicios vigentes en {format(monthDate, "MMMM yyyy", { locale: es })}</p>
            </div>
          )}

          {pending.map((r) => (
            <ServiceRow
              key={r.charge.id}
              charge={r.charge}
              payment={null}
              monthDate={monthDate}
              busy={busyId === r.charge.id}
              onPaid={handlePaid}
              onHistory={(charge) => setHistory(charge)}
            />
          ))}

          {rows.length > 0 && pending.length === 0 && (
            <p className="text-center text-xs text-emerald-600 font-medium py-3">Todos los servicios del mes están pagados 🎉</p>
          )}

          {paid.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowPaid((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 py-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Pagados este mes ({paid.length}) · {formatCLP(totalPaid)}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPaid ? "rotate-90" : ""}`} />
              </button>
              {showPaid && (
                <div className="space-y-2 mt-1">
                  {paid.map((r) => (
                    <ServiceRow
                      key={r.charge.id}
                      charge={r.charge}
                      payment={r.payment}
                      monthDate={monthDate}
                      busy={busyId === r.charge.id}
                      onPaid={handlePaid}
                      onUndo={handleUndo}
                      onHistory={(charge) => setHistory(charge)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <ServiceFormModal
          service={null}
          onClose={() => setFormOpen(false)}
          onSave={() => { setFormOpen(false); load(); }}
        />
      )}

      {history && (
        <PaymentHistoryModal
          charge={history}
          payments={payments.filter((p) => p.charge_id === history.id)}
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}