import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Printer, Share } from "lucide-react";

const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);
  const printFrameRef = useRef(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const isUF = quote.currency === "UF";
  const ufVal = quote.uf_value || 1;
  const formatMoney = (clp, uf) => isUF && uf != null ? `${(uf || 0).toFixed(2)} UF` : formatCLP(clp);
  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = ((quote.total_client || quote.total) || 0) - totalAbonos;
  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  const retencion = isHonorarios ? Math.round((quote.subtotal || 0) * 0.1075) : 0;
  const liquidoHonorarios = isHonorarios ? (quote.subtotal || 0) - retencion : 0;
  const discount_amount = quote.discount_amount || 0;
  const discount_percent = quote.discount_percent || 0;
  const isMensual = quote.billing_type === "Mensual";
  const operationalItems = (quote.items || []).filter(i => i.is_operational_expense);
  const operational_expenses_total = quote.operational_expenses_total || operationalItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const regularItems = (quote.items || []).filter(i => !i.is_operational_expense);
  const total_client = quote.total_client || (quote.total || 0) + operational_expenses_total;

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
  .mensual-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-top: 8px; background: #7c3aed33 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #a78bfa; }
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
  .mensual-section { padding: 14px 36px; background: #f5f3ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #ede9fe; }
  .notes { padding: 16px 36px; border-bottom: 1px solid #f1f5f9; }
  .notes p { font-size: 12px; color: #475569; line-height: 1.6; white-space: pre-line; }
  .footer { padding: 12px 36px; text-align: center; }
  .footer p { font-size: 10px; color: #94a3b8; }
</style>
</head><body>

<div class="header">
  <div class="header-left">
    ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-height:52px;max-width:140px;object-fit:contain;margin-bottom:8px;display:block;" />` : ""}
    <h1>${company?.company_name || "Mi Empresa"}</h1>
    ${company?.rut ? `<p>RUT: ${company.rut}</p>` : ""}
    ${company?.address ? `<p>${company.address}</p>` : ""}
    ${company?.phone ? `<p>${company.phone}</p>` : ""}
    ${company?.email ? `<p>${company.email}</p>` : ""}
  </div>
  <div class="header-right">
    <div class="label">${isHonorarios ? "Boleta de Honorarios" : "Cotización"}</div>
    <div class="number">${quote.quote_number}</div>
    ${quote.title ? `<div style="color:#cbd5e1;font-size:12px;margin-top:3px;font-weight:500;">${quote.title}</div>` : ""}
    <div class="date">${format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}</div>
    ${quote.valid_until ? `<div class="date">Válida hasta: ${format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</div>` : ""}
    ${isMensual ? `<div class="mensual-badge">🔄 SERVICIO MENSUAL · Cobro día ${quote.billing_day || "—"} de cada mes</div>` : ""}
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
      ${(regularItems).map(item => `
      <tr>
        <td class="bold">
          ${item.service_name || item.description}
          ${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}
        </td>
        <td class="center">${item.quantity}</td>
        <td class="right">${isUF ? `${(item.unit_price_uf || 0).toFixed(2)} UF` : `$${Math.round(item.unit_price || 0).toLocaleString("es-CL")}`}</td>
        <td class="right bold">${isUF ? `${(item.total_uf || 0).toFixed(2)} UF` : `$${Math.round(item.total || 0).toLocaleString("es-CL")}`}</td>
      </tr>`).join("")}
    </tbody>
  </table>
${operationalItems.length > 0 ? `
<div class="section" style="margin-top:0">
  <div class="section-title" style="color:#e67e22">Gastos Operacionales</div>
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
      ${operationalItems.map(item => `
      <tr>
        <td class="bold">
          ${item.service_name || item.description}
          ${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}
        </td>
        <td class="center">${item.quantity}</td>
        <td class="right">${isUF ? `${(item.unit_price_uf || 0).toFixed(2)} UF` : formatCLP(item.unit_price)}</td>
        <td class="right bold">${isUF ? `${(item.total_uf || 0).toFixed(2)} UF` : formatCLP(item.total)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div style="text-align:right;font-size:11px;color:#888;margin-top:4px;font-style:italic;">* Estos gastos son recuperados por el prestador y no constituyen ingreso neto.</div>
</div>` : ""}
  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>${isUF ? `${(quote.subtotal_uf || 0).toFixed(2)} UF` : `$${Math.round(quote.subtotal || 0).toLocaleString("es-CL")}`}</span></div>
      ${isUF ? `<div class="total-note">1 UF = $${Math.round(ufVal).toLocaleString("es-CL")} CLP</div>` : ""}
      ${discount_amount > 0 ? `<div class="total-row"><span style="color:#059669">Descuento (${discount_percent.toFixed(1)}%)</span><span style="color:#059669">-$${Math.round(discount_amount).toLocaleString("es-CL")}</span></div>` : ""}
      ${paymentType === "Con IVA (19%)" ? `<div class="total-row"><span>IVA (19%)</span><span>$${Math.round(quote.iva_amount || 0).toLocaleString("es-CL")}</span></div>` : ""}
      ${isHonorarios ? `
        <div class="total-row"><span>Retención (10,75%)</span><span class="red">-$${Math.round(retencion).toLocaleString("es-CL")}</span></div>
        <div class="total-row"><span>Líquido a pagar</span><span>$${Math.round(liquidoHonorarios).toLocaleString("es-CL")}</span></div>
      ` : ""}
      ${operational_expenses_total > 0 ? `<div class="total-row" style="color:#e67e22"><span>Gastos Operacionales</span><span>${isUF ? Math.round(operational_expenses_total / ufVal * 100) / 100 + " UF" : formatCLP(operational_expenses_total)}</span></div>` : ""}
            <div class="total-row final"><span>Total${isMensual ? " mensual" : ""}</span><span>${isUF ? `${(total_client_uf || 0).toFixed(2)} UF` : `$${Math.round(total_client || 0).toLocaleString("es-CL")}`}</span></div>
      ${isUF ? `<div class="total-note">≈ $${Math.round(total_client || 0).toLocaleString("es-CL")} CLP</div>` : ""}
      ${paymentType === "Sin IVA" ? `<div class="total-note">* Precio no incluye IVA</div>` : ""}
    </div>
  </div>
</div>

${isMensual ? `
<div class="mensual-section">
  <div class="section-title" style="color:#7c3aed;">Condiciones de Servicio Mensual</div>
  <div class="grid2">
    <div><div class="field-label">Tipo de cobro</div><div class="field-value" style="color:#7c3aed;font-weight:700;">🔄 Mensual recurrente</div></div>
    <div><div class="field-label">Día de cobro</div><div class="field-value">Día ${quote.billing_day || "—"} de cada mes</div></div>
    <div><div class="field-label">Monto mensual</div><div class="field-value">$${Math.round(total_client || 0).toLocaleString("es-CL")}</div></div>
  </div>
</div>` : ""}

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

${(() => {
      const opts = quote.payment_options?.length > 0 ? quote.payment_options : (quote.payment_option ? [quote.payment_option] : []);
      if (opts.length === 0) return "";
      return `<div class="payment-section">
  <div class="section-title">Datos de Pago</div>
  ${opts.map((po, i) => `
    ${po.label ? `<div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:6px;${i > 0 ? 'margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;' : ''}">${po.label}</div>` : ""}
    <div class="grid2">
      ${po.titular ? `<div><div class="field-label">Titular</div><div class="field-value">${po.titular}</div></div>` : ""}
      ${po.rut ? `<div><div class="field-label">RUT</div><div class="field-value">${po.rut}</div></div>` : ""}
      ${po.banco ? `<div><div class="field-label">Banco</div><div class="field-value">${po.banco}</div></div>` : ""}
      ${po.tipo_cuenta ? `<div><div class="field-label">Tipo de cuenta</div><div class="field-value">${po.tipo_cuenta}</div></div>` : ""}
      ${po.numero_cuenta ? `<div><div class="field-label">N° de Cuenta</div><div class="field-value">${po.numero_cuenta}</div></div>` : ""}
      ${po.email_confirmacion ? `<div><div class="field-label">Email de confirmación</div><div class="field-value">${po.email_confirmacion}</div></div>` : ""}
    </div>
  `).join("")}
</div>`;
    })()}

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

    // Use hidden iframe to avoid window.open (works on iOS)
    let frame = printFrameRef.current;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;";
      document.body.appendChild(frame);
      printFrameRef.current = frame;
    }
    frame.srcdoc = html;
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch(e) {
        // fallback for strict browsers: open in new tab
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    };
  };

  const handleShare = async () => {
    const text = `Cotización ${quote.quote_number} — ${quote.client_name}`;
    if (navigator.share) {
      await navigator.share({ title: text, text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copiado al portapapeles");
    }
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
            <button onClick={handlePrint}
              className="select-none hidden sm:flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={handlePrint}
              className="select-none sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white" title="Imprimir / PDF">
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
              <div>
                {company?.logo_url && (
                  <img src={company.logo_url} alt="Logo" className="max-h-12 max-w-32 object-contain mb-2" />
                )}
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
                {(quote.items || []).map((item, idx) => (
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