import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

// Plantilla vigente del PDF de cotizaciones
export function buildQuoteHtml(quote, company) {
  const isUF = quote.currency === "UF";
  const ufVal = quote.uf_value || 1;
  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  const retencion = isHonorarios ? Math.round((quote.subtotal || 0) * 0.1075) : 0;
  const liquido = isHonorarios ? (quote.subtotal || 0) - retencion : 0;
  const discount_amount = quote.discount_amount || 0;
  const discount_percent = quote.discount_percent || 0;
  const isMensual = quote.billing_type === "Mensual";
  const opItems = (quote.items || []).filter(i => i.is_operational_expense);
  const opTotal = quote.total_operational_expenses || opItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldo = (quote.total_client || quote.total || 0) - totalAbonos;
  const totalClient = quote.total_client || (quote.total || 0) + opTotal;
  const fmtCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const fmtUF = (n) => `${(n || 0).toFixed(2)} UF`;
  const opts = quote.payment_options?.length > 0 ? quote.payment_options : (quote.payment_option ? [quote.payment_option] : []);
  const regularItems = (quote.items || []).filter(i => !i.is_operational_expense);
  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Cotizacion ${company?.company_name || 'Empresa'} - ${quote.quote_number}</title>
<style>
  @page { size: Letter; margin: 0; }
  * { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  body { background: white; color: #1e293b; font-size: 13px; line-height: 1.5; }
  .pdf-doc { width: 794px; margin: 0 auto; background: white; }

  .header { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: nowrap; gap: 20px; page-break-inside: avoid; break-inside: avoid; }
  .header-left { flex: 1 1 auto; min-width: 0; max-width: 55%; display: flex; flex-direction: column; gap: 14px; }
  .header-left .company-info h1 { font-size: 16px; font-weight: 700; color: white; word-break: break-word; overflow-wrap: break-word; line-height: 1.35; letter-spacing: -0.01em; }
  .header-left .company-info p { font-size: 11px; color: #94a3b8; margin-top: 3px; word-break: break-word; overflow-wrap: break-word; }
  .header-right { text-align: right; flex: 0 0 auto; min-width: 170px; max-width: 42%; word-break: break-word; overflow-wrap: break-word; }
  .header-right .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; font-weight: 600; }
  .header-right .number { font-size: 20px; font-weight: 700; color: white; letter-spacing: -0.02em; }
  .header-right .date { font-size: 11px; color: #94a3b8; margin-top: 5px; }
  .status-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-top: 8px; background: ${statusColor}22; color: ${statusColor}; }

  .section { padding: 22px 40px; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid; }
  .section-title { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #0f172a; display: flex; align-items: center; gap: 8px; }
  .section-title::before { content: ""; display: inline-block; width: 4px; height: 14px; background: #0f172a; border-radius: 2px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; }
  .field-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .field-value { font-size: 12.5px; color: #1e293b; font-weight: 500; }

  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  thead tr { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th { font-size: 10px; font-weight: 600; color: white; padding: 10px 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; }
  th.right { text-align: right; } th.center { text-align: center; }
  tbody tr { page-break-inside: avoid; break-inside: avoid; }
  tbody tr:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { font-size: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
  td.center { text-align: center; } td.right { text-align: right; } td.bold { font-weight: 600; color: #0f172a; }
  .item-name { font-weight: 600; color: #0f172a; font-size: 12.5px; }
  .sub { font-size: 10.5px; color: #64748b; margin-top: 4px; line-height: 1.45; }

  .totals-wrap { margin-top: 18px; display: flex; justify-content: flex-end; page-break-inside: avoid; break-inside: avoid; }
  .totals-box { width: 260px; background: #f8fafc; border-radius: 8px; padding: 16px 18px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px; }
  .total-row span:first-child { color: #64748b; }
  .total-row span:last-child { font-weight: 500; color: #0f172a; }
  .total-row.final { border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 8px; margin-bottom: 0; }
  .total-row.final span { font-weight: 700; font-size: 15px; color: #0f172a; }
  .total-note { font-size: 10px; color: #94a3b8; margin-top: 6px; text-align: right; }
  .red { color: #dc2626; } .green { color: #059669; }

  .payment-section { padding: 20px 40px; background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid; }
  .notes { padding: 20px 40px; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; break-inside: avoid; }
  .notes p { font-size: 12px; color: #475569; line-height: 1.65; white-space: pre-line; }
  .footer { padding: 16px 40px; text-align: center; background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .footer p { font-size: 10px; color: #94a3b8; }
  .footer p.brand { color: white; font-weight: 600; font-size: 11px; margin-bottom: 2px; }

  .mensual-banner { padding: 14px 40px; background: #f5f3ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #ede9fe; display: flex; gap: 32px; page-break-inside: avoid; break-inside: avoid; }
  .mensual-banner .mb-item .mb-label { font-size: 9px; color: #8b5cf6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .mensual-banner .mb-item .mb-value { font-size: 13px; font-weight: 700; color: #6d28d9; margin-top: 2px; }

  .op-block { margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
  .op-title { font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; padding: 8px 12px; background: #eef2ff; border-radius: 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .op-title::before { content: "⚙ "; }

  @media (max-width: 600px) { .header { padding: 22px 18px; } .section, .payment-section, .notes, .footer, .mensual-banner { padding-left: 18px; padding-right: 18px; } .grid2 { grid-template-columns: 1fr; } .totals-box { width: 100%; } }
</style>
</head><body>
<div class="pdf-doc">
  <div class="header">
    <div class="header-left">
      ${company?.logo_url ? `<div class="logo-wrap"><img src="${company.logo_url}" alt="Logo" style="max-height:80px;max-width:190px;object-fit:contain;display:block;" /></div>` : ""}
      <div class="company-info">
        <h1>${company?.company_name || "Mi Empresa"}</h1>
        ${company?.rut ? `<p>RUT: ${company.rut}</p>` : ""}
        ${company?.address ? `<p>${company.address}</p>` : ""}
        <p>${[company?.phone, company?.email].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
    <div class="header-right">
      <div class="label">${isHonorarios ? "Boleta de Honorarios" : "Cotización"}</div>
      <div class="number">${quote.quote_number}</div>
      ${quote.title ? `<div style="color:#cbd5e1;font-size:12px;margin-top:4px;font-weight:500;word-break:break-word;overflow-wrap:break-word;">${quote.title}</div>` : ""}
      <div class="date">${format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}</div>
      ${quote.valid_until ? `<div class="date">Válida hasta: ${format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</div>` : ""}
      <div class="status-badge">${quote.status || "Borrador"}</div>
    </div>
  </div>

  ${isMensual ? `
  <div class="mensual-banner">
    <div class="mb-item"><div class="mb-label">Tipo de servicio</div><div class="mb-value">🔄 Mensual recurrente</div></div>
    <div class="mb-item"><div class="mb-label">Día de cobro</div><div class="mb-value">Día ${quote.billing_day || "—"} de cada mes</div></div>
    <div class="mb-item"><div class="mb-label">Monto mensual</div><div class="mb-value">${isUF ? fmtUF(quote.total / ufVal) : fmtCLP(quote.total)}</div></div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <div class="grid2">
      <div><div class="field-label">Nombre</div><div class="field-value">${quote.client_name}</div></div>
      ${quote.client_company ? `<div><div class="field-label">Empresa</div><div class="field-value">${quote.client_company}</div></div>` : ""}
      ${quote.client_rut ? `<div><div class="field-label">RUT</div><div class="field-value">${quote.client_rut}</div></div>` : ""}
      ${quote.client_phone ? `<div><div class="field-label">Teléfono</div><div class="field-value">${quote.client_phone}</div></div>` : ""}
      ${quote.client_email ? `<div><div class="field-label">Email</div><div class="field-value">${quote.client_email}</div></div>` : ""}
      ${quote.client_address ? `<div><div class="field-label">Dirección</div><div class="field-value">${quote.client_address}</div></div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalle de Servicios</div>
    <table>
      <thead><tr><th>Descripción</th><th class="center">Cant.</th><th class="right">P. Unit.</th><th class="right">Total</th></tr></thead>
      <tbody>
        ${regularItems.map(item => `
        <tr>
          <td><div class="item-name">${item.service_name || item.description}</div>${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${isUF ? fmtUF(item.unit_price_uf) : fmtCLP(item.unit_price)}</td>
          <td class="right bold">${isUF ? fmtUF(item.total_uf) : fmtCLP(item.total)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    ${opItems.length > 0 ? `
    <div class="op-block">
      <div class="op-title">Materiales / Repuestos</div>
      <table>
        <thead><tr style="background:#1e40af;"><th>Descripción</th><th class="center">Cant.</th><th class="right">P. Unit.</th><th class="right">Total</th></tr></thead>
        <tbody>
          ${opItems.map(item => `
          <tr>
            <td><div class="item-name">${item.service_name || item.description}</div>${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${isUF ? fmtUF(item.unit_price_uf) : fmtCLP(item.unit_price)}</td>
            <td class="right bold">${isUF ? fmtUF(item.total_uf) : fmtCLP(item.total)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${isUF ? fmtUF(quote.subtotal_uf) : fmtCLP(quote.subtotal)}</span></div>
        ${isUF ? `<div style="font-size:10px;color:#94a3b8;text-align:right;margin-bottom:6px;">1 UF = ${fmtCLP(ufVal)}</div>` : ""}
        ${discount_amount > 0 ? `<div class="total-row"><span style="color:#059669">Descuento (${discount_percent.toFixed(1)}%)</span><span style="color:#059669">-${fmtCLP(discount_amount)}</span></div>` : ""}
        ${paymentType === "Con IVA (19%)" ? `<div class="total-row"><span>IVA (19%)</span><span>${fmtCLP(quote.iva_amount)}</span></div>` : ""}
        ${isHonorarios ? `<div class="total-row"><span>Retención (10,75%)</span><span class="red">-${fmtCLP(retencion)}</span></div><div class="total-row"><span>Líquido a pagar</span><span>${fmtCLP(liquido)}</span></div>` : ""}
        <div class="total-row final"><span>Total${isMensual ? " mensual" : ""}</span><span>${isUF ? fmtUF(quote.total / ufVal) : fmtCLP(quote.total)}</span></div>
        ${paymentType === "Sin IVA" ? `<div class="total-note">* Precio no incluye IVA</div>` : ""}
        ${opTotal > 0 ? `
          <div class="total-row" style="border-top:1px dashed #c7d2fe;margin-top:8px;padding-top:8px;">
            <span style="color:#1e40af;font-weight:600;">Materiales / Repuestos</span>
            <span style="font-weight:600;color:#1e40af;">${isUF ? fmtUF(opTotal / ufVal) : fmtCLP(opTotal)}</span>
          </div>
          <div class="total-row final" style="background:#eef2ff;padding:10px;border-radius:6px;margin-top:6px;border-top:0;">
            <span style="color:#1e3a8a;">Total a Pagar</span>
            <span style="color:#1e3a8a;">${isUF ? fmtUF(totalClient / ufVal) : fmtCLP(totalClient)}</span>
          </div>` : ""}
      </div>
    </div>
  </div>

  ${(quote.abonos || []).length > 0 ? `
  <div class="section">
    <div class="section-title">Abonos Recibidos</div>
    <table>
      <thead><tr><th>Fecha</th><th>Nota</th><th class="right">Monto</th></tr></thead>
      <tbody>
        ${(quote.abonos || []).map(a => `
        <tr>
          <td>${a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
          <td>${a.nota || "—"}</td>
          <td class="right green" style="font-weight:600;">${fmtCLP(a.monto)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;gap:40px;margin-top:14px;font-size:12px;">
      <div style="text-align:right"><div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Total abonado</div><div style="font-weight:600;color:#059669;font-size:14px;margin-top:2px;">${fmtCLP(totalAbonos)}</div></div>
      <div style="text-align:right"><div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;">Saldo pendiente</div><div style="font-weight:700;font-size:14px;color:${saldo <= 0 ? "#059669" : "#ef4444"};margin-top:2px;">${fmtCLP(saldo)}</div></div>
    </div>
  </div>` : ""}

  ${opts.length > 0 ? `
  <div class="payment-section">
    <div class="section-title">Datos de Pago</div>
    ${opts.map((po, i) => `
      ${po.label ? `<div style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:8px;${i > 0 ? "margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;" : ""}">${po.label}</div>` : ""}
      <div class="grid2">
        ${po.titular ? `<div><div class="field-label">Titular</div><div class="field-value">${po.titular}</div></div>` : ""}
        ${po.rut ? `<div><div class="field-label">RUT</div><div class="field-value">${po.rut}</div></div>` : ""}
        ${po.banco ? `<div><div class="field-label">Banco</div><div class="field-value">${po.banco}</div></div>` : ""}
        ${po.tipo_cuenta ? `<div><div class="field-label">Tipo de cuenta</div><div class="field-value">${po.tipo_cuenta}</div></div>` : ""}
        ${po.numero_cuenta ? `<div><div class="field-label">N° de Cuenta</div><div class="field-value">${po.numero_cuenta}</div></div>` : ""}
        ${po.email_confirmacion ? `<div><div class="field-label">Email de confirmación</div><div class="field-value">${po.email_confirmacion}</div></div>` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${quote.notes ? `<div class="notes"><div class="section-title">Notas y Condiciones</div><p>${quote.notes}</p></div>` : ""}

  <div class="footer">
    <p class="brand">${company?.company_name || "Mi Empresa"}</p>
    <p>${[company?.email, company?.phone].filter(Boolean).join(" · ")}</p>
    <p style="margin-top:3px;color:#64748b;">Documento generado digitalmente</p>
  </div>
</div>
</body></html>`;
}