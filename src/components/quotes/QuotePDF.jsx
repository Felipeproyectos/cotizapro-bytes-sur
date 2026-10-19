import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Printer, Share, Download, Loader2 } from "lucide-react";
import { buildQuoteHtml, printQuotePdf, downloadQuotePdf } from "@/lib/quotePdf";

const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const isUF = quote.currency === "UF";
  const ufVal = quote.uf_value || 1;
  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = (quote.total_client || quote.total || 0) - totalAbonos;
  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  const retencion = isHonorarios ? Math.round((quote.subtotal || 0) * 0.1075) : 0;
  const liquidoHonorarios = isHonorarios ? (quote.subtotal || 0) - retencion : 0;
  const discount_amount = quote.discount_amount || 0;
  const discount_percent = quote.discount_percent || 0;
  const isMensual = quote.billing_type === "Mensual";
  const operationalItems = (quote.items || []).filter(i => i.is_operational_expense);
  const operational_expenses_total = quote.total_operational_expenses || operationalItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const regularItems = (quote.items || []).filter(i => !i.is_operational_expense);
  const total_client = quote.total_client || (quote.total || 0) + operational_expenses_total;

  const handlePrint = () => printQuotePdf(quote, company);

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadQuotePdf(quote, company); }
    catch (e) { console.error(e); }
    setDownloading(false);
  };

  const handleShare = async () => {
    const html = buildQuoteHtml(quote, company);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-3xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white text-sm font-medium">
            Vista previa — {paymentType}
            {isMensual && <span className="ml-2 bg-violet-500/30 text-violet-200 text-xs px-2 py-0.5 rounded-full">🔄 Mensual · Día {quote.billing_day}</span>}
          </p>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={downloading}
              className="select-none hidden sm:flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Generando..." : "Descargar PDF"}
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="select-none sm:hidden p-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white disabled:opacity-60" title="Descargar PDF">
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button onClick={handlePrint}
              className="select-none hidden sm:flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handlePrint}
              className="select-none sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white" title="Imprimir">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={handleShare}
              className="select-none p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white" title="Compartir">
              <Share className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="select-none p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content Preview */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ fontFamily: "'Arial', sans-serif" }}>

          {/* Header */}
          <div style={{ background: "#0f172a" }} className="px-10 py-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3 max-w-[55%]">
                {company?.logo_url && (
                  <img src={company.logo_url} alt="Logo" className="max-h-24 max-w-48 object-contain" />
                )}
                <div>
                  <h1 className="text-base font-bold leading-snug">{company?.company_name || "Mi Empresa"}</h1>
                  {company?.rut && <p className="text-slate-400 text-xs mt-1">RUT: {company.rut}</p>}
                  {company?.address && <p className="text-slate-400 text-xs">{company.address}</p>}
                  {company?.phone && <p className="text-slate-400 text-xs">{company.phone}</p>}
                  {company?.email && <p className="text-slate-400 text-xs">{company.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
                  {isHonorarios ? "Boleta de Honorarios" : "Cotización"}
                </p>
                <p className="text-xl font-bold">{quote.quote_number}</p>
                {quote.title && <p className="text-slate-300 text-sm mt-1 font-medium">{quote.title}</p>}
                <p className="text-slate-400 text-xs mt-1">
                  {format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
                {quote.valid_until && (
                  <p className="text-slate-400 text-xs">Válida hasta: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</p>
                )}
                {isMensual && (
                  <div className="mt-2 inline-block bg-violet-500/20 text-violet-300 text-xs font-bold px-3 py-1 rounded-full">
                    🔄 SERVICIO MENSUAL · Cobro día {quote.billing_day || "—"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mensual info banner */}
          {isMensual && (
            <div className="px-10 py-4 border-b border-violet-100" style={{ background: "#f5f3ff" }}>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-violet-400 font-medium uppercase tracking-wider">Tipo de servicio</p>
                  <p className="font-bold text-violet-700">🔄 Mensual recurrente</p>
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-medium uppercase tracking-wider">Día de cobro</p>
                  <p className="font-bold text-violet-700">Día {quote.billing_day || "—"} de cada mes</p>
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-medium uppercase tracking-wider">Monto mensual</p>
                  <p className="font-bold text-violet-700">{formatCLP(quote.total)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="px-10 py-6 border-b border-gray-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos del Cliente</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <div><p className="text-xs text-slate-400">Nombre</p><p className="text-sm font-semibold text-slate-900">{quote.client_name}</p></div>
              {quote.client_company && <div><p className="text-xs text-slate-400">Empresa</p><p className="text-sm font-semibold text-slate-900">{quote.client_company}</p></div>}
              {quote.client_rut && <div><p className="text-xs text-slate-400">RUT</p><p className="text-sm text-slate-700">{quote.client_rut}</p></div>}
              {quote.client_email && <div><p className="text-xs text-slate-400">Email</p><p className="text-sm text-slate-700">{quote.client_email}</p></div>}
              {quote.client_phone && <div><p className="text-xs text-slate-400">Teléfono</p><p className="text-sm text-slate-700">{quote.client_phone}</p></div>}
              {quote.client_address && <div><p className="text-xs text-slate-400">Dirección</p><p className="text-sm text-slate-700">{quote.client_address}</p></div>}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-10 py-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Detalle de Servicios</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">Descripción</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500">Cant.</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">P. Unit.</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
              {(quote.items || []).filter(item => !item.is_operational_expense).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{item.service_name || item.description}</p>
                      {item.service_name && item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{isUF ? `${(item.unit_price_uf || 0).toFixed(2)} UF` : formatCLP(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{isUF ? `${(item.total_uf || 0).toFixed(2)} UF` : formatCLP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          {/* Materiales / Repuestos */}
          {operationalItems.length > 0 && (
            <div className="px-10 py-4" style={{ marginTop: "8px" }}>
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-widest mb-3" style={{ background: "#eef2ff", padding: "6px 10px", borderRadius: "4px" }}>Materiales / Repuestos</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "#f0f4ff" }}>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-blue-700">Descripción</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-blue-700">Cant.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700">P. Unit.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {operationalItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e0e7ff" }}>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-900">{item.service_name || item.description}</p>
                        {item.service_name && item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{isUF ? `${(item.unit_price_uf || 0).toFixed(2)} UF` : formatCLP(item.unit_price || 0)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">{isUF ? `${(item.total_uf || 0).toFixed(2)} UF` : formatCLP(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{isUF ? `${(quote.subtotal_uf || 0).toFixed(2)} UF` : formatCLP(quote.subtotal)}</span>
                </div>
                {isUF && <p className="text-xs text-slate-400 text-right">1 UF = {formatCLP(ufVal)}</p>}
                {discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Descuento ({discount_percent.toFixed(1)}%)</span>
                    <span className="font-medium text-emerald-600">-{formatCLP(discount_amount)}</span>
                  </div>
                )}
                {paymentType === "Con IVA (19%)" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IVA (19%)</span>
                    <span className="font-medium text-slate-900">{formatCLP(quote.iva_amount)}</span>
                  </div>
                )}
                {isHonorarios && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Retención (10,75%)</span>
                      <span className="font-medium text-red-600">-{formatCLP(retencion)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Líquido a pagar</span>
                      <span className="font-medium text-slate-900">{formatCLP(liquidoHonorarios)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-slate-900">Total{isMensual ? " mensual" : ""}</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{isUF ? `${(quote.total_uf || 0).toFixed(2)} UF` : formatCLP(quote.total)}</span>
                    {isUF && <p className="text-xs text-slate-400 font-normal">≈ {formatCLP(quote.total)}</p>}
                  </div>
                </div>
                {paymentType === "Sin IVA" && (
                  <p className="text-xs text-slate-400">* Precio no incluye IVA</p>
                )}
          {operational_expenses_total > 0 && (
            <>
              <div className="flex justify-between text-sm" style={{ borderTop: "1px dashed #e0e7ff", paddingTop: "6px", marginTop: "4px" }}>
                <span className="text-blue-700 font-semibold">Materiales / Repuestos</span>
                <span className="font-semibold text-blue-700">{isUF ? `${(operational_expenses_total / ufVal).toFixed(2)} UF` : formatCLP(operational_expenses_total)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200" style={{ background: "#eef2ff", padding: "8px", borderRadius: "4px", marginTop: "4px" }}>
                <span className="font-bold text-blue-900">Total a Pagar</span>
                <span className="font-bold text-blue-900">{isUF ? `${(total_client / ufVal).toFixed(2)} UF` : formatCLP(total_client)}</span>
              </div>
            </>
          )}
              </div>
            </div>
          </div>

          {/* Abonos */}
          {(quote.abonos || []).length > 0 && (
            <div className="px-10 py-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Abonos Recibidos</p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th className="text-left py-2 px-3 text-xs text-slate-500">Fecha</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500">Nota</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.abonos || []).map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td className="py-2 px-3 text-slate-600">{a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
                      <td className="py-2 px-3 text-slate-500">{a.nota || "—"}</td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCLP(a.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-3 gap-10 text-sm">
                <div className="text-right">
                  <p className="text-slate-500">Total abonado</p>
                  <p className="font-semibold text-emerald-600">{formatCLP(totalAbonos)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Saldo pendiente</p>
                  <p className={`font-bold text-base ${saldoPendiente <= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatCLP(saldoPendiente)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info */}
          {(() => {
            const opts = quote.payment_options?.length > 0 ? quote.payment_options : (quote.payment_option ? [quote.payment_option] : []);
            if (opts.length === 0) return null;
            return (
              <div className="px-10 py-5 border-t border-gray-100" style={{ background: "#f8fafc" }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos de Pago</p>
                <div className="space-y-4">
                  {opts.map((po, i) => (
                    <div key={i}>
                      {po.label && <p className="text-xs font-semibold text-slate-600 mb-1">{po.label}</p>}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                        {po.titular && <div><p className="text-xs text-slate-400">Titular</p><p className="font-medium text-slate-800">{po.titular}</p></div>}
                        {po.rut && <div><p className="text-xs text-slate-400">RUT</p><p className="font-medium text-slate-800">{po.rut}</p></div>}
                        {po.banco && <div><p className="text-xs text-slate-400">Banco</p><p className="font-medium text-slate-800">{po.banco}</p></div>}
                        {po.tipo_cuenta && <div><p className="text-xs text-slate-400">Tipo de cuenta</p><p className="font-medium text-slate-800">{po.tipo_cuenta}</p></div>}
                        {po.numero_cuenta && <div><p className="text-xs text-slate-400">N° de Cuenta</p><p className="font-medium text-slate-800">{po.numero_cuenta}</p></div>}
                        {po.email_confirmacion && <div><p className="text-xs text-slate-400">Email de confirmación</p><p className="font-medium text-slate-800">{po.email_confirmacion}</p></div>}
                      </div>
                      {i < opts.length - 1 && <hr className="mt-3 border-gray-200" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          {quote.notes && (
            <div className="px-10 py-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notas y Condiciones</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-10 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-slate-400">
              {company?.company_name || "Mi Empresa"}
              {company?.email ? ` · ${company.email}` : ""}
              {company?.phone ? ` · ${company.phone}` : ""}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">Documento generado digitalmente</p>
          </div>
        </div>
      </div>
    </div>
  );
}