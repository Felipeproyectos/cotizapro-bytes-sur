import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Printer } from "lucide-react";

const STATUS_LABELS = {
  Borrador: "BORRADOR", Enviada: "ENVIADA", Aceptada: "ACEPTADA",
  Rechazada: "RECHAZADA", Ejecutada: "EJECUTADA",
};
const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  // Calcular variables necesarias
  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = (quote.total || 0) - totalAbonos;
  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  const retencion = isHonorarios ? Math.round((quote.subtotal || 0) * 0.1075) : 0;
  const liquidoHonorarios = isHonorarios ? (quote.subtotal || 0) - retencion : 0;

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Cotización ${quote.quote_number}</title>
<style>
  @page { size: Letter; margin: 12mm 15mm; }
  * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #0f172a; font-size: 13px; }
  .header { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: white; padding: 28px 36px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 18px; font-weight: 700; margin-bottom: 6px; color: white; }
  .header-left p { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-right .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .header-right .number { font-size: 18px; font-weight: 700; color: white; }
  .header-right .date { font-size: 11px; color: #94a3b8; margin-top: 3px; }
  .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-top: 8px; background: ${statusColor}40 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: ${statusColor}; }
  .section { padding: 18px 36px; border-bottom: 1px solid #f1f5f9; }
  .section-title { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .field-label { font-size: 10px; color: #94a3b8; margin-bottom: 1px; }
  .field-value { font-size: 12px; color: #1e293b; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead tr { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th { font-size: 10px; font-weight: 600; color: #64748b; padding: 8px 10px; text-align: left; }
  th.right { text-align: right; }
  th.center { text-align: center; }
  td { font-size: 12px; padding: 9px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
  td.center { text-align: center; }
  td.right { text-align: right; }
  td.bold { font-weight: 600; color: #0f172a; }
  .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
  .totals-box { width: 230px; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
  .total-row span:first-child { color: #64748b; }
  .total-row span:last-child { font-weight: 500; color: #0f172a; }
  .total-row.final { border-top: 1px solid #e2e8f0; padding-top: 7px; margin-top: 5px; }
  .total-row.final span { font-weight: 700; font-size: 14px; }
  .total-note { font-size: 10px; color: #94a3b8; margin-top: 4px; text-align: right; }
  .red { color: #dc2626; }
  .green { color: #059669; }
  .payment-section { padding: 16px 36px; background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #f1f5f9; }
  .notes { padding: 16px 36px; border-bottom: 1px solid #f1f5f9; }
  .notes p { font-size: 12px; color: #475569; line-height: 1.6; white-space: pre-line; }
  .footer { padding: 12px 36px; text-align: center; }
  .footer p { font-size: 10px; color: #94a3b8; }
</style>
</head><body>

<div class="header">
  <div class="header-left">
    <h1>${company?.company_name || "Mi Empresa"}</h1>
    ${company?.rut ? `<p>RUT: ${company.rut}</p>` : ""}
    ${company?.address ? `<p>${company.address}</p>` : ""}
    ${company?.phone ? `<p>${company.phone}</p>` : ""}
    ${company?.email ? `<p>${company.email}</p>` : ""}
  </div>
  <div class="header-right">
    <div class="label">${isHonorarios ? "Boleta de Honorarios" : "Cotización"}</div>
    <div class="number">${quote.quote_number}</div>
    <div class="date">${format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}</div>
    ${quote.valid_until ? `<div class="date">Válida hasta: ${format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</div>` : ""}
    <div class="badge">${STATUS_LABELS[quote.status] || quote.status}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Datos del Cliente</div>
  <div class="grid2">
    <div><div class="field-label">Nombre</div><div class="field-value">${quote.client_name}</div></div>
    ${quote.client_company ? `<div><div class="field-label">Empresa</div><div class="field-value">${quote.client_company}</div></div>` : ""}
    ${quote.client_rut ? `<div><div class="field-label">RUT</div><div class="field-value">${quote.client_rut}</div></div>` : ""}
    ${quote.client_email ? `<div><div class="field-label">Email</div><div class="field-value">${quote.client_email}</div></div>` : ""}
    ${quote.client_phone ? `<div><div class="field-label">Teléfono</div><div class="field-value">${quote.client_phone}</div></div>` : ""}
    ${quote.client_address ? `<div><div class="field-label">Dirección</div><div class="field-value">${quote.client_address}</div></div>` : ""}
  </div>
</div>

<div class="section">
  <div class="section-title">Detalle de Servicios</div>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="center">Cant.</th>
        <th class="right">P. Unit.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(quote.items || []).map(item => `
      <tr>
        <td class="bold">
          ${item.service_name || item.description}
          ${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}
        </td>
        <td class="center">${item.quantity}</td>
        <td class="right">$${Math.round(item.unit_price || 0).toLocaleString("es-CL")}</td>
        <td class="right bold">$${Math.round(item.total || 0).toLocaleString("es-CL")}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>$${Math.round(quote.subtotal || 0).toLocaleString("es-CL")}</span></div>
      ${paymentType === "Con IVA (19%)" ? `<div class="total-row"><span>IVA (19%)</span><span>$${Math.round(quote.iva_amount || 0).toLocaleString("es-CL")}</span></div>` : ""}
      ${isHonorarios ? `
        <div class="total-row"><span>Retención (10,75%)</span><span class="red">-$${Math.round(retencion).toLocaleString("es-CL")}</span></div>
        <div class="total-row"><span>Líquido a pagar</span><span>$${Math.round(liquidoHonorarios).toLocaleString("es-CL")}</span></div>
      ` : ""}
      <div class="total-row final"><span>Total</span><span>$${Math.round(quote.total || 0).toLocaleString("es-CL")}</span></div>
      ${paymentType === "Sin IVA" ? `<div class="total-note">* Precio no incluye IVA</div>` : ""}
    </div>
  </div>
</div>

${(quote.abonos || []).length > 0 ? `
<div class="section">
  <div class="section-title">Abonos Recibidos</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Nota</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>
      ${(quote.abonos || []).map(a => `
      <tr>
        <td>${a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
        <td>${a.nota || "—"}</td>
        <td class="right green">$${Math.round(a.monto || 0).toLocaleString("es-CL")}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;gap:40px;margin-top:10px;font-size:12px;">
    <div style="text-align:right"><div style="color:#64748b">Total abonado</div><div style="font-weight:600;color:#059669">$${Math.round(totalAbonos).toLocaleString("es-CL")}</div></div>
    <div style="text-align:right"><div style="color:#64748b">Saldo pendiente</div><div style="font-weight:700;font-size:14px;color:${saldoPendiente <= 0 ? "#059669" : "#ef4444"}">$${Math.round(saldoPendiente).toLocaleString("es-CL")}</div></div>
  </div>
</div>` : ""}

<div class="payment-section">
  <div class="section-title">Datos de Pago</div>
  <div class="grid2">
    <div><div class="field-label">Forma de pago</div><div class="field-value">Efectivo, Transferencia o Boleta de Honorarios</div></div>
    <div><div class="field-label">Titular</div><div class="field-value">Felipe Aguilar Monsalve</div></div>
    <div><div class="field-label">RUT</div><div class="field-value">18.460.276-8</div></div>
    <div><div class="field-label">Banco</div><div class="field-value">Banco de Chile · Cuenta Corriente</div></div>
    <div><div class="field-label">N° de Cuenta</div><div class="field-value">00-804-03035-09</div></div>
    <div><div class="field-label">Email de confirmación</div><div class="field-value">felipemonsalveaguilar@gmail.com</div></div>
  </div>
</div>

${quote.notes ? `
<div class="notes">
  <div class="section-title">Notas y Condiciones</div>
  <p>${quote.notes}</p>
</div>` : ""}

<div class="footer">
  <p>${company?.company_name || "Mi Empresa"}${company?.email ? ` · ${company.email}` : ""}${company?.phone ? ` · ${company.phone}` : ""}</p>
  <p style="margin-top:2px;color:#cbd5e1;">Documento generado digitalmente</p>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-3xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white text-sm font-medium">Vista previa — {paymentType}</p>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
            >
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content Preview */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ fontFamily: "'Arial', sans-serif" }}>

          {/* Header */}
          <div style={{ background: "#0f172a" }} className="px-10 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{company?.company_name || "Mi Empresa"}</h1>
                {company?.rut && <p className="text-slate-400 text-xs mt-1">RUT: {company.rut}</p>}
                {company?.address && <p className="text-slate-400 text-xs">{company.address}</p>}
                {company?.phone && <p className="text-slate-400 text-xs">{company.phone}</p>}
                {company?.email && <p className="text-slate-400 text-xs">{company.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
                  {isHonorarios ? "Boleta de Honorarios" : "Cotización"}
                </p>
                <p className="text-xl font-bold">{quote.quote_number}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
                {quote.valid_until && (
                  <p className="text-slate-400 text-xs">Válida hasta: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</p>
                )}
                <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: statusColor + "30", color: statusColor }}>
                  {STATUS_LABELS[quote.status]}
                </span>
              </div>
            </div>
          </div>

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
                {(quote.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{item.service_name || item.description}</p>
                      {item.service_name && item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCLP(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatCLP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCLP(quote.subtotal)}</span>
                </div>
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
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900">{formatCLP(quote.total)}</span>
                </div>
                {paymentType === "Sin IVA" && (
                  <p className="text-xs text-slate-400">* Precio no incluye IVA</p>
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
          <div className="px-10 py-5 border-t border-gray-100" style={{ background: "#f8fafc" }}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos de Pago</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <div>
                <p className="text-xs text-slate-400">Forma de pago</p>
                <p className="font-medium text-slate-800">Efectivo, Transferencia o Boleta de Honorarios</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Titular</p>
                <p className="font-medium text-slate-800">Felipe Aguilar Monsalve</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">RUT</p>
                <p className="font-medium text-slate-800">18.460.276-8</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Banco</p>
                <p className="font-medium text-slate-800">Banco de Chile · Cuenta Corriente</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">N° de Cuenta</p>
                <p className="font-medium text-slate-800">00-804-03035-09</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email de confirmación</p>
                <p className="font-medium text-slate-800">felipemonsalveaguilar@gmail.com</p>
              </div>
            </div>
          </div>

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