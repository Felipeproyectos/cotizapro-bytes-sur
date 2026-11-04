import { format } from "date-fns";
import { es } from "date-fns/locale";

export const fmtCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
export const fmtUF = (n) => `${(n || 0).toFixed(2)} UF`;

// Valores calculados de la cotización, compartidos por los tres diseños
export function quoteData(quote) {
  const isUF = quote.currency === "UF";
  const ufVal = quote.uf_value || 1;
  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  const items = quote.items || [];
  const opItems = items.filter((i) => i.is_operational_expense);
  const regularItems = items.filter((i) => !i.is_operational_expense);
  const subtotal = quote.subtotal || 0;
  const retencion = isHonorarios ? Math.round(subtotal * 0.1075) : 0;
  const opTotal = quote.total_operational_expenses || opItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const totalClient = quote.total_client || (quote.total || 0) + opTotal;
  const opts = quote.payment_options?.length > 0
    ? quote.payment_options
    : (quote.payment_option ? [quote.payment_option] : []);
  const isMensual = quote.billing_type === "Mensual";

  return {
    quote, isUF, ufVal, paymentType, isHonorarios, retencion,
    liquido: subtotal - retencion,
    discount_amount: quote.discount_amount || 0,
    discount_percent: quote.discount_percent || 0,
    isMensual, opItems, regularItems, opTotal,
    totalAbonos, saldo: totalClient - totalAbonos, totalClient, opts,
    docType: isHonorarios ? "Boleta de Honorarios" : "Cotización",
    createdLabel: quote.created_date
      ? format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })
      : "",
    validLabel: quote.valid_until ? format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es }) : "",
    totalLabel: isMensual ? "Total mensual" : "Total",
    price: (clp, uf) => (isUF ? fmtUF(uf) : fmtCLP(clp)),
    money: (clp) => (isUF ? fmtUF(clp / ufVal) : fmtCLP(clp)),
  };
}

export function clientFields(quote) {
  return [
    { label: "Nombre", value: quote.client_name },
    { label: "Empresa", value: quote.client_company },
    { label: "RUT", value: quote.client_rut },
    { label: "Email", value: quote.client_email },
    { label: "Teléfono", value: quote.client_phone },
    { label: "Dirección", value: quote.client_address },
  ].filter((f) => f.value);
}

export function companyLines(company) {
  return [
    company?.rut ? `RUT ${company.rut}` : null,
    company?.address,
    company?.phone,
    company?.email,
    company?.website,
  ].filter(Boolean);
}

// Estructura mínima compartida: cada diseño cambia colores, tipografía y encabezado
export function baseCss() {
  return `
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; }
  .pdf-doc { width: 794px; margin: 0 auto; background: #ffffff; }
  .section { padding: 22px 40px; page-break-inside: avoid; break-inside: avoid; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 28px; }
  .field-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; margin-bottom: 2px; }
  .field-value { font-size: 12.5px; font-weight: 500; word-break: break-word; overflow-wrap: break-word; }
  table.items-table { width: 100%; border-collapse: collapse; }
  .items-table th { font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; padding: 9px 10px; text-align: left; }
  .items-table td { font-size: 12px; padding: 11px 10px; vertical-align: top; }
  .items-table .center { text-align: center; }
  .items-table .right { text-align: right; }
  .items-table .item-name { font-weight: 600; font-size: 12.5px; }
  .items-table .sub { font-size: 10.5px; margin-top: 3px; line-height: 1.45; }
  .items-table tbody tr { page-break-inside: avoid; break-inside: avoid; }
  .op-block { margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
  .op-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 7px 10px; border-radius: 4px; margin-bottom: 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .totals-wrap { margin-top: 18px; display: flex; justify-content: flex-end; page-break-inside: avoid; break-inside: avoid; }
  .totals-box { width: 268px; }
  .total-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 4px 0; }
  .total-row.final { margin-top: 6px; }
  .total-row.final span { font-weight: 700; font-size: 15px; }
  .total-note { font-size: 10px; margin-top: 6px; text-align: right; }
  .mensual-banner { padding: 13px 40px; display: flex; gap: 34px; page-break-inside: avoid; break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .mb-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; }
  .mb-value { font-size: 12.5px; font-weight: 700; margin-top: 2px; }
  .pay-opt { page-break-inside: avoid; break-inside: avoid; }
  .pay-title { font-size: 11.5px; font-weight: 700; margin-bottom: 8px; }
  .green { color: #059669; }
  .red { color: #dc2626; }
  @media (max-width: 600px) {
    .section, .mensual-banner { padding-left: 18px; padding-right: 18px; }
    .grid2 { grid-template-columns: 1fr; }
    .totals-box { width: 100%; }
  }`;
}

export function clientSection(d) {
  return `
  <div class="section">
    <div class="section-title">Datos del cliente</div>
    <div class="grid2">
      ${clientFields(d.quote).map((f) => `<div><div class="field-label">${f.label}</div><div class="field-value">${f.value}</div></div>`).join("")}
    </div>
  </div>`;
}

export function itemsSection(d) {
  const row = (item) => `
      <tr>
        <td>
          <div class="item-name">${item.service_name || item.description || ""}</div>
          ${item.service_name && item.description ? `<div class="sub">${item.description}</div>` : ""}
        </td>
        <td class="center">${item.quantity ?? 1}</td>
        <td class="right">${d.price(item.unit_price, item.unit_price_uf)}</td>
        <td class="right bold">${d.price(item.total, item.total_uf)}</td>
      </tr>`;

  const head = `<thead><tr><th>Descripción</th><th class="center">Cant.</th><th class="right">P. unit.</th><th class="right">Total</th></tr></thead>`;

  return `
  <div class="section">
    <div class="section-title">Detalle de servicios</div>
    <table class="items-table">${head}<tbody>${d.regularItems.map(row).join("")}</tbody></table>
    ${d.opItems.length > 0 ? `
    <div class="op-block">
      <div class="op-title">Materiales / Repuestos</div>
      <table class="items-table">${head}<tbody>${d.opItems.map(row).join("")}</tbody></table>
    </div>` : ""}
    ${totalsBlock(d)}
  </div>`;
}

export function totalsBlock(d) {
  const q = d.quote;
  return `
    <div class="totals-wrap">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>${d.price(q.subtotal, q.subtotal_uf)}</span></div>
        ${d.isUF ? `<div class="total-note" style="margin-top:0;margin-bottom:4px;">1 UF = ${fmtCLP(d.ufVal)}</div>` : ""}
        ${d.discount_amount > 0 ? `<div class="total-row"><span class="green">Descuento (${d.discount_percent.toFixed(1)}%)</span><span class="green">-${fmtCLP(d.discount_amount)}</span></div>` : ""}
        ${d.paymentType === "Con IVA (19%)" ? `<div class="total-row"><span>IVA (19%)</span><span>${fmtCLP(q.iva_amount)}</span></div>` : ""}
        ${d.isHonorarios ? `
          <div class="total-row"><span>Retención (10,75%)</span><span class="red">-${fmtCLP(d.retencion)}</span></div>
          <div class="total-row"><span>Líquido a pagar</span><span>${fmtCLP(d.liquido)}</span></div>` : ""}
        <div class="total-row final"><span>${d.totalLabel}</span><span>${d.price(q.total, q.total_uf)}</span></div>
        ${d.paymentType === "Sin IVA" ? `<div class="total-note">* Precio no incluye IVA</div>` : ""}
        ${d.opTotal > 0 ? `
          <div class="total-row" style="margin-top:8px;padding-top:8px;"><span>Materiales / Repuestos</span><span>${d.money(d.opTotal)}</span></div>
          <div class="total-row final"><span>Total a pagar</span><span>${d.money(d.totalClient)}</span></div>` : ""}
      </div>
    </div>`;
}

export function abonosSection(d) {
  if (!(d.quote.abonos || []).length) return "";
  return `
  <div class="section">
    <div class="section-title">Abonos recibidos</div>
    <table class="items-table">
      <thead><tr><th>Fecha</th><th>Nota</th><th class="right">Monto</th></tr></thead>
      <tbody>
        ${d.quote.abonos.map((a) => `
        <tr>
          <td>${a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
          <td class="sub">${a.nota || "—"}</td>
          <td class="right green" style="font-weight:600;">${fmtCLP(a.monto)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="totals-wrap">
      <div class="totals-box" style="display:flex;justify-content:space-between;gap:24px;">
        <div><div class="field-label">Total abonado</div><div class="green" style="font-weight:700;font-size:13px;">${fmtCLP(d.totalAbonos)}</div></div>
        <div style="text-align:right;"><div class="field-label">Saldo pendiente</div><div class="${d.saldo <= 0 ? "green" : "red"}" style="font-weight:700;font-size:13px;">${fmtCLP(d.saldo)}</div></div>
      </div>
    </div>
  </div>`;
}

export function paymentSection(d) {
  if (!d.opts.length) return "";
  return `
  <div class="section payment-section">
    <div class="section-title">Datos de pago</div>
    ${d.opts.map((po, i) => `
      <div class="pay-opt" ${i > 0 ? 'style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(120,130,150,.25);"' : ""}>
        ${po.label ? `<div class="pay-title">${po.label}</div>` : ""}
        <div class="grid2">
          ${po.titular ? `<div><div class="field-label">Titular</div><div class="field-value">${po.titular}</div></div>` : ""}
          ${po.rut ? `<div><div class="field-label">RUT</div><div class="field-value">${po.rut}</div></div>` : ""}
          ${po.banco ? `<div><div class="field-label">Banco</div><div class="field-value">${po.banco}</div></div>` : ""}
          ${po.tipo_cuenta ? `<div><div class="field-label">Tipo de cuenta</div><div class="field-value">${po.tipo_cuenta}</div></div>` : ""}
          ${po.numero_cuenta ? `<div><div class="field-label">N° de cuenta</div><div class="field-value">${po.numero_cuenta}</div></div>` : ""}
          ${po.email_confirmacion ? `<div><div class="field-label">Email de confirmación</div><div class="field-value">${po.email_confirmacion}</div></div>` : ""}
        </div>
      </div>`).join("")}
  </div>`;
}

export function notesSection(d) {
  if (!d.quote.notes) return "";
  return `
  <div class="section notes-section">
    <div class="section-title">Notas y condiciones</div>
    <p class="notes-text">${d.quote.notes}</p>
  </div>`;
}

export function mensualBanner(d) {
  if (!d.isMensual) return "";
  return `
  <div class="mensual-banner">
    <div class="mb-item"><div class="mb-label">Tipo de servicio</div><div class="mb-value">Mensual recurrente</div></div>
    <div class="mb-item"><div class="mb-label">Día de cobro</div><div class="mb-value">Día ${d.quote.billing_day || "—"} de cada mes</div></div>
    <div class="mb-item"><div class="mb-label">Monto mensual</div><div class="mb-value">${d.price(d.quote.total, d.quote.total_uf)}</div></div>
  </div>`;
}

export function docShell(title, css, body) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>${baseCss()}${css}</style>
</head><body>
<div class="pdf-doc">
${body}
</div>
</body></html>`;
}