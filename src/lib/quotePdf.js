import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { buildQuoteHtml } from "./quoteTemplate";

export { buildQuoteHtml };

const PAGE_W = 794;
const PAGE_H = Math.round(PAGE_W * (297 / 210)); // A4 en px
const NEXT_PAGE_TOP = 36; // margen superior en páginas 2+

// Espera a que carguen imágenes (logo) y fuentes, para medir el layout final
async function waitForAssets(doc) {
  const imgs = [...doc.images].map((img) =>
    img.complete ? null : new Promise((res) => { img.onload = res; img.onerror = res; })
  );
  await Promise.race([
    Promise.all([...imgs, doc.fonts?.ready].filter(Boolean)),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
}

// Calcula dónde cortar cada página sin partir ningún bloque (.pdf-block)
function computePageCuts(pdfDoc) {
  const docTop = pdfDoc.getBoundingClientRect().top;
  const blocks = [...pdfDoc.querySelectorAll(".pdf-block")].map((el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.floor(r.top - docTop), bottom: Math.ceil(r.bottom - docTop) };
  });
  const docHeight = Math.ceil(pdfDoc.scrollHeight);

  const pages = [];
  let start = 0;
  while (start < docHeight - 1) {
    const room = PAGE_H - (pages.length ? NEXT_PAGE_TOP : 0);
    const limit = start + room;
    let end = docHeight;
    if (limit < docHeight) {
      // Bloques que quedarían partidos: cortar justo antes del más bajo que empiece en esta página
      const crossing = blocks.filter((b) => b.top > start + 40 && b.top < limit && b.bottom > limit);
      end = crossing.length ? Math.max(...crossing.map((b) => b.top)) : limit;
    }
    pages.push({ start, end });
    start = end;
  }
  return { pages, docHeight };
}

export async function downloadQuotePdf(quote, company) {
  const html = buildQuoteHtml(quote, company);
  const slug = (quote.title || quote.client_name || quote.quote_number || 'Cotizacion').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '_');
  const fileName = `${slug}.pdf`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${PAGE_W}px;height:${PAGE_H}px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    const iframeDoc = iframe.contentDocument;
    await waitForAssets(iframeDoc);
    await new Promise((r) => setTimeout(r, 100));

    const pdfDoc = iframeDoc.querySelector(".pdf-doc");
    const { pages, docHeight } = computePageCuts(pdfDoc);

    const canvas = await html2canvas(pdfDoc, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: PAGE_W,
      height: docHeight,
      windowWidth: PAGE_W,
    });

    const scale = canvas.width / PAGE_W;
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const mmPerPx = pdfWidth / PAGE_W;

    pages.forEach(({ start, end }, i) => {
      const srcY = Math.round(start * scale);
      const srcH = Math.min(Math.round((end - start) * scale), canvas.height - srcY);
      if (srcH <= 0) return;

      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = srcH;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      if (i > 0) pdf.addPage();
      const top = i > 0 ? NEXT_PAGE_TOP * mmPerPx : 0;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, top, pdfWidth, (srcH / scale) * mmPerPx);
    });

    pdf.save(fileName);
  } finally {
    iframe.remove();
  }
}

export function printQuotePdf(quote, company) {
  const html = buildQuoteHtml(quote, company);
  const fileName = `Cotizacion_${(company?.company_name || 'Empresa').replace(/\s+/g, '_')}_${quote.quote_number}`;

  const existing = document.getElementById("print-frame-quote");
  if (existing) existing.remove();

  const frame = document.createElement("iframe");
  frame.id = "print-frame-quote";
  frame.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${PAGE_W}px;height:${PAGE_H}px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);

  frame.onload = async () => {
    await waitForAssets(frame.contentWindow.document);
    frame.contentWindow.document.title = fileName;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
  frame.srcdoc = html;
}
