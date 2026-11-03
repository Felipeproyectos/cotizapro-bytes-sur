import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { startOfMonth } from "date-fns";
import { Plus, RefreshCw, CheckCircle, CalendarClock, Wallet } from "lucide-react";
import { monthKeyOf, isActiveInMonth, findPayment, chargeStatus, formatCLP, registerPayment } from "@/lib/recurring";
import ServiceRow from "@/components/services/ServiceRow";
import ServiceFormModal from "@/components/services/ServiceFormModal";
import PaymentHistoryModal from "@/components/services/PaymentHistoryModal";
import PaymentRegisterModal from "@/components/services/PaymentRegisterModal";

const STATUS_RANK = { vencido: 0, pendiente: 1, pagado: 2, fuera: 3 };

export default function RecurringChargesPanel() {
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  const monthDate = startOfMonth(new Date());
  const monthKey = monthKeyOf(monthDate);

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

  const items = useMemo(() => charges
    .map((c) => {
      const payment = findPayment(payments, c.id, monthKey);
      const inRange = isActiveInMonth(c, monthDate);
      return { charge: c, payment, inRange, status: inRange ? chargeStatus(c, monthDate, payment) : "fuera" };
    })
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.charge.client_name.localeCompare(b.charge.client_name)),
    [charges, payments, monthKey]);

  const activeItems = items.filter((i) => i.inRange);
  const paidCount = activeItems.filter((i) => i.payment).length;
  const pendingCount = activeItems.length - paidCount;
  const monthlyIncome = activeItems.reduce((s, i) => s + (i.charge.amount || 0), 0);

  const handleRegister = async (data) => {
    if (!payTarget) return;
    setBusyId(payTarget.charge.id);
    try {
      await registerPayment(payTarget.charge, payTarget.monthDate, data);
      setPayTarget(null);
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

  const handleToggleActive = async (charge) => {
    await base44.entities.RecurringCharge.update(charge.id, { active: charge.active === false });
    load();
  };

  const handleDelete = async (charge) => {
    if (!confirm(`¿Eliminar el servicio de ${charge.client_name}? Se borrará también su historial de pagos.`)) return;
    await base44.entities.ChargePayment.deleteMany({ charge_id: charge.id });
    await base44.entities.RecurringCharge.delete(charge.id);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Servicios vigentes", value: activeItems.length, color: "bg-slate-900", icon: RefreshCw },
          { label: "Pagados este mes", value: paidCount, color: "bg-emerald-600", icon: CheckCircle },
          { label: "Por cobrar este mes", value: pendingCount, color: "bg-amber-500", icon: CalendarClock },
          { label: "Ingreso mensual", value: formatCLP(monthlyIncome), color: "bg-violet-600", icon: Wallet },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{charges.length} servicio(s) creado(s)</p>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <RefreshCw className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no hay servicios mensuales</p>
          <p className="text-xs text-slate-300 mt-1">Crea uno con su monto, día de cobro y período de vigencia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <ServiceRow
              key={i.charge.id}
              charge={i.charge}
              payment={i.payment}
              monthDate={monthDate}
              inRange={i.inRange}
              busy={busyId === i.charge.id}
              showAdmin
              onRegister={(charge, rowMonth) => setPayTarget({ charge, monthDate: rowMonth })}
              onUndo={handleUndo}
              onHistory={(charge) => setHistory(charge)}
              onEdit={(charge) => { setEditing(charge); setFormOpen(true); }}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {payTarget && (
        <PaymentRegisterModal
          charge={payTarget.charge}
          monthDate={payTarget.monthDate}
          busy={!!busyId}
          onClose={() => setPayTarget(null)}
          onConfirm={handleRegister}
        />
      )}

      {formOpen && (
        <ServiceFormModal
          service={editing}
          onClose={() => setFormOpen(false)}
          onSave={() => { setFormOpen(false); setEditing(null); load(); }}
        />
      )}

      {history && (
        <PaymentHistoryModal
          charge={history}
          payments={payments.filter((p) => p.charge_id === history.id)}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}