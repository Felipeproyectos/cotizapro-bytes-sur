import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { addMonths, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, CalendarClock, Users, Plus } from "lucide-react";
import {
  monthKeyOf, isActiveInMonth, findPayment, dueDateOf, pendingMonths, formatCLP, registerPayment,
} from "@/lib/recurring";
import ServiceRow from "@/components/services/ServiceRow";
import PaymentHistoryModal from "@/components/services/PaymentHistoryModal";
import PaymentRegisterModal from "@/components/services/PaymentRegisterModal";
import ServiceFormModal from "@/components/services/ServiceFormModal";

export default function MonthlyServicesPanel() {
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [busyKey, setBusyKey] = useState(null);
  const [history, setHistory] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
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

  // Cobros pendientes: incluye meses anteriores impagos de cada servicio
  const pending = useMemo(() => {
    const rows = [];
    charges.forEach((c) => rows.push(...pendingMonths(c, payments, monthDate)));
    return rows.sort((a, b) => dueDateOf(a.charge, a.monthDate) - dueDateOf(b.charge, b.monthDate));
  }, [charges, payments, monthDate]);

  // Pagados del mes que se está viendo
  const paid = useMemo(() => charges
    .filter((c) => isActiveInMonth(c, monthDate))
    .map((c) => ({ charge: c, monthDate, payment: findPayment(payments, c.id, monthKey) }))
    .filter((r) => r.payment)
    .sort((a, b) => new Date(b.payment.paid_date || 0) - new Date(a.payment.paid_date || 0)),
    [charges, payments, monthDate, monthKey]);

  const activeCount = charges.filter((c) => isActiveInMonth(c, monthDate)).length;

  const totalPaid = paid.reduce((s, r) => s + (r.payment.amount || 0), 0);
  const totalPending = pending.reduce((s, r) => s + (r.charge.amount || 0), 0);
  const overdue = pending.filter((r) => r.status === "vencido");
  const totalOverdue = overdue.reduce((s, r) => s + (r.charge.amount || 0), 0);

  const handleRegister = async (data) => {
    if (!payTarget) return;
    setBusyKey(`${payTarget.charge.id}|${monthKeyOf(payTarget.monthDate)}`);
    try {
      await registerPayment(payTarget.charge, payTarget.monthDate, data);
      setPayTarget(null);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleUndo = async (payment) => {
    if (!confirm("¿Anular este pago? Volverá a aparecer como pendiente.")) return;
    setBusyKey(payment.charge_id);
    try {
      await base44.entities.ChargePayment.delete(payment.id);
      await load();
    } finally {
      setBusyKey(null);
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
                  {paid.length} de {activeCount} pagados en {format(monthDate, "MMMM yyyy", { locale: es })}
                  {pending.length > 0 ? ` · ${pending.length} cobro(s) pendientes` : ""}
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
              <p className="text-[11px] text-emerald-500">{paid.length} pago(s) del mes</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Por cobrar</p>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatCLP(totalPending)}</p>
              <p className="text-[11px] text-slate-400">{pending.length} cobro(s) pendientes</p>
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
              <p className="text-lg font-bold text-violet-700 mt-1">{paid.length} de {activeCount}</p>
              <p className="text-[11px] text-violet-500">con pago este mes</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {pending.length === 0 && activeCount === 0 && (
            <div className="text-center py-10">
              <RefreshCw className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay servicios vigentes en {format(monthDate, "MMMM yyyy", { locale: es })}</p>
            </div>
          )}

          {pending.map((r) => {
            const key = `${r.charge.id}|${r.monthKey}`;
            return (
              <ServiceRow
                key={key}
                charge={r.charge}
                payment={null}
                monthDate={r.monthDate}
                periodLabel={r.monthKey !== monthKey ? format(r.monthDate, "MMM yyyy", { locale: es }) : null}
                busy={busyKey === key || busyKey === r.charge.id}
                onRegister={(charge, rowMonth) => setPayTarget({ charge, monthDate: rowMonth })}
                onHistory={(charge) => setHistory(charge)}
              />
            );
          })}

          {activeCount > 0 && pending.length === 0 && (
            <p className="text-center text-xs text-emerald-600 font-medium py-3">
              Todos los servicios están al día hasta {format(monthDate, "MMMM yyyy", { locale: es })} 🎉
            </p>
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
                      monthDate={r.monthDate}
                      busy={busyKey === r.charge.id}
                      onRegister={(charge, rowMonth) => setPayTarget({ charge, monthDate: rowMonth })}
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

      {payTarget && (
        <PaymentRegisterModal
          charge={payTarget.charge}
          monthDate={payTarget.monthDate}
          busy={!!busyKey}
          onClose={() => setPayTarget(null)}
          onConfirm={handleRegister}
        />
      )}

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