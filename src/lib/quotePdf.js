import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { buildQuoteHtml, DEFAULT_QUOTE_DESIGN } from "./quoteDesigns";

export { buildQuoteHtml };

const designOf = (company) => company?.quote_design || DEFAULT_QUOTE_DESIGN;

export async function downloadQuotePdf(quote, company) {
  const html = buildQuoteHtml(quote, company, designOf(company));
  const slug = (quote.title || quote.client_name || quote.quote_number || 'Cotizacion').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '_');
  const fileName = `${slug}.pdf`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  iframe.srcdoc = html;

  await new Promise((resolve) => {
    iframe.onload = resolve;
  });

  await new Promise(r => setTimeout(r, 200));

  const iframeDoc = iframe.contentDocument;
  const pdfDoc = iframeDoc.querySelector(".pdf-doc");

  // Recolectar cortes seguros (bordes de bloques, filas y totales) para no partir contenido
  const docRect = pdfDoc.getBoundingClientRect();
  const breaks = [];
  const addBreak = (el) => {
    const r = el.getBoundingClientRect();
    const bottom = Math.round(r.bottom - docRect.top);
    if (bottom > 4) breaks.push(bottom);
  };
  pdfDoc.querySelectorAll(":scope > *").forEach(addBreak);
  pdfDoc.querySelectorAll("tr, .totals-wrap, .op-block, .grid2").forEach(addBreak);
  breaks.sort((a, b) => a - b);

  const docHeight = Math.max(Math.round(pdfDoc.scrollHeight), Math.round(docRect.height));

  const canvas = await html2canvas(pdfDoc, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 794,
    windowWidth: 794,
  });

  iframe.remove();

  const scale = canvas.width / 794;
  const pageHeightPx = Math.round(794 * (297 / 210)); // proporción A4

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  let start = 0;
  let firstPage = true;

  while (start < docHeight - 1) {
    const limit = start + pageHeightPx;
    let end;
    if (limit >= docHeight) {
      end = docHeight;
    } else {
      const fits = breaks.filter((b) => b > start + 40 && b <= limit);
      end = fits.length ? fits[fits.length - 1] : limit;
    }

    const sliceH = Math.min(end - start, docHeight - start);
    const srcH = Math.min(Math.round(sliceH * scale), canvas.height - Math.round(start * scale));

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = srcH;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.round(start * scale), canvas.width, srcH, 0, 0, canvas.width, srcH);

    if (!firstPage) pdf.addPage();
    const renderH = (sliceH / pageHeightPx) * pdfHeight;
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfWidth, Math.min(renderH, pdfHeight));
    firstPage = false;
    start = end;
  }

  pdf.save(fileName);
}

export function printQuotePdf(quote, company) {
  const html = buildQuoteHtml(quote, company, designOf(company));
  const fileName = `Cotizacion_${(company?.company_name || 'Empresa').replace(/\s+/g, '_')}_${quote.quote_number}`;

  const existing = document.getElementById("print-frame-quote");
  if (existing) existing.remove();

  const frame = document.createElement("iframe");
  frame.id = "print-frame-quote";
  frame.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow.document.title = fileName;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
}