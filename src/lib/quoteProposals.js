import { format } from "date-fns";
import { es } from "date-fns/locale";

/* ─────────── datos y helpers compartidos ─────────── */

const fmtCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
const fmtUF = (n) => `${(n || 0).toFixed(2)} UF`;

const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

function data(quote) {
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

  return {
    quote, isUF, ufVal, paymentType, isHonorarios, retencion, liquido: subtotal - retencion,
    discount_amount: quote.discount_amount || 0,
    discount_percent: quote.discount_percent || 0,
    isMensual: quote.billing_type === "Mensual",
    opItems, regularItems, opTotal, totalAbonos, totalClient,
    saldo: totalClient - totalAbonos,
    opts,
    statusColor: STATUS_COLORS[quote.status] || "#94a3b8",
    docType: isHonorarios ? "Boleta de Honorarios" : "Cotización",
    dateLabel: quote.created_date ? format(new Date(quote.created_date), "dd MMM yyyy", { locale: es }) : "—",
    validLabel: quote.valid_until ? format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es }) : "—",
    totalLabel: quote.billing_type === "Mensual" ? "Total mensual" : "Total",
    price: (clp, uf) => (isUF ? fmtUF(uf) : fmtCLP(clp)),
    money: (clp) => (isUF ? fmtUF(clp / ufVal) : fmtCLP(clp)),
  };
}

const clientCells = (q) => [
  { label: "Nombre", value: q.client_name },
  { label: "Empresa", value: q.client_company },
  { label: "RUT", value: q.client_rut },
  { label: "Email", value: q.client_email },
  { label: "Teléfono", value: q.client_phone },
  { label: "Dirección", value: q.client_address },
].filter((f) => f.value);

const clientLine = (q) => [
  q.client_company && q.client_company !== q.client_name ? q.client_company : null,
  q.client_rut,
  q.client_email,
  q.client_phone,
  q.client_address,
].filter(Boolean).join(" · ");

const logoImg = (company) => (company?.logo_url ? `<img class="lg" src="${company.logo_url}" alt="Logo"/>` : "");
const statusDot = (d) => `<span class="dot" style="background:${d.statusColor}"></span>`;

/* ─────────── bloques de cuerpo compartidos ─────────── */

function itemsBlock(d) {
  const row = (item) => `
      <tr>
        <td>
          <div class="iname">${item.service_name || item.description || ""}</div>
          ${item.service_name && item.description ? `<div class="isub">${item.description}</div>` : ""}
        </td>
        <td class="c">${item.quantity ?? 1}</td>
        <td class="r">${d.price(item.unit_price, item.unit_price_uf)}</td>
        <td class="r b">${d.price(item.total, item.total_uf)}</td>
      </tr>`;

  const head = `<thead><tr><th>Descripción</th><th class="c">Cant.</th><th class="r">P. unitario</th><th class="r">Total</th></tr></thead>`;

  return `
  <section class="block">
    <div class="eyebrow">Detalle de servicios</div>
    <table class="tbl">${head}<tbody>${d.regularItems.map(row).join("")}</tbody></table>
    ${d.opItems.length ? `
    <div class="op">
      <div class="eyebrow">Materiales y repuestos</div>
      <table class="tbl">${head}<tbody>${d.opItems.map(row).join("")}</tbody></table>
    </div>` : ""}
    ${totalsBlock(d)}
  </section>`;
}

function totalsBlock(d) {
  const q = d.quote;
  return `
  <div class="totals">
    <div class="tbox">
      <div class="trow"><span>Subtotal</span><b>${d.price(q.subtotal, q.subtotal_uf)}</b></div>
      ${d.isUF ? `<div class="tnote" style="margin:0 0 4px;">1 UF = ${fmtCLP(d.ufVal)}</div>` : ""}
      ${d.discount_amount > 0 ? `<div class="trow"><span class="green">Descuento (${d.discount_percent.toFixed(1)}%)</span><b class="green">-${fmtCLP(d.discount_amount)}</b></div>` : ""}
      ${d.paymentType === "Con IVA (19%)" ? `<div class="trow"><span>IVA (19%)</span><b>${fmtCLP(q.iva_amount)}</b></div>` : ""}
      ${d.isHonorarios ? `
        <div class="trow"><span>Retención (10,75%)</span><b class="red">-${fmtCLP(d.retencion)}</b></div>
        <div class="trow"><span>Líquido a pagar</span><b>${fmtCLP(d.liquido)}</b></div>` : ""}
      <div class="trow tfinal"><span>${d.totalLabel}</span><b>${d.price(q.total, q.total_uf)}</b></div>
      ${d.paymentType === "Sin IVA" ? `<div class="tnote">* Precio no incluye IVA</div>` : ""}
      ${d.opTotal > 0 ? `
        <div class="trow" style="margin-top:6px;"><span>Materiales y repuestos</span><b>${d.money(d.opTotal)}</b></div>
        <div class="trow tfinal"><span>Total a pagar</span><b>${d.money(d.totalClient)}</b></div>` : ""}
    </div>
  </div>`;
}

function abonosBlock(d) {
  if (!(d.quote.abonos || []).length) return "";
  return `
  <section class="block">
    <div class="eyebrow">Abonos recibidos</div>
    <table class="tbl">
      <thead><tr><th>Fecha</th><th>Nota</th><th class="r">Monto</th></tr></thead>
      <tbody>
        ${d.quote.abonos.map((a) => `
        <tr>
          <td>${a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
          <td class="isub" style="margin:0;">${a.nota || "—"}</td>
          <td class="r green b">${fmtCLP(a.monto)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="abres">
      <div><div class="lbl">Total abonado</div><div class="abval green">${fmtCLP(d.totalAbonos)}</div></div>
      <div style="text-align:right;"><div class="lbl">Saldo pendiente</div><div class="abval ${d.saldo <= 0 ? "green" : "red"}">${fmtCLP(d.saldo)}</div></div>
    </div>
  </section>`;
}

function paymentBlock(d) {
  if (!d.opts.length) return "";
  return `
  <section class="block">
    <div class="eyebrow">Datos de pago</div>
    ${d.opts.map((po, i) => `
      <div class="pay-opt" ${i > 0 ? 'style="margin-top:14px;padding-top:12px;border-top:1px solid #eef1f5;"' : ""}>
        ${po.label ? `<div class="pay-label">${po.label}</div>` : ""}
        <div class="pay-grid">
          ${po.titular ? `<div><div class="lbl">Titular</div><div class="val">${po.titular}</div></div>` : ""}
          ${po.rut ? `<div><div class="lbl">RUT</div><div class="val">${po.rut}</div></div>` : ""}
          ${po.banco ? `<div><div class="lbl">Banco</div><div class="val">${po.banco}</div></div>` : ""}
          ${po.tipo_cuenta ? `<div><div class="lbl">Tipo de cuenta</div><div class="val">${po.tipo_cuenta}</div></div>` : ""}
          ${po.numero_cuenta ? `<div><div class="lbl">N° de cuenta</div><div class="val">${po.numero_cuenta}</div></div>` : ""}
          ${po.email_confirmacion ? `<div><div class="lbl">Email de confirmación</div><div class="val">${po.email_confirmacion}</div></div>` : ""}
        </div>
      </div>`).join("")}
  </section>`;
}

function notesBlock(d) {
  if (!d.quote.notes) return "";
  return `
  <section class="block">
    <div class="eyebrow">Notas y condiciones</div>
    <p class="notes-text">${d.quote.notes}</p>
  </section>`;
}

function footerBlock(company) {
  return `
  <footer class="foot">
    <span>${company?.company_name || "Mi Empresa"}${company?.rut ? ` · RUT ${company.rut}` : ""}</span>
    <span>${[company?.email, company?.phone, company?.website].filter(Boolean).join(" · ")}</span>
  </footer>`;
}

/* ─────────── 1 · Editorial ─────────── */

function editorialTop(d, company) {
  const q = d.quote;
  return `
  <header class="hd">
    <div class="hd-brand">
      ${logoImg(company)}
      <div>
        <div class="hd-name">${company?.company_name || "Mi Empresa"}</div>
        <div class="hd-line">${company?.address || ""}</div>
        <div class="hd-line">${[company?.phone, company?.email].filter(Boolean).join(" · ")}</div>
        ${company?.rut ? `<div class="hd-line">RUT ${company.rut}</div>` : ""}
      </div>
    </div>
    <div class="hd-doc">
      <div class="hd-type">${d.docType}</div>
      <div class="hd-num">${q.quote_number || ""}</div>
      ${q.title ? `<div class="hd-subj">${q.title}</div>` : ""}
      <div class="hd-meta">
        <span>Fecha</span><b>${d.dateLabel}</b>
        <span>Válida hasta</span><b>${d.validLabel}</b>
        <span>Estado</span><b>${statusDot(d)}${q.status || "Borrador"}</b>
      </div>
    </div>
  </header>`;
}

function editorialBody(d, company) {
  const cells = clientCells(d.quote);
  return `
  ${editorialTop(d, company)}
  <section class="block">
    <div class="eyebrow">Cliente</div>
    <div class="client-grid">
      ${cells.map((c) => `<div><div class="lbl">${c.label}</div><div class="val">${c.value}</div></div>`).join("")}
    </div>
    ${d.isMensual ? `<div class="msub">Servicio mensual recurrente · cobro el día ${d.quote.billing_day || "—"} de cada mes · ${d.price(d.quote.total, d.quote.total_uf)} mensuales</div>` : ""}
  </section>
  ${itemsBlock(d)}
  ${abonosBlock(d)}
  ${paymentBlock(d)}
  ${notesBlock(d)}
  ${footerBlock(company)}`;
}

const EDITORIAL_CSS = `
  .lg { max-height:54px; max-width:128px; }
  .hd { display:flex; justify-content:space-between; gap:40px; padding:34px 44px 24px; border-bottom:1px solid #e8ebef; page-break-inside:avoid; }
  .hd-brand { display:flex; gap:14px; max-width:56%; }
  .hd-name { font-size:14px; font-weight:700; letter-spacing:-.01em; color:#0f172a; }
  .hd-line { font-size:9.5px; color:#7b8798; line-height:1.7; }
  .hd-doc { text-align:right; }
  .hd-type { font-size:8px; letter-spacing:.18em; color:#94a3b8; font-weight:700; }
  .hd-num { font-size:18px; font-weight:600; color:#0f172a; margin-top:4px; letter-spacing:.01em; }
  .hd-subj { font-size:10.5px; color:#5c6b7f; margin-top:3px; }
  .hd-meta { margin-top:12px; display:inline-grid; grid-template-columns:auto auto; gap:4px 18px; text-align:left; font-size:9.5px; }
  .hd-meta span { color:#94a3b8; }
  .hd-meta b { font-weight:600; color:#334155; }
  .block + .block { border-top:1px solid #eef1f5; }
  .client-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:13px 26px; }
  .msub { margin-top:14px; padding-top:11px; border-top:1px dashed #e8ebef; font-size:9.5px; color:#64748b; }
  .tbl th { padding:0 0 7px; border-bottom:1px solid #111827; color:#6b7280; }
  .tbl td { padding:11px 0; border-bottom:1px solid #f1f5f9; }
  .tfinal { border-top:1px solid #111827; margin-top:6px; padding-top:8px; }
`;

/* ─────────── 2 · Corporativa ─────────── */

function corporateTop(d, company) {
  const q = d.quote;
  return `
  <div class="topbar"></div>
  <header class="hd2">
    <div class="hd2-brand">
      ${logoImg(company)}
      <div class="hd2-name">${company?.company_name || "Mi Empresa"}</div>
      <div class="hd2-line">${[company?.rut ? `RUT ${company.rut}` : null, company?.address, company?.phone, company?.email].filter(Boolean).join(" · ")}</div>
    </div>
    <div class="mcard">
      <div class="mhead">
        <span>${d.docType}</span>
        <b>${q.quote_number || ""}</b>
      </div>
      <div class="mgrid">
        <div><div class="lbl">Fecha</div><div class="val">${d.dateLabel}</div></div>
        <div><div class="lbl">Válida hasta</div><div class="val">${d.validLabel}</div></div>
        <div><div class="lbl">Moneda</div><div class="val">${d.isUF ? "UF" : "CLP"}</div></div>
        <div><div class="lbl">Estado</div><div class="val">${statusDot(d)}${q.status || "Borrador"}</div></div>
      </div>
    </div>
  </header>
  ${q.title ? `<div class="subj">${q.title}</div>` : ""}`;
}

function corporateBody(d, company) {
  const cells = clientCells(d.quote).slice(0, 4);
  return `
  ${corporateTop(d, company)}
  <section class="block">
    <div class="eyebrow">Datos del cliente</div>
    <div class="client-strip">
      ${cells.map((c) => `<div><div class="lbl">${c.label}</div><div class="val">${c.value}</div></div>`).join("")}
    </div>
  </section>
  ${d.isMensual ? `
  <div class="mensual">
    <div><div class="lbl">Tipo de servicio</div><div class="mval">Mensual recurrente</div></div>
    <div><div class="lbl">Día de cobro</div><div class="mval">Día ${d.quote.billing_day || "—"} de cada mes</div></div>
    <div><div class="lbl">Monto mensual</div><div class="mval">${d.price(d.quote.total, d.quote.total_uf)}</div></div>
  </div>` : ""}
  ${itemsBlock(d)}
  ${abonosBlock(d)}
  ${paymentBlock(d)}
  ${notesBlock(d)}
  ${footerBlock(company)}`;
}

const CORPORATE_CSS = `
  .lg { max-height:42px; max-width:110px; }
  .topbar { height:6px; background:#0f172a; }
  .hd2 { display:flex; justify-content:space-between; align-items:flex-end; gap:34px; padding:24px 44px 20px; border-bottom:1px solid #eef1f5; page-break-inside:avoid; }
  .hd2-brand { display:flex; flex-direction:column; gap:6px; max-width:52%; }
  .hd2-name { font-size:13.5px; font-weight:700; color:#0f172a; }
  .hd2-line { font-size:9.5px; color:#7b8798; line-height:1.7; }
  .mcard { background:#f8fafc; border:1px solid #eef1f5; border-radius:10px; padding:12px 16px; min-width:300px; }
  .mhead { display:flex; justify-content:space-between; align-items:baseline; gap:16px; border-bottom:1px solid #e6ebf1; padding-bottom:8px; margin-bottom:10px; }
  .mhead span { font-size:8px; letter-spacing:.16em; color:#94a3b8; font-weight:700; }
  .mhead b { font-size:13.5px; color:#0f172a; }
  .mgrid { display:grid; grid-template-columns:1fr 1fr; gap:9px 18px; }
  .subj { padding:12px 44px; font-size:11px; color:#475569; border-bottom:1px solid #eef1f5; background:#fcfcfd; }
  .block { padding:20px 44px; }
  .client-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:14px 24px; }
  .mensual { display:flex; gap:34px; padding:12px 44px; background:#f8fafc; border-top:1px solid #eef1f5; border-bottom:1px solid #eef1f5; page-break-inside:avoid; }
  .mval { font-size:10.5px; font-weight:600; color:#0f172a; margin-top:2px; }
  .tbl th { background:#f7f8fa; border-top:1px solid #e6ebf1; border-bottom:1px solid #e6ebf1; padding:8px 10px; color:#5c6b7f; }
  .tbl td { padding:10px; border-bottom:1px solid #f1f5f9; }
  .tbox { background:#f8fafc; border:1px solid #eef1f5; border-radius:10px; padding:14px 16px; }
  .tfinal { border-top:1px solid #d9e0e8; margin-top:6px; padding-top:8px; }
`;

/* ─────────── 3 · Compacta ─────────── */

function compactTop(d, company) {
  const q = d.quote;
  return `
  <header class="hd3">
    <div>
      ${logoImg(company)}
      <div class="hd3-name">${company?.company_name || "Mi Empresa"}</div>
      <div class="hd3-line">${[company?.rut ? `RUT ${company.rut}` : null, company?.address].filter(Boolean).join(" · ")}</div>
      <div class="hd3-line">${[company?.phone, company?.email].filter(Boolean).join(" · ")}</div>
    </div>
    <div class="dcard">
      <div class="drow head"><span>${d.docType}</span><b>${q.quote_number || ""}</b></div>
      <div class="drow"><span>Fecha</span><b>${d.dateLabel}</b></div>
      <div class="drow"><span>Válida hasta</span><b>${d.validLabel}</b></div>
      <div class="drow"><span>Estado</span><b>${statusDot(d)}${q.status || "Borrador"}</b></div>
    </div>
  </header>`;
}

function compactBody(d, company) {
  const q = d.quote;
  return `
  ${compactTop(d, company)}
  <div class="band">
    <div>
      <div class="eyebrow">Cliente</div>
      <div class="band-name">${q.client_name || ""}</div>
      ${clientLine(q) ? `<div class="band-line">${clientLine(q)}</div>` : ""}
    </div>
    <div>
      <div class="eyebrow">Condiciones</div>
      <div class="cond">
        <div class="cond-row"><span>Tipo de cobro</span><b>${d.isMensual ? "Mensual" : "Único"}</b></div>
        <div class="cond-row"><span>Moneda</span><b>${d.isUF ? "UF" : "CLP"}</b></div>
        ${d.isMensual ? `<div class="cond-row"><span>Día de cobro</span><b>Día ${q.billing_day || "—"}</b></div>` : ""}
        <div class="cond-row"><span>Validez</span><b>${d.validLabel}</b></div>
      </div>
    </div>
  </div>
  ${q.title ? `<div class="subj3"><span class="lbl" style="margin:0;">Referencia</span><span>${q.title}</span></div>` : ""}
  ${itemsBlock(d)}
  ${abonosBlock(d)}
  ${paymentBlock(d)}
  ${notesBlock(d)}
  ${footerBlock(company)}`;
}

const COMPACT_CSS = `
  .lg { max-height:38px; max-width:100px; margin-bottom:8px; }
  .hd3 { display:flex; justify-content:space-between; gap:36px; padding:28px 44px 22px; align-items:flex-start; page-break-inside:avoid; }
  .hd3-name { font-size:15px; font-weight:700; color:#0f172a; letter-spacing:-.01em; }
  .hd3-line { font-size:9.5px; color:#7b8798; line-height:1.7; margin-top:1px; }
  .dcard { border:1px solid #dfe5ec; border-radius:10px; min-width:264px; overflow:hidden; }
  .drow { display:flex; justify-content:space-between; gap:18px; font-size:9.5px; padding:7px 13px; border-bottom:1px solid #eef1f5; }
  .drow:last-child { border-bottom:0; }
  .drow span { color:#94a3b8; }
  .drow b { font-weight:600; color:#0f172a; }
  .drow.head { background:#f8fafc; }
  .drow.head b { font-size:12.5px; }
  .band { display:grid; grid-template-columns:1.45fr 1fr; border-top:1px solid #e8ebef; border-bottom:1px solid #e8ebef; page-break-inside:avoid; }
  .band > div { padding:16px 44px; }
  .band > div + div { border-left:1px solid #e8ebef; padding-left:28px; }
  .band-name { font-size:12.5px; font-weight:700; color:#0f172a; }
  .band-line { font-size:10px; color:#64748b; margin-top:3px; line-height:1.6; }
  .cond-row { display:flex; justify-content:space-between; gap:14px; font-size:9.5px; padding:2.5px 0; }
  .cond-row span { color:#94a3b8; }
  .cond-row b { font-weight:600; color:#0f172a; }
  .subj3 { display:flex; align-items:center; gap:10px; padding:12px 44px; font-size:11px; color:#334155; border-bottom:1px solid #eef1f5; }
  .block { padding:20px 44px; }
  .tbl th { padding:0 0 6px; border-bottom:2px solid #0f172a; color:#6b7280; }
  .tbl td { padding:10px 0; border-bottom:1px dashed #e8ebef; }
  .tbox { border:1px solid #dfe5ec; border-radius:10px; padding:12px 16px; }
  .tfinal { border-top:1px solid #dfe5ec; margin-top:6px; padding-top:8px; }
`;

/* ─────────── base + ensamblado ─────────── */

const BASE_CSS = `
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pdf-doc { width: 794px; margin: 0 auto; background: #ffffff; color: #0f172a; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
  .lg { object-fit: contain; display: block; }
  .block { padding: 22px 44px; page-break-inside: avoid; break-inside: avoid; }
  .eyebrow { font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-bottom: 12px; }
  .dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
  .tbl { width: 100%; border-collapse: collapse; }
  .tbl th { font-size: 8.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; text-align: left; }
  .tbl td { font-size: 11.5px; vertical-align: top; color: #334155; }
  .tbl .r { text-align: right; }
  .tbl .c { text-align: center; }
  .tbl .b { font-weight: 600; color: #0f172a; }
  .tbl tbody tr { page-break-inside: avoid; break-inside: avoid; }
  .iname { font-size: 11.8px; font-weight: 600; color: #0f172a; }
  .isub { font-size: 10px; color: #7b8798; margin-top: 3px; line-height: 1.45; }
  .op { margin-top: 16px; }
  .totals { display: flex; justify-content: flex-end; margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
  .tbox { width: 292px; }
  .trow { display: flex; justify-content: space-between; gap: 14px; font-size: 11px; padding: 5px 0; color: #475569; }
  .trow b { font-weight: 600; color: #0f172a; }
  .tfinal span, .tfinal b { font-size: 13.5px; font-weight: 700; color: #0f172a; }
  .tnote { font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: right; }
  .abres { display: flex; justify-content: space-between; gap: 24px; margin-top: 12px; }
  .abval { font-size: 12.5px; font-weight: 700; margin-top: 2px; }
  .pay-opt { page-break-inside: avoid; break-inside: avoid; }
  .pay-label { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 26px; }
  .lbl { font-size: 8.5px; letter-spacing: .09em; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
  .val { font-size: 11.5px; color: #1e293b; font-weight: 500; word-break: break-word; overflow-wrap: break-word; }
  .notes-text { font-size: 11px; color: #475569; line-height: 1.65; white-space: pre-line; }
  .foot { display: flex; justify-content: space-between; gap: 20px; font-size: 8.5px; color: #94a3b8; padding: 16px 44px 24px; border-top: 1px solid #eef1f5; margin-top: 8px; }
  .green { color: #059669; }
  .red { color: #dc2626; }
  @media (max-width: 600px) {
    .block, .hd, .hd2, .hd3, .band > div, .foot, .mensual, .subj, .subj3 { padding-left: 18px; padding-right: 18px; }
    .client-grid, .client-strip, .pay-grid, .mgrid, .band { grid-template-columns: 1fr 1fr; }
    .tbox { width: 100%; }
  }
`;

function doc(title, css, body) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>${BASE_CSS}${css}</style>
</head><body>
<div class="pdf-doc">
${body}
</div>
</body></html>`;
}

export const QUOTE_PROPOSALS = [
  {
    key: "editorial",
    name: "Editorial",
    tagline: "Encabezado blanco, ordenado por columnas",
    points: [
      "Logo y datos de la empresa a la izquierda, documento y meta a la derecha",
      "Sin bandas de color: solo líneas finas de separación",
      "Tabla sin relleno y totales alineados con una regla superior",
    ],
    build: (quote, company) => {
      const d = data(quote);
      return doc(`${d.docType} ${quote.quote_number || ""}`, EDITORIAL_CSS, editorialBody(d, company));
    },
  },
  {
    key: "corporativa",
    name: "Corporativa",
    tagline: "Franja superior y tarjeta de datos",
    points: [
      "Barra delgada de marca arriba y encabezado con tarjeta de meta datos",
      "Cliente en una fila de cuatro columnas alineadas",
      "Tabla con encabezado gris suave y totales en tarjeta",
    ],
    build: (quote, company) => {
      const d = data(quote);
      return doc(`${d.docType} ${quote.quote_number || ""}`, CORPORATE_CSS, corporateBody(d, company));
    },
  },
  {
    key: "compacta",
    name: "Compacta",
    tagline: "Tarjeta de documento y bloques en dos columnas",
    points: [
      "Número, fecha y estado dentro de una tarjeta con filas separadas",
      "Cliente y condiciones de cobro lado a lado, sin ocupar más alto",
      "Ideal para cotizaciones con muchos ítems",
    ],
    build: (quote, company) => {
      const d = data(quote);
      return doc(`${d.docType} ${quote.quote_number || ""}`, COMPACT_CSS, compactBody(d, company));
    },
  },
];