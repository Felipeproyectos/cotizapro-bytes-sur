import { quoteData, companyLines, clientSection, itemsSection, abonosSection, paymentSection, notesSection, mensualBanner, docShell } from "./shared";

export function renderMinimal(quote, company) {
  const d = quoteData(quote);

  const css = `
  body, .pdf-doc { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.6; }
  .pdf-doc { counter-reset: sec; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; padding: 40px 40px 26px; page-break-inside: avoid; break-inside: avoid; }
  .h-left { max-width: 50%; min-width: 0; }
  .h-left img { max-height: 54px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 12px; }
  .company-name { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: #111827; word-break: break-word; }
  .company-lines { font-size: 9.5px; color: #9ca3af; margin-top: 8px; line-height: 1.8; word-break: break-word; }
  .h-right { text-align: right; min-width: 180px; }
  .doc-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.26em; color: #9ca3af; }
  .doc-number { font-size: 26px; font-weight: 300; letter-spacing: -0.02em; color: #111827; margin-top: 8px; word-break: break-word; }
  .doc-title { font-size: 11px; color: #4b5563; margin-top: 6px; word-break: break-word; }
  .doc-date { font-size: 9.5px; color: #9ca3af; margin-top: 8px; line-height: 1.8; }
  .hr { height: 1px; background: #111827; margin: 0 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section { padding: 26px 40px; }
  .section-title { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.22em; color: #9ca3af; margin-bottom: 15px; }
  .section-title::before { counter-increment: sec; content: counter(sec, decimal-leading-zero); margin-right: 12px; color: #111827; font-weight: 700; letter-spacing: 0.04em; }
  .field-label { color: #b0b5bd; font-size: 8.5px; }
  .field-value { color: #111827; font-weight: 400; }
  .items-table thead th { border-bottom: 1px solid #111827; color: #111827; padding-left: 0; padding-right: 0; padding-bottom: 7px; }
  .items-table thead th.right, .items-table thead th.center { text-align: right; }
  .items-table thead th.center { text-align: center; }
  .items-table tbody td { border-bottom: 1px dashed #e5e7eb; padding-left: 0; padding-right: 0; }
  .items-table .item-name { color: #111827; font-weight: 500; }
  .items-table .sub { color: #9ca3af; }
  .items-table .bold { font-weight: 600; }
  .op-title { background: transparent; color: #111827; border-radius: 0; padding: 0 0 6px; border-bottom: 1px solid #d1d5db; letter-spacing: 0.18em; font-size: 9px; }
  .totals-box { padding: 0; }
  .total-row { color: #6b7280; padding: 5px 0; }
  .total-row span:last-child { color: #111827; font-weight: 400; }
  .total-row.final { border-top: 2px solid #111827; padding-top: 11px; margin-top: 8px; }
  .total-row.final span { color: #111827; font-size: 16px; }
  .total-note { color: #b0b5bd; font-size: 9px; }
  .mensual-banner { border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
  .mb-label { color: #9ca3af; font-size: 8.5px; }
  .mb-value { color: #111827; font-weight: 600; }
  .section.payment-section { border-top: 1px solid #e5e7eb; }
  .pay-title { color: #111827; }
  .notes-text { font-size: 11.5px; color: #4b5563; line-height: 1.75; white-space: pre-line; }
  .footer { margin: 0 40px; border-top: 1px solid #e5e7eb; padding: 14px 0 30px; display: flex; justify-content: space-between; gap: 12px; font-size: 9px; color: #9ca3af; letter-spacing: 0.02em; }
  @media (max-width: 600px) { .header { padding: 24px 18px; flex-direction: column; } .hr { margin: 0 18px; } .footer { margin: 0 18px; flex-direction: column; gap: 4px; } }`;

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
      <div class="doc-date">
        ${d.createdLabel}
        ${d.validLabel ? `<br/>Válida hasta ${d.validLabel}` : ""}
        <br/>${quote.status || "Borrador"}
      </div>
    </div>
  </div>
  <div class="hr"></div>
  ${mensualBanner(d)}
  ${clientSection(d)}
  ${itemsSection(d)}
  ${abonosSection(d)}
  ${paymentSection(d)}
  ${notesSection(d)}
  <div class="footer">
    <span>${company?.company_name || "Mi Empresa"}${[company?.email, company?.phone].filter(Boolean).length ? ` · ${[company.email, company.phone].filter(Boolean).join(" · ")}` : ""}</span>
    <span>Documento generado digitalmente</span>
  </div>`;

  return docShell(`${d.docType} ${company?.company_name || "Empresa"} - ${quote.quote_number || ""}`, css, body);
}