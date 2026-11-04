import { quoteData, companyLines, clientSection, itemsSection, abonosSection, paymentSection, notesSection, mensualBanner, docShell } from "./shared";

export function renderEjecutiva(quote, company) {
  const d = quoteData(quote);

  const css = `
  body, .pdf-doc { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 12.5px; line-height: 1.5; }
  .header { background: #0f172a; color: #ffffff; padding: 30px 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; page-break-inside: avoid; break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .brand { max-width: 58%; min-width: 0; }
  .brand img { background: #ffffff; border-radius: 6px; padding: 6px 8px; max-height: 58px; max-width: 170px; object-fit: contain; display: block; margin-bottom: 12px; }
  .brand-name { font-size: 14px; font-weight: 700; letter-spacing: 0.01em; color: #ffffff; word-break: break-word; }
  .brand-line { font-size: 10.5px; color: #94a3b8; margin-top: 4px; line-height: 1.6; word-break: break-word; }
  .doc { text-align: right; min-width: 180px; }
  .doc-type { font-size: 9.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; }
  .doc-number { font-size: 21px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em; margin-top: 6px; word-break: break-word; }
  .doc-title { font-size: 11px; color: #cbd5e1; margin-top: 5px; word-break: break-word; }
  .meta-band { display: flex; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid; }
  .meta-cell { flex: 1; padding: 14px 18px; border-right: 1px solid #eef2f7; min-width: 0; }
  .meta-cell:last-child { border-right: 0; }
  .meta-cell .k { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; }
  .meta-cell .v { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 3px; word-break: break-word; }
  .meta-cell.total { background: #ecfdf5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .meta-cell.total .v { color: #047857; font-size: 15px; }
  .section { border-bottom: 1px solid #eef2f7; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #0f172a; margin-bottom: 13px; padding-bottom: 7px; border-bottom: 1px solid #e2e8f0; }
  .field-label { color: #94a3b8; }
  .field-value { color: #1e293b; }
  .items-table thead th { background: #0f172a; color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .items-table tbody td { border-bottom: 1px solid #eef2f7; }
  .items-table tbody tr:nth-child(even) { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .items-table .item-name { color: #0f172a; }
  .items-table .sub { color: #64748b; }
  .op-title { background: #1e40af; color: #ffffff; border-radius: 3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .totals-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px 0; overflow: hidden; }
  .total-row span:first-child { color: #64748b; }
  .total-row span:last-child { color: #0f172a; font-weight: 500; }
  .total-row.final { background: #ecfdf5; margin: 8px -16px 0; padding: 11px 16px; border-top: 1px solid #a7f3d0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-row.final span { color: #047857; }
  .total-note { color: #94a3b8; padding-bottom: 10px; }
  .mensual-banner { background: #f5f3ff; border-bottom: 1px solid #ede9fe; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .mb-label { color: #8b5cf6; }
  .mb-value { color: #6d28d9; }
  .payment-section { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pay-title { color: #0f172a; }
  .notes-text { font-size: 12px; color: #475569; line-height: 1.65; white-space: pre-line; }
  .footer { background: #0f172a; color: #94a3b8; padding: 13px 40px; display: flex; justify-content: space-between; gap: 12px; font-size: 9.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .footer .f-brand { color: #ffffff; font-weight: 600; }
  @media (max-width: 600px) { .header { padding: 22px 18px; flex-direction: column; } .meta-band { flex-wrap: wrap; } .meta-cell { flex: 1 1 45%; border-right: 0; } .footer { padding: 13px 18px; flex-direction: column; gap: 3px; } }`;

  const lines = companyLines(company);

  const body = `
  <div class="header">
    <div class="brand">
      ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" />` : ""}
      <div class="brand-name">${company?.company_name || "Mi Empresa"}</div>
      ${lines.map((l) => `<div class="brand-line">${l}</div>`).join("")}
    </div>
    <div class="doc">
      <div class="doc-type">${d.docType}</div>
      <div class="doc-number">${quote.quote_number || "—"}</div>
      ${quote.title ? `<div class="doc-title">${quote.title}</div>` : ""}
    </div>
  </div>
  <div class="meta-band">
    <div class="meta-cell"><div class="k">Fecha de emisión</div><div class="v">${d.createdLabel}</div></div>
    <div class="meta-cell"><div class="k">Válida hasta</div><div class="v">${d.validLabel || "—"}</div></div>
    <div class="meta-cell"><div class="k">Estado</div><div class="v">${quote.status || "Borrador"}</div></div>
    <div class="meta-cell total"><div class="k">${d.totalLabel}</div><div class="v">${d.price(quote.total, quote.total_uf)}</div></div>
  </div>
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