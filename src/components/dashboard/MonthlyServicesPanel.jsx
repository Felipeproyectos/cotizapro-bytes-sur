import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isPast, isToday, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, X, Users, Upload, FileText, Eye, ChevronDown, ChevronUp } from "lucide-react";

function ClientDetailModal({ client, charges, onClose, onPaid, onDeactivate }) {
  const [uploadingId, setUploadingId] = useState(null);
  const [paying, setPaying] = useState(null);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const handlePaid = async (charge, proofFile) => {
    setPaying(charge.id);
    const today = new Date().toISOString().split("T")[0];
    const current = parseISO(charge.next_billing_date);
    const next = new Date(current);
    next.setMonth(next.getMonth() + 1);

    let proofUrl = charge.payment_proof_url || null;
    if (proofFile) {
      setUploadingId(charge.id);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile });
      proofUrl = file_url;
      setUploadingId(null);
    }

    await base44.entities.RecurringCharge.update(charge.id, {
      status: "pagado",
      paid_date: today,
      active: false,
      payment_proof_url: proofUrl,
    });
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
    setPaying(null);
    onPaid();
  };

  const handleFileUploadAndPay = (charge) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.png,.jpg,.jpeg,.webp";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handlePaid(charge, file);
    };
    input.click();
  };

  const getStatus = (charge) => {
    if (charge.status === "pagado") return "pagado";
    if (!charge.next_billing_date) return "ok";
    const d = parseISO(charge.next_billing_date);
    if (isPast(d) || isToday(d)) return "vencido";
    if (d <= addDays(new Date(), 5)) return "proximo";
    return "ok";
  };

  const pending = charges.filter(c => c.status === "pendiente");
  const paid = charges.filter(c => c.status === "pagado").sort((a, b) =>
    new Date(b.paid_date || b.created_date) - new Date(a.paid_date || a.created_date)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{client}</h2>
            <p className="text-xs text-slate-400">{charges[0]?.client_company || "Historial de mensualidades"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Pending charges */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cobros Pendientes</p>
              <div className="space-y-2">
                {pending.map(c => {
                  const s = getStatus(c);
                  return (
                    <div key={c.id} className={`rounded-xl border p-4 ${
                      s === "vencido" ? "border-red-200 bg-red-50" :
                      s === "proximo" ? "border-amber-200 bg-amber-50" :
                      "border-gray-100 bg-gray-50"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {s === "vencido" && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                            {s === "proximo" && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                            {s === "ok" && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                            <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                          </div>
                          <p className={`text-xs font-semibold mt-1 ${
                            s === "vencido" ? "text-red-600" :
                            s === "proximo" ? "text-amber-600" :
                            "text-slate-500"
                          }`}>
                            {s === "vencido"
                              ? `⚠️ VENCIDO — ${c.next_billing_date ? `venció el ${format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es })}` : ""}`
                              : s === "proximo"
                              ? `🔔 Próximo — ${c.next_billing_date ? format(parseISO(c.next_billing_date), "dd MMM yyyy", { locale: es }) : ""}`
                              : `✅ Al día — día ${c.billing_day} de cada mes`}
                          </p>
                          <p className="text-base font-bold text-slate-900 mt-1">{formatCLP(c.amount)}/mes</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePaid(c, null)}
                            disabled={paying === c.id}
                            className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {paying === c.id ? "Guardando..." : "Marcar pagado"}
                          </button>
                          <button
                            onClick={() => handleFileUploadAndPay(c)}
                            disabled={paying === c.id || uploadingId === c.id}
                            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50">
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingId === c.id ? "Subiendo..." : "Pagar + comprobante"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paid history */}
          {paid.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Historial de Pagos</p>
              <div className="space-y-2">
                {paid.map(c => (
                  <div key={c.id} className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400">
                        Pagado el {c.paid_date ? format(parseISO(c.paid_date), "dd MMM yyyy", { locale: es }) : "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatCLP(c.amount)}</p>
                      {c.payment_proof_url && (
                        <a href={c.payment_proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 justify-end mt-0.5">
                          <Eye className="w-3 h-3" /> Comprobante
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {charges.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Sin registros de mensualidades</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MonthlyServicesPanel() {
  const [charges, setCharges] = useState([]);
  const [allCharges, setAllCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);

  const load = async () => {
    const [active, all, quotes] = await Promise.all([
      base44.entities.RecurringCharge.filter({ active: true }),
      base44.entities.RecurringCharge.list("-created_date", 500),
      base44.entities.Quote.list("-created_date", 500),
    ]);
    const validQuoteIds = new Set(
      quotes.filter(q => q.status === "Aceptada" || q.status === "Ejecutada").map(q => q.id)
    );
    setCharges(active.filter(c => validQuoteIds.has(c.quote_id)));
    setAllCharges(all.filter(c => validQuoteIds.has(c.quote_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  // Group by client
  const clientMap = {};
  pending.forEach(c => {
    if (!clientMap[c.client_name]) clientMap[c.client_name] = [];
    clientMap[c.client_name].push(c);
  });

  const clientList = Object.entries(clientMap).map(([name, clientCharges]) => {
    const worstStatus = clientCharges.some(c => getStatus(c) === "vencido") ? "vencido"
      : clientCharges.some(c => getStatus(c) === "proximo") ? "proximo" : "ok";
    const total = clientCharges.reduce((s, c) => s + (c.amount || 0), 0);
    return { name, charges: clientCharges, worstStatus, total };
  }).sort((a, b) => {
    const order = { vencido: 0, proximo: 1, ok: 2 };
    return order[a.worstStatus] - order[b.worstStatus];
  });

  const totalMensual = pending.reduce((s, c) => s + (c.amount || 0), 0);
  const vencidosCount = clientList.filter(c => c.worstStatus === "vencido").length;
  const proximosCount = clientList.filter(c => c.worstStatus === "proximo").length;

  if (charges.length === 0) return null;

  const selectedClientCharges = selectedClient
    ? allCharges.filter(c => c.client_name === selectedClient)
    : [];

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Clientes Activos de Mensualidades</p>
              <p className="text-xs text-slate-400">
                {clientList.length} cliente(s) · <span className="font-semibold text-slate-700">{formatCLP(totalMensual)}/mes</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            {vencidosCount > 0 && (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold border border-red-200">
                <AlertTriangle className="w-3 h-3" /> {vencidosCount} VENCIDO(S)
              </span>
            )}
            {proximosCount > 0 && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
                <Clock className="w-3 h-3" /> {proximosCount} próximo(s)
              </span>
            )}
          </div>
        </div>

        {/* Summary totals row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{clientList.length}</p>
            <p className="text-xs text-slate-400">Clientes activos</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-violet-700">{formatCLP(totalMensual)}</p>
            <p className="text-xs text-violet-400">Total mensual</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${vencidosCount > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
            <p className={`text-lg font-bold ${vencidosCount > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {vencidosCount > 0 ? `${vencidosCount} vencido(s)` : "Al día ✓"}
            </p>
            <p className={`text-xs ${vencidosCount > 0 ? "text-red-400" : "text-emerald-400"}`}>Estado general</p>
          </div>
        </div>

        {/* Client rows */}
        <div className="space-y-2">
          {clientList.map(({ name, charges: cCharges, worstStatus, total }) => {
            const nextDate = cCharges[0]?.next_billing_date;
            const daysLeft = nextDate ? differenceInDays(parseISO(nextDate), new Date()) : null;
            return (
              <button
                key={name}
                onClick={() => setSelectedClient(name)}
                className={`w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all ${
                  worstStatus === "vencido"
                    ? "border-red-300 bg-red-50 hover:bg-red-100"
                    : worstStatus === "proximo"
                    ? "border-amber-200 bg-amber-50/60 hover:bg-amber-100"
                    : "border-gray-100 bg-gray-50/40 hover:bg-gray-100"
                }`}>
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  worstStatus === "vencido" ? "bg-red-500 animate-pulse" :
                  worstStatus === "proximo" ? "bg-amber-400" :
                  "bg-emerald-400"
                }`} />

                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${
                      worstStatus === "vencido" ? "text-red-800" : "text-slate-900"
                    }`}>{name}</p>
                    {cCharges[0]?.client_company && (
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">· {cCharges[0].client_company}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {worstStatus === "vencido" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        PAGO VENCIDO
                      </span>
                    )}
                    {worstStatus === "proximo" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Clock className="w-3 h-3" />
                        Vence en {daysLeft !== null ? `${daysLeft} día(s)` : "—"}
                      </span>
                    )}
                    {worstStatus === "ok" && nextDate && (
                      <span className="text-xs text-slate-400">
                        Próximo cobro: {format(parseISO(nextDate), "dd MMM yyyy", { locale: es })}
                      </span>
                    )}
                    {cCharges.length > 1 && (
                      <span className="text-xs text-slate-400">· {cCharges.length} servicios</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${
                    worstStatus === "vencido" ? "text-red-700" : "text-slate-900"
                  }`}>{formatCLP(total)}</p>
                  <p className="text-xs text-slate-400">mensual</p>
                </div>

                {/* Alert icon for overdue */}
                {worstStatus === "vencido" && (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          charges={selectedClientCharges}
          onClose={() => setSelectedClient(null)}
          onPaid={() => { load(); setSelectedClient(null); }}
          onDeactivate={handleDeactivate}
        />
      )}
    </>
  );
}