import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  RefreshCw, CheckCircle, AlertTriangle, Clock, ChevronLeft, ChevronRight,
  Upload, Eye, Search, Users, Loader2, CalendarClock, History,
} from "lucide-react";
import { chargeMonthKey, getChargeStatus, daysOverdue, markChargePaid, formatCLP } from "@/lib/recurring";
import ClientChargesModal from "./ClientChargesModal";

const STATUS_ORDER = { vencido: 0, proximo: 1, programado: 2, pagado: 3 };

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "pagados", label: "Pagados" },
  { key: "pendientes", label: "Pendientes" },
];

export default function MonthlyServicesPanel() {
  const [charges, setCharges] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [historyClient, setHistoryClient] = useState(null);
  const [pendingFileCharge, setPendingFileCharge] = useState(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    const [all, quotesData] = await Promise.all([
      base44.entities.RecurringCharge.list("-created_date", 500),
      base44.entities.Quote.list("-created_date", 500),
    ]);
    const validQuoteIds = new Set(
      quotesData.filter(q => q.status === "Aceptada" || q.status === "Ejecutada").map(q => q.id)
    );
    const valid = all.filter(c => validQuoteIds.has(c.quote_id));
    setCharges(valid);
    setQuotes(quotesData);
    // Si el mes actual no tiene cobros, abrir el último mes con registros
    setMonthDate(prev => {
      const key = format(prev, "yyyy-MM");
      if (valid.some(c => chargeMonthKey(c) === key)) return prev;
      const keys = valid.map(chargeMonthKey).filter(Boolean).sort();
      if (keys.length === 0) return prev;
      return parseISO(`${keys[keys.length - 1]}-01`);
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const quotesById = useMemo(() => {
    const map = {};
    quotes.forEach(q => { map[q.id] = q; });
    return map;
  }, [quotes]);

  const monthKey = format(monthDate, "yyyy-MM");
  const isCurrentMonth = monthKey === format(new Date(), "yyyy-MM");

  const monthCharges = useMemo(() => charges
    .filter(c => chargeMonthKey(c) === monthKey)
    .map(c => ({ ...c, _status: getChargeStatus(c) }))
    .sort((a, b) => {
      const diff = STATUS_ORDER[a._status] - STATUS_ORDER[b._status];
      if (diff !== 0) return diff;
      return new Date(a.next_billing_date || 0) - new Date(b.next_billing_date || 0);
    }), [charges, monthKey]);

  const paidCharges = monthCharges.filter(c => c._status === "pagado");
  const pendingCharges = monthCharges.filter(c => c._status !== "pagado");
  const overdueCharges = monthCharges.filter(c => c._status === "vencido");

  const totalPaid = paidCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = pendingCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const totalOverdue = overdueCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const totalMonth = totalPaid + totalPending;
  const paidPercent = totalMonth > 0 ? Math.round((totalPaid / totalMonth) * 100) : 0;

  const clients = [...new Set(monthCharges.map(c => c.client_name))];
  const paidClients = [...new Set(paidCharges.map(c => c.client_name))];

  const visible = monthCharges
    .filter(c => {
      if (filter === "pagados") return c._status === "pagado";
      if (filter === "pendientes") return c._status !== "pagado";
      return true;
    })
    .filter(c => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (c.client_name || "").toLowerCase().includes(q)
        || (c.client_company || "").toLowerCase().includes(q)
        || (c.title || "").toLowerCase().includes(q);
    });

  const handlePay = async (charge, file) => {
    setBusyId(charge.id);
    try {
      let proofUrl = null;
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        proofUrl = file_url;
      }
      await markChargePaid(charge, proofUrl);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handlePickProof = (charge) => {
    setPendingFileCharge(charge);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const charge = pendingFileCharge;
    e.target.value = "";
    setPendingFileCharge(null);
    if (file && charge) await handlePay(charge, file);
  };

  const changeMonth = (delta) => setMonthDate(d => addMonths(d, delta));

  if (loading) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 mb-6 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Monitoreo de Servicios Mensuales</p>
                <p className="text-xs text-slate-400">
                  {clients.length} cliente(s) · {monthCharges.length} cobro(s) en {format(monthDate, "MMMM yyyy", { locale: es })}
                </p>
              </div>
            </div>

            {/* Month switcher */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 capitalize px-2 min-w-[110px] text-center">
                {format(monthDate, "MMMM yyyy", { locale: es })}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Cobrado</p>
              </div>
              <p className="text-lg font-bold text-emerald-700 mt-1">{formatCLP(totalPaid)}</p>
              <p className="text-[11px] text-emerald-500">{paidCharges.length} cobro(s) pagados</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Por cobrar</p>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatCLP(totalPending)}</p>
              <p className="text-[11px] text-slate-400">{pendingCharges.length} cobro(s) pendientes</p>
            </div>
            <div className={`rounded-xl p-3 ${totalOverdue > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>Vencido</p>
              </div>
              <p className={`text-lg font-bold mt-1 ${totalOverdue > 0 ? "text-red-700" : "text-slate-900"}`}>{formatCLP(totalOverdue)}</p>
              <p className={`text-[11px] ${totalOverdue > 0 ? "text-red-500" : "text-slate-400"}`}>{overdueCharges.length} cobro(s) atrasados</p>
            </div>
            <div className="bg-violet-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-600" />
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wide">Clientes</p>
              </div>
              <p className="text-lg font-bold text-violet-700 mt-1">{paidClients.length} de {clients.length}</p>
              <p className="text-[11px] text-violet-500">clientes con pago registrado</p>
            </div>
          </div>

          {/* Progress */}
          {totalMonth > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Avance de cobro del mes</span>
                <span className="font-semibold text-slate-700">{paidPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${paidPercent === 100 ? "bg-emerald-500" : "bg-slate-900"}`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {FILTERS.map(f => {
              const count = f.key === "pagados" ? paidCharges.length : f.key === "pendientes" ? pendingCharges.length : monthCharges.length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o servicio..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Rows */}
        <div className="p-4 space-y-2">
          {monthCharges.length === 0 && (
            <div className="text-center py-10">
              <RefreshCw className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay cobros de mensualidades en {format(monthDate, "MMMM yyyy", { locale: es })}</p>
              {!isCurrentMonth && (
                <button onClick={() => setMonthDate(startOfMonth(new Date()))} className="text-xs text-blue-500 hover:text-blue-700 mt-2">
                  Volver al mes actual
                </button>
              )}
            </div>
          )}

          {monthCharges.length > 0 && visible.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Sin resultados para este filtro</p>
          )}

          {visible.map(c => {
            const s = c._status;
            const busy = busyId === c.id;
            const lateDays = daysOverdue(c);
            return (
              <div
                key={c.id}
                className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  s === "pagado" ? "border-gray-100 bg-white" :
                  s === "vencido" ? "border-red-200 bg-red-50" :
                  s === "proximo" ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  s === "pagado" ? "bg-emerald-400" :
                  s === "vencido" ? "bg-red-500 animate-pulse" :
                  s === "proximo" ? "bg-amber-400" : "bg-slate-300"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setHistoryClient(c.client_name)}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 truncate flex items-center gap-1"
                      title="Ver historial del cliente"
                    >
                      {c.client_name}
                      <History className="w-3 h-3 text-slate-300" />
                    </button>
                    {c.client_company && <span className="text-xs text-slate-400 truncate">· {c.client_company}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{c.title || "Servicio mensual"}</p>
                  <p className={`text-xs mt-0.5 ${
                    s === "pagado" ? "text-emerald-600" :
                    s === "vencido" ? "text-red-600 font-semibold" :
                    s === "proximo" ? "text-amber-600" : "text-slate-400"
                  }`}>
                    {s === "pagado" && `✓ Pagado${c.paid_date ? ` el ${format(parseISO(c.paid_date), "dd MMM yyyy", { locale: es })}` : ""}`}
                    {s === "vencido" && `⚠ Venció el ${format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })}${lateDays > 0 ? ` · ${lateDays} día(s) de atraso` : ""}`}
                    {s === "proximo" && `🔔 Vence el ${format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })}`}
                    {s === "programado" && `Programado: ${format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })}`}
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:justify-end shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${s === "vencido" ? "text-red-700" : "text-slate-900"}`}>{formatCLP(c.amount)}</p>
                    <p className={`text-[11px] font-medium ${
                      s === "pagado" ? "text-emerald-600" :
                      s === "vencido" ? "text-red-500" :
                      s === "proximo" ? "text-amber-600" : "text-slate-400"
                    }`}>
                      {s === "pagado" ? "Pagado" : s === "vencido" ? "Vencido" : s === "proximo" ? "Por vencer" : "Pendiente"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {c.payment_proof_url && (
                      <a
                        href={c.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Ver comprobante"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {s !== "pagado" && (
                      <>
                        <button
                          onClick={() => handlePay(c, null)}
                          disabled={busy}
                          className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Marcar pagado
                        </button>
                        <button
                          onClick={() => handlePickProof(c)}
                          disabled={busy}
                          className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                          title="Pagar y adjuntar comprobante"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={onFileSelected}
        className="hidden"
      />

      {historyClient && (
        <ClientChargesModal
          clientName={historyClient}
          charges={charges.filter(c => c.client_name === historyClient)}
          quotesById={quotesById}
          onClose={() => setHistoryClient(null)}
        />
      )}
    </>
  );
}