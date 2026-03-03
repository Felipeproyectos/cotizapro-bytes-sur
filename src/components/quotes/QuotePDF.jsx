import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Download } from "lucide-react";

const STATUS_LABELS = {
  Borrador: "BORRADOR",
  Enviada: "ENVIADA",
  Aceptada: "ACEPTADA",
  Rechazada: "RECHAZADA",
  Ejecutada: "EJECUTADA",
};

const STATUS_COLORS = {
  Borrador: "#94a3b8",
  Enviada: "#3b82f6",
  Aceptada: "#10b981",
  Rechazada: "#ef4444",
  Ejecutada: "#8b5cf6",
};

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const handlePrint = () => {
    window.print();
  };

  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pdf-content, #pdf-content * { visibility: visible !important; }
          #pdf-content { position: fixed; left: 0; top: 0; width: 100%; }
          #no-print { display: none !important; }
        }
      `}</style>

      <div className="w-full max-w-3xl mx-4">
        {/* Controls */}
        <div id="no-print" className="flex items-center justify-between mb-4">
          <p className="text-white text-sm font-medium">Vista previa del PDF</p>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
            >
              <Download className="w-4 h-4" /> Descargar / Imprimir PDF
            </button>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div id="pdf-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div style={{ background: "#0f172a" }} className="px-10 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{company?.company_name || "Mi Empresa"}</h1>
                {company?.rut && <p className="text-slate-400 text-sm mt-1">RUT: {company.rut}</p>}
                {company?.address && <p className="text-slate-400 text-sm">{company.address}</p>}
                {company?.phone && <p className="text-slate-400 text-sm">{company.phone}</p>}
                {company?.email && <p className="text-slate-400 text-sm">{company.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Cotización</p>
                <p className="text-2xl font-bold">{quote.quote_number}</p>
                <p className="text-slate-400 text-sm mt-2">
                  {format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
                {quote.valid_until && (
                  <p className="text-slate-400 text-sm">Válida hasta: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</p>
                )}
                <span
                  className="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: statusColor + "30", color: statusColor }}
                >
                  {STATUS_LABELS[quote.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="px-10 py-7 border-b border-gray-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos del Cliente</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <div>
                <p className="text-xs text-slate-400">Nombre</p>
                <p className="text-sm font-semibold text-slate-900">{quote.client_name}</p>
              </div>
              {quote.client_company && (
                <div>
                  <p className="text-xs text-slate-400">Empresa</p>
                  <p className="text-sm font-semibold text-slate-900">{quote.client_company}</p>
                </div>
              )}
              {quote.client_rut && (
                <div>
                  <p className="text-xs text-slate-400">RUT</p>
                  <p className="text-sm text-slate-700">{quote.client_rut}</p>
                </div>
              )}
              {quote.client_email && (
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm text-slate-700">{quote.client_email}</p>
                </div>
              )}
              {quote.client_phone && (
                <div>
                  <p className="text-xs text-slate-400">Teléfono</p>
                  <p className="text-sm text-slate-700">{quote.client_phone}</p>
                </div>
              )}
              {quote.client_address && (
                <div>
                  <p className="text-xs text-slate-400">Dirección</p>
                  <p className="text-sm text-slate-700">{quote.client_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-10 py-7">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Detalle de Servicios</p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 rounded-l-lg">Descripción</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500">Cant.</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500">Precio Unit.</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{item.service_name || item.description}</p>
                      {item.service_name && item.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-slate-600">{formatCLP(item.unit_price)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">{formatCLP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCLP(quote.subtotal)}</span>
                </div>
                {quote.include_iva && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IVA (19%)</span>
                    <span className="font-medium text-slate-900">{formatCLP(quote.iva_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900 text-base">{formatCLP(quote.total)}</span>
                </div>
                {!quote.include_iva && (
                  <p className="text-xs text-slate-400">* Precio no incluye IVA</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-10 py-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notas y Condiciones</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ background: "#f8fafc" }} className="px-10 py-5 text-center">
            <p className="text-xs text-slate-400">
              {company?.company_name || "Mi Empresa"} · {company?.email || ""} · {company?.phone || ""} · {company?.website || ""}
            </p>
            <p className="text-xs text-slate-300 mt-1">Documento generado digitalmente</p>
          </div>
        </div>
      </div>
    </div>
  );
}