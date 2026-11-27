import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS = {
  Borrador: "#64748b", Enviada: "#0B7FB0", Aceptada: "#059669",
  Rechazada: "#dc2626", Ejecutada: "#7c3aed",
};

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ICONS = {
  check: '<path d="M3 8.5l3 3 7-7"/>',
  instagram: '<rect x="2" y="2" width="12" height="12" rx="3.5"/><circle cx="8" cy="8" r="2.8"/><circle cx="11.6" cy="4.4" r=".5" fill="currentColor"/>',
  web: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/>',
  phone: '<path d="M5.5 2.5l1.3 3-1.4 1a7 7 0 0 0 3.6 3.6l1-1.4 3 1.3v2.3a1.2 1.2 0 0 1-1.3 1.2A11 11 0 0 1 2.3 4.4 1.2 1.2 0 0 1 3.5 3.1z"/>',
  mail: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5L8 9l5.5-4.5"/>',
};
const icon = (name, sw = 1.6) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

// Convierte una descripción larga en una lista de módulos.
// Acepta una línea por módulo, o un párrafo del tipo "Título: texto. Otro título: texto."
function splitFeatures(text) {
  if (!text) return null;
  const lines = text.split(/\n+/).map((s) => s.trim().replace(/^[-•*·]\s*/, "")).filter(Boolean);
  const parts = lines.length >= 3
    ? lines
    : text.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ][^.:\n]{2,60}:\s)/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  return parts.map((p) => {
    const m = p.match(/^([^:]{2,60}):\s*([\s\S]+)$/);
    return m ? { title: m[1].trim(), text: m[2].trim() } : { title: "", text: p };
  });
}

function featuresHtml(features) {
  return `<div class="features${features.length >= 7 ? " cols3" : ""}">${features.map((f) => `
    <div class="feat">${icon("check", 2)}<div>${f.title ? `<strong>${esc(f.title)}</strong>` : ""}<p>${esc(f.text)}</p></div></div>`).join("")}
  </div>`;
}

// Plantilla vigente del PDF de cotizaciones (A4, 794 px de ancho)
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
  const opItems = (quote.items || []).filter((i) => i.is_operational_expense);
  const opTotal = quote.total_operational_expenses || opItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldo = (quote.total_client || quote.total || 0) - totalAbonos;
  const totalClient = quote.total_client || (quote.total || 0) + opTotal;
  const fmtCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const fmtUF = (n) => `${(n || 0).toFixed(2)} UF`;
  const money = (clp, uf) => (isUF ? fmtUF(uf) : fmtCLP(clp));
  const opts = quote.payment_options?.length > 0 ? quote.payment_options : (quote.payment_option ? [quote.payment_option] : []);
  const regularItems = (quote.items || []).filter((i) => !i.is_operational_expense);
  const statusColor = STATUS_COLORS[quote.status] || STATUS_COLORS.Borrador;
  const fmtDate = (d, f) => { try { return d ? format(new Date(d), f, { locale: es }) : ""; } catch { return ""; } };

  const grandAmount = opTotal > 0 ? totalClient : quote.total;
  const grandLabel = opTotal > 0 ? "Total a pagar" : `Total${isMensual ? " mensual" : " a pagar"}`;

  const itemRows = (items) => items.map((item) => {
    const name = item.service_name || item.description;
    const desc = item.service_name ? item.description : "";
    const features = splitFeatures(desc);
    return `
      <div class="item pdf-block">
        <div class="item-row">
          <div class="name">${esc(name)}${desc && !features ? `<small>${esc(desc)}</small>` : ""}</div>
          <div>${esc(item.quantity)}</div>
          <div>${money(item.unit_price, item.unit_price_uf)}</div>
          <div class="strong">${money(item.total, item.total_uf)}</div>
        </div>
        ${features ? featuresHtml(features) : ""}
      </div>`;
  }).join("");

  const itemsCard = (title, items, cls = "") => `
    <div class="items-card ${cls}">
      <div class="items-head pdf-block"><div>${title}</div><div>Cant.</div><div>P. unit.</div><div>Total</div></div>
      ${itemRows(items)}
    </div>`;

  // El nombre del cliente va destacado; la empresa solo se muestra si es una empresa real
  const clientCompany = /^\s*persona\s+particular\s*$/i.test(quote.client_company || "") ? "" : quote.client_company;
  const clientMain = quote.client_name || clientCompany;
  const clientExtra = [clientCompany && clientCompany !== clientMain ? esc(clientCompany) : "", quote.client_rut ? `RUT ${esc(quote.client_rut)}` : ""].filter(Boolean).join(" · ");
  const clientContact = [quote.client_phone, quote.client_email, quote.client_address].filter(Boolean).map(esc).join(" · ");

  const noteLines = (quote.notes || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const notesAsCards = noteLines.length > 0 && noteLines.length <= 6 && noteLines.every((l) => l.length <= 160);
  // Notas cortas van bajo el resumen (aprovecha el espacio libre); si no, en su propia sección
  const notesInTotals = notesAsCards && opts.length > 0 && noteLines.length <= 3;

  const footerItems = [
    company?.instagram && { ic: "instagram", label: "Instagram", value: esc(company.instagram) },
    company?.website && { ic: "web", label: "Página oficial", value: esc(company.website) },
    (company?.phone || company?.phone_secondary) && { ic: "phone", label: "Contacto", value: [company?.phone, company?.phone_secondary].filter(Boolean).map(esc).join("<br>") },
    company?.email && { ic: "mail", label: "Correo", value: esc(company.email) },
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Cotizacion ${esc(company?.company_name || "Empresa")} - ${esc(quote.quote_number)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* Solo Arial/Helvetica: html2canvas mide el texto con la fuente de la página y lo dibuja en canvas.
     Fuentes de sistema (system-ui, -apple-system, Segoe UI) o web no siempre coinciden y las palabras se montan. */
  body { background: #fff; font-family: Arial, Helvetica, sans-serif; font-kerning: none; font-feature-settings: 'liga' 0, 'calt' 0;
         color: #1F201E; font-size: 12.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  :root { --ink:#1F201E; --ink2:#44526A; --ink3:#8592A6; --line:#E3E8EF; --soft:#F5F8FB; --accent:#37BFF0; --accent-soft:#E6F6FC; --accent-dark:#0B7FB0; }
  .pdf-doc { width: 794px; min-height: 1123px; margin: 0 auto; background: #fff; display: flex; flex-direction: column; }
  .content { padding: 0 52px; }
  .top-bar { height: 5px; background: var(--accent); }
  .label { display: block; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink3); margin-bottom: 3px; }

  /* Encabezado */
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; padding: 26px 52px 0; }
  .header-left { flex: 1 1 auto; min-width: 0; }
  .logo { height: 54px; width: auto; max-width: 240px; object-fit: contain; object-position: left center; display: block; margin: 0 0 8px -4px; }
  .company-name { font-size: 12px; font-weight: 700; letter-spacing: .01em; }
  .company-info { color: var(--ink2); font-size: 11px; line-height: 1.65; margin-top: 2px; }
  .header-right { text-align: right; flex: 0 0 auto; max-width: 46%; }
  .doc-type { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--accent-dark); }
  .doc-num { font-size: 24px; font-weight: 700; letter-spacing: -.02em; margin: 2px 0 8px; white-space: nowrap; }
  .status { display: inline-block; padding: 3px 11px; border-radius: 999px; font-size: 10.5px; font-weight: 700; background: ${statusColor}1f; color: ${statusColor}; }

  /* Franja de datos */
  .meta { display: flex; margin: 18px 0 18px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .meta > div { flex: 1 1 0; padding: 10px 14px; border-left: 1px solid var(--line); min-width: 0; }
  .meta > div:first-child { border-left: 0; background: var(--soft); }
  .meta > div.wide { flex: 1.7 1 0; }
  .value { font-weight: 700; font-size: 12px; word-break: break-word; }
  .value small { display: block; font-weight: 400; color: var(--ink2); font-size: 11px; margin-top: 1px; }

  .mensual { display: flex; gap: 36px; margin: -10px 0 26px; padding: 12px 16px; border-radius: 10px; background: var(--accent-soft); }
  .mensual .value { color: var(--accent-dark); }

  h2 { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink3);
       display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  h2::after { content: ""; flex: 1; height: 1px; background: var(--line); }

  /* Ítems */
  .items-card { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .items-card + .items-card { margin-top: 16px; }
  .items-head, .item-row { display: grid; grid-template-columns: 1fr 56px 112px 116px; column-gap: 12px; }
  .items-head { padding: 10px 18px; background: var(--accent); color: var(--ink); font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .op .items-head { background: var(--accent-soft); color: var(--accent-dark); }
  .items-head > div:not(:first-child), .item-row > div:not(:first-child) { text-align: right; }
  .item + .item { border-top: 1px solid var(--line); }
  .item-row { padding: 14px 18px 8px; }
  .item-row .name { font-weight: 700; font-size: 14px; }
  .item-row .name small { display: block; font-weight: 400; font-size: 11.5px; color: var(--ink2); margin-top: 3px; line-height: 1.5; }
  .item-row .strong { font-weight: 700; }
  .item:last-child .item-row:only-child { padding-bottom: 14px; }
  .features { column-count: 2; column-gap: 24px; padding: 4px 18px 6px; }
  .features.cols3 { column-count: 3; column-gap: 18px; }
  .feat { display: flex; gap: 8px; break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
  .feat svg { flex: none; width: 15px; height: 15px; margin-top: 2px; color: var(--accent); }
  .feat strong { display: block; font-size: 11px; line-height: 1.35; }
  .feat p { color: var(--ink2); font-size: 10px; line-height: 1.4; }

  /* Pago + resumen */
  .bottom { display: flex; gap: 30px; margin-top: 18px; align-items: flex-start; }
  .bottom .pay-col { flex: 1.25 1 0; min-width: 0; }
  .bottom .totals { flex: 1 1 0; min-width: 0; }
  .bottom.no-pay { justify-content: flex-end; }
  .bottom.no-pay .totals { flex: 0 0 340px; }
  .pay { background: var(--soft); border-radius: 10px; padding: 14px 16px; }
  .pay + .pay { margin-top: 10px; }
  .pay-label { font-size: 11.5px; font-weight: 700; margin-bottom: 8px; }
  .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 16px; }
  .pay .value { font-size: 12px; }
  .pay-hint { margin-top: 12px; padding-top: 9px; border-top: 1px dashed #CBD3DE; font-size: 10.5px; color: var(--ink2); }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 2px; color: var(--ink2); }
  .row b { color: var(--ink); font-weight: 700; white-space: nowrap; }
  .row.red b { color: #dc2626; } .row.green, .row.green b { color: #059669; }
  .row.sep { border-top: 1px dashed var(--line); margin-top: 4px; }
  .uf-note { text-align: right; font-size: 10px; color: var(--ink3); margin: -4px 2px 4px; }
  .grand { margin-top: 10px; background: var(--accent); color: var(--ink); border-radius: 10px; padding: 13px 16px;
           display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
  .grand .label { color: rgba(31,32,30,.72); margin: 0; }
  .grand .amt { font-size: 28px; font-weight: 700; letter-spacing: -.02em; line-height: 1; white-space: nowrap; }
  .grand-note { font-size: 10px; color: var(--ink3); text-align: right; margin-top: 6px; }

  /* Abonos */
  .abonos { margin-top: 20px; }
  .abono-list { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .abono { display: grid; grid-template-columns: 110px 1fr 130px; gap: 12px; padding: 9px 16px; }
  .abono + .abono { border-top: 1px solid var(--line); }
  .abono > div:last-child { text-align: right; font-weight: 700; color: #059669; }
  .abono-sum { display: flex; justify-content: flex-end; gap: 40px; margin-top: 12px; text-align: right; }
  .abono-sum .value { font-size: 15px; }

  /* Notas */
  .notes { margin-top: 20px; }
  .note-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .note-card { display: flex; gap: 10px; align-items: center; border: 1px solid var(--line); border-radius: 10px; padding: 11px 14px; font-size: 11.5px; }
  .note-card .ico { flex: none; width: 28px; height: 28px; border-radius: 8px; background: var(--accent-soft); color: var(--accent-dark); display: flex; align-items: center; justify-content: center; }
  .note-card .ico svg { width: 15px; height: 15px; }
  .mini-notes { margin-top: 8px; display: flex; flex-direction: column; gap: 5px; }
  .mini-note { display: flex; gap: 9px; align-items: flex-start; background: var(--accent-soft); border-radius: 8px; padding: 6px 10px; font-size: 10.5px; line-height: 1.35; color: var(--ink); }
  .mini-note .ico { flex: none; width: 14px; height: 14px; margin-top: 1px; color: var(--accent-dark); }
  .mini-note .ico svg { width: 14px; height: 14px; display: block; }
  .notes p.plain { font-size: 12px; color: var(--ink2); line-height: 1.65; white-space: pre-line; }

  /* Pie de página */
  .footer { margin-top: auto; padding-top: 12px; }
  .footer-inner { background: var(--accent-soft); border-top: 3px solid var(--accent); padding: 12px 52px 9px; color: var(--ink2); }
  .f-title { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent-dark); margin-bottom: 7px; }
  .f-grid { display: flex; gap: 16px; }
  .f-item { flex: 1 1 0; display: flex; align-items: center; gap: 9px; min-width: 0; }
  .f-item svg { flex: none; width: 17px; height: 17px; color: var(--accent-dark); }
  .f-item .label { font-size: 8.5px; margin-bottom: 1px; }
  .f-item b { color: var(--ink); font-weight: 700; font-size: 11px; word-break: break-word; }
  .f-legal { margin-top: 9px; padding-top: 6px; border-top: 1px solid rgba(11,127,176,.18); display: flex; justify-content: space-between; gap: 12px; font-size: 9.5px; color: var(--ink3); }

  .pdf-block, .bottom, .notes, .abonos, .footer { page-break-inside: avoid; break-inside: avoid; }

  @media (max-width: 600px) {
    .header { padding: 28px 18px 0; flex-direction: column; } .header-right { text-align: left; max-width: none; }
    .content { padding: 0 18px; } .footer-inner { padding-left: 18px; padding-right: 18px; }
    .meta, .bottom, .f-grid, .mensual { flex-direction: column; } .meta > div { border-left: 0; border-top: 1px solid var(--line); }
    .note-cards, .pay-grid { grid-template-columns: 1fr; } .features, .features.cols3 { column-count: 1; }
    .items-head, .item-row { grid-template-columns: 1fr 34px 80px 84px; column-gap: 8px; }
  }
</style>
</head><body>
<div class="pdf-doc">
  <div class="top-bar"></div>

  <div class="header pdf-block">
    <div class="header-left">
      ${company?.logo_url ? `<img class="logo" src="${esc(company.logo_url)}" alt="Logo" />` : ""}
      <div class="company-name">${esc(company?.company_name || "Mi Empresa")}</div>
      <div class="company-info">
        ${[company?.rut ? `RUT ${esc(company.rut)}` : "", esc(company?.address || "")].filter(Boolean).join(" · ")}
        ${company?.phone || company?.email ? `<br>${[company?.phone, company?.email].filter(Boolean).map(esc).join(" · ")}` : ""}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-type">${isHonorarios ? "Boleta de Honorarios" : "Cotización"}</div>
      <div class="doc-num">${esc(quote.quote_number)}</div>
      <span class="status">${esc(quote.status || "Borrador")}</span>
    </div>
  </div>

  <div class="content">
    <div class="meta pdf-block">
      <div class="wide">
        <span class="label">Cliente</span>
        <span class="value">${esc(clientMain)}${clientExtra ? `<small>${clientExtra}</small>` : ""}${clientContact ? `<small>${clientContact}</small>` : ""}</span>
      </div>
      ${quote.title ? `<div class="wide"><span class="label">Proyecto</span><span class="value">${esc(quote.title)}</span></div>` : ""}
      <div><span class="label">Emisión</span><span class="value">${fmtDate(quote.created_date, "dd MMM yyyy")}</span></div>
      ${quote.valid_until ? `<div><span class="label">Válida hasta</span><span class="value">${fmtDate(quote.valid_until, "dd MMM yyyy")}</span></div>` : ""}
    </div>

    ${isMensual ? `
    <div class="mensual pdf-block">
      <div><span class="label">Tipo de servicio</span><span class="value">Mensual recurrente</span></div>
      <div><span class="label">Día de cobro</span><span class="value">Día ${esc(quote.billing_day || "—")} de cada mes</span></div>
      <div><span class="label">Monto mensual</span><span class="value">${isUF ? fmtUF(quote.total / ufVal) : fmtCLP(quote.total)}</span></div>
    </div>` : ""}

    <h2 class="pdf-block">Detalle de servicios</h2>
    ${itemsCard("Descripción", regularItems)}
    ${opItems.length > 0 ? itemsCard("Materiales / Repuestos", opItems, "op") : ""}

    <div class="bottom pdf-block ${opts.length ? "" : "no-pay"}">
      ${opts.length ? `
      <div class="pay-col">
        <h2>Datos de pago</h2>
        ${opts.map((po) => `
        <div class="pay">
          ${po.label && opts.length > 1 ? `<div class="pay-label">${esc(po.label)}</div>` : ""}
          <div class="pay-grid">
            ${po.titular ? `<div><span class="label">Titular</span><span class="value">${esc(po.titular)}</span></div>` : ""}
            ${po.rut ? `<div><span class="label">RUT</span><span class="value">${esc(po.rut)}</span></div>` : ""}
            ${po.banco ? `<div><span class="label">Banco</span><span class="value">${esc(po.banco)}</span></div>` : ""}
            ${po.tipo_cuenta ? `<div><span class="label">Tipo de cuenta</span><span class="value">${esc(po.tipo_cuenta)}</span></div>` : ""}
            ${po.numero_cuenta ? `<div><span class="label">N° de cuenta</span><span class="value">${esc(po.numero_cuenta)}</span></div>` : ""}
            ${po.email_confirmacion ? `<div><span class="label">Confirmación</span><span class="value">${esc(po.email_confirmacion)}</span></div>` : ""}
          </div>
        </div>`).join("")}
        <div class="pay-hint">Indica <b>${esc(quote.quote_number)}</b> en el comentario de la transferencia.</div>
      </div>` : ""}
      <div class="totals">
        <h2>Resumen</h2>
        <div class="row"><span>Subtotal${paymentType === "Con IVA (19%)" ? " neto" : ""}</span><b>${money(quote.subtotal, quote.subtotal_uf)}</b></div>
        ${isUF ? `<div class="uf-note">1 UF = ${fmtCLP(ufVal)}</div>` : ""}
        ${discount_amount > 0 ? `<div class="row green"><span>Descuento (${discount_percent.toFixed(1)}%)</span><b>-${fmtCLP(discount_amount)}</b></div>` : ""}
        ${paymentType === "Con IVA (19%)" ? `<div class="row"><span>IVA (19%)</span><b>${fmtCLP(quote.iva_amount)}</b></div>` : ""}
        ${isHonorarios ? `<div class="row red"><span>Retención (10,75%)</span><b>-${fmtCLP(retencion)}</b></div><div class="row"><span>Líquido a pagar</span><b>${fmtCLP(liquido)}</b></div>` : ""}
        ${opTotal > 0 ? `
        <div class="row sep"><span>Total servicios${isMensual ? " (mensual)" : ""}</span><b>${isUF ? fmtUF(quote.total / ufVal) : fmtCLP(quote.total)}</b></div>
        <div class="row"><span>Materiales / Repuestos</span><b>${isUF ? fmtUF(opTotal / ufVal) : fmtCLP(opTotal)}</b></div>` : ""}
        <div class="grand">
          <span class="label">${grandLabel}</span>
          <span class="amt">${isUF ? fmtUF(grandAmount / ufVal) : fmtCLP(grandAmount)}</span>
        </div>
        <div class="grand-note">${paymentType === "Sin IVA" ? "* Precio no incluye IVA" : paymentType === "Con IVA (19%)" ? "Valores en pesos chilenos, IVA incluido." : ""}</div>
        ${notesInTotals ? `<div class="mini-notes">${noteLines.map((l) => `<div class="mini-note"><span class="ico">${icon("check", 2.2)}</span><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
      </div>
    </div>

    ${(quote.abonos || []).length > 0 ? `
    <div class="abonos pdf-block">
      <h2>Abonos recibidos</h2>
      <div class="abono-list">
        ${(quote.abonos || []).map((a) => `
        <div class="abono"><div>${a.fecha ? fmtDate(a.fecha, "dd/MM/yyyy") : "—"}</div><div>${esc(a.nota || "—")}</div><div>${fmtCLP(a.monto)}</div></div>`).join("")}
      </div>
      <div class="abono-sum">
        <div><span class="label">Total abonado</span><span class="value" style="color:#059669">${fmtCLP(totalAbonos)}</span></div>
        <div><span class="label">Saldo pendiente</span><span class="value" style="color:${saldo <= 0 ? "#059669" : "#dc2626"}">${fmtCLP(saldo)}</span></div>
      </div>
    </div>` : ""}

    ${noteLines.length && !notesInTotals ? `
    <div class="notes pdf-block">
      <h2>Notas y condiciones</h2>
      ${notesAsCards
        ? `<div class="note-cards">${noteLines.map((l) => `<div class="note-card"><div class="ico">${icon("check", 2)}</div><div>${esc(l)}</div></div>`).join("")}</div>`
        : `<p class="plain">${esc(quote.notes)}</p>`}
    </div>` : ""}
  </div>

  <div class="footer pdf-block">
    <div class="footer-inner">
      ${footerItems.length ? `
      <div class="f-title">Nos encuentras en</div>
      <div class="f-grid">
        ${footerItems.map((f) => `<div class="f-item">${icon(f.ic)}<div><span class="label">${f.label}</span><b>${f.value}</b></div></div>`).join("")}
      </div>` : ""}
      <div class="f-legal">
        <span>${esc(company?.company_name || "Mi Empresa")}${company?.rut ? ` · RUT ${esc(company.rut)}` : ""}</span>
        <span>Documento generado digitalmente</span>
      </div>
    </div>
  </div>
</div>
</body></html>`;
}
