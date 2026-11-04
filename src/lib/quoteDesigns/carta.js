import { quoteData, companyLines, clientSection, itemsSection, abonosSection, paymentSection, notesSection, mensualBanner, docShell } from "./shared";

export function renderCarta(quote, company) {
  const d = quoteData(quote);

  const css = `
  body, .pdf-doc { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1e293b; font-size: 12.5px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; padding: 34px 40px 22px; page-break-inside: avoid; break-inside: avoid; }
  .h-left { max-width: 52%; min-width: 0; }
  .h-left img { max-height: 72px; max-width: 180px; object-fit: contain; display: block; margin-bottom: 10px; }
  .company-name { font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; word-break: break-word; }
  .company-lines { font-size: 10.5px; color: #64748b; margin-top: 5px; line-height: 1.65; word-break: break-word; }
  .h-right { text-align: right; min-width: 200px; max-width: 44%; }
  .doc-type { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #2563eb; }
  .doc-number { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-top: 5px; word-break: break-word; }
  .doc-title { font-size: 11.5px; color: #475569; margin-top: 5px; font-weight: 500; word-break: break-word; }
  .meta-table { margin: 12px 0 0 auto; border-collapse: collapse; }
  .meta-table td { font-size: 11px; padding: 2px 0 2px 16px; text-align: right; white-space: nowrap; }
  .meta-table td.k { color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-size: 9px; font-weight: 600; }
  .meta-table td.v { color: #334155; font-weight: 600; }
  .rule { height: 3px; background: #2563eb; margin: 0 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section { border-bottom: 1px solid #eef2f7; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #2563eb; margin-bottom: 13px; }
  .field-label { color: #94a3b8; }
  .field-value { color: #1e293b; }
  .items-table thead th { background: #eff6ff; color: #1e40af; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .items-table tbody td { border-bottom: 1px solid #eef2f7; }
  .items-table .item-name { color: #0f172a; }
  .items-table .sub { color: #64748b; }
  .op-title { background: #eef2ff; color: #1e3a8a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .totals-box { background: #f8fafc; border-radius: 8px; padding: 14px 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-row span:first-child { color: #64748b; }
  .total-row span:last-child { color: #0f172a; font-weight: 500; }
  .total-row.final { border-top: 2px solid #2563eb; padding-top: 10px; }
  .total-row.final span { color: #0f172a; }
  .total-note { color: #94a3b8; }
  .mensual-banner { background: #f5f3ff; border-bottom: 1px solid #ede9fe; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .mb-label { color: #8b5cf6; }
  .mb-value { color: #6d28d9; }
  .payment-section { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pay-title { color: #1e293b; }
  .notes-text { font-size: 12px; color: #475569; line-height: 1.65; white-space: pre-line; }
  .footer { display: flex; justify-content: space-between; gap: 12px; padding: 15px 40px; background: #0f172a; color: #94a3b8; font-size: 9.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .footer .f-brand { color: #ffffff; font-weight: 600; }
  @media (max-width: 600px) { .header { padding: 22px 18px; flex-direction: column; } .rule { margin: 0 18px; } .footer { padding: 15px 18px; flex-direction: column; gap: 3px; } }`;

  const body = `
  <div class="header">
    <div class="h-left">
      ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" />` : ""}
      <div class="company-name">${company?.company_name || "Mi Empresa"}</div>
      <div class="company-lines">${companyLines(company).map((l) => `<div>${l}</div>`).join("")}</div>
    </div>
    <div class="h-right">
      <div class="doc-type">${d.docType}</div>
      <div class="doc-number">${quote.quote_number || "—"}</div>
      ${quote.title ? `<div class="doc-title">${quote.title}</div>` : ""}
      <table class="meta-table">
        <tr><td class="k">Fecha</td><td class="v">${d.createdLabel}</td></tr>
        ${d.validLabel ? `<tr><td class="k">Válida hasta</td><td class="v">${d.validLabel}</td></tr>` : ""}
        <tr><td class="k">Estado</td><td class="v">${quote.status || "Borrador"}</td></tr>
        <tr><td class="k">Moneda</td><td class="v">${quote.currency || "CLP"}</td></tr>
      </table>
    </div>
  </div>
  <div class="rule"></div>
  ${mensualBanner(d)}
  ${clientSection(d)}
  ${itemsSection(d)}
  ${abonosSection(d)}
  ${paymentSection(d)}
  ${notesSection(d)}
  <div class="footer">
    <span class="f-brand">${company?.company_name || "Mi Empresa"}</span>
    <span>${[company?.email, company?.phone, company?.website].filter(Boolean).join(" · ")}</span>
    <span>Documento generado digitalmente</span>
  </div>`;

  return docShell(`${d.docType} ${company?.company_name || "Empresa"} - ${quote.quote_number || ""}`, css, body);
}