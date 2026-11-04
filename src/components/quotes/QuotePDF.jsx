import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Printer, Share, Download, Loader2 } from "lucide-react";
import { buildQuoteHtml, printQuotePdf, downloadQuotePdf } from "@/lib/quotePdf";
import { QUOTE_DESIGNS, DEFAULT_QUOTE_DESIGN } from "@/lib/quoteDesigns";
import QuotePreviewFrame from "./QuotePreviewFrame";

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);
  const [design, setDesign] = useState(DEFAULT_QUOTE_DESIGN);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then((data) => {
      if (data && data.length > 0) {
        setCompany(data[0]);
        if (data[0].quote_design) setDesign(data[0].quote_design);
      }
    });
  }, []);

  const html = useMemo(() => buildQuoteHtml(quote, company, design), [quote, company, design]);
  const companyWithDesign = { ...(company || {}), quote_design: design };

  const chooseDesign = async (key) => {
    setDesign(key);
    if (company?.id) {
      setCompany((c) => ({ ...c, quote_design: key }));
      await base44.entities.CompanySettings.update(company.id, { quote_design: key });
    }
  };

  const handlePrint = () => printQuotePdf(quote, companyWithDesign);

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadQuotePdf(quote, companyWithDesign); }
    catch (e) { console.error(e); }
    setDownloading(false);
  };

  const handleShare = () => {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white text-sm font-medium truncate">
            Vista previa — {quote.quote_number}
            {quote.billing_type === "Mensual" && (
              <span className="ml-2 bg-violet-500/30 text-violet-200 text-xs px-2 py-0.5 rounded-full">Mensual · día {quote.billing_day}</span>
            )}
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleDownload} disabled={downloading}
              className="select-none hidden sm:flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Generando..." : "Descargar PDF"}
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="select-none sm:hidden p-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white disabled:opacity-60" title="Descargar PDF">
              {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button onClick={handlePrint}
              className="select-none hidden sm:flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handlePrint}
              className="select-none sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white" title="Imprimir">
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

        {/* Selector de diseño */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-1.5 flex gap-1.5 mb-3">
          {QUOTE_DESIGNS.map((dz) => (
            <button
              key={dz.key}
              onClick={() => chooseDesign(dz.key)}
              className={`select-none flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
                design === dz.key ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="block text-xs font-semibold">{dz.name}</span>
              <span className={`block text-[10px] ${design === dz.key ? "text-slate-500" : "text-white/50"}`}>{dz.tagline}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <QuotePreviewFrame html={html} />
        </div>
      </div>
    </div>
  );
}