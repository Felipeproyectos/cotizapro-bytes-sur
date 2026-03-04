import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Printer } from "lucide-react";

const STATUS_LABELS = {
  Borrador: "BORRADOR", Enviada: "ENVIADA", Aceptada: "ACEPTADA",
  Rechazada: "RECHAZADA", Ejecutada: "EJECUTADA",
};
const STATUS_COLORS = {
  Borrador: "#94a3b8", Enviada: "#3b82f6", Aceptada: "#10b981",
  Rechazada: "#ef4444", Ejecutada: "#8b5cf6",
};

export default function QuotePDF({ quote, onClose }) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) setCompany(data[0]);
    });
  }, []);

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const statusColor = STATUS_COLORS[quote.status] || "#94a3b8";

  const totalAbonos = (quote.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = (quote.total || 0) - totalAbonos;

  const paymentType = quote.payment_type || (quote.include_iva ? "Con IVA (19%)" : "Sin IVA");
  const isHonorarios = paymentType === "Boleta de Honorarios";
  // Boleta honorarios: retención 10.75% sobre el bruto
  const retencion = isHonorarios ? Math.round((quote.subtotal || 0) * 0.1075) : 0;
  const liquidoHonorarios = isHonorarios ? (quote.subtotal || 0) - retencion : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pdf-modal { display: block !important; position: fixed; inset: 0; background: white; padding: 0; margin: 0; }
          #pdf-toolbar { display: none !important; }
          #pdf-content {
            width: 216mm;
            min-height: 279mm;
            margin: 0 auto;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 20mm 18mm !important;
          }
        }
        @page { size: Letter; margin: 20mm 18mm; }
      `}</style>

      <div id="pdf-modal" className="w-full max-w-3xl">
        {/* Toolbar */}
        <div id="pdf-toolbar" className="flex items-center justify-between mb-4">
          <p className="text-white text-sm font-medium">Vista previa — {paymentType}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
            >
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div id="pdf-content" className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ fontFamily: "'Arial', sans-serif" }}>

          {/* Header */}
          <div style={{ background: "#0f172a" }} className="px-10 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{company?.company_name || "Mi Empresa"}</h1>
                {company?.rut && <p className="text-slate-400 text-xs mt-1">RUT: {company.rut}</p>}
                {company?.address && <p className="text-slate-400 text-xs">{company.address}</p>}
                {company?.phone && <p className="text-slate-400 text-xs">{company.phone}</p>}
                {company?.email && <p className="text-slate-400 text-xs">{company.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
                  {isHonorarios ? "Boleta de Honorarios" : "Cotización"}
                </p>
                <p className="text-xl font-bold">{quote.quote_number}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {format(new Date(quote.created_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
                {quote.valid_until && (
                  <p className="text-slate-400 text-xs">Válida hasta: {format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}</p>
                )}
                <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: statusColor + "30", color: statusColor }}>
                  {STATUS_LABELS[quote.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="px-10 py-6 border-b border-gray-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos del Cliente</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <div><p className="text-xs text-slate-400">Nombre</p><p className="text-sm font-semibold text-slate-900">{quote.client_name}</p></div>
              {quote.client_company && <div><p className="text-xs text-slate-400">Empresa</p><p className="text-sm font-semibold text-slate-900">{quote.client_company}</p></div>}
              {quote.client_rut && <div><p className="text-xs text-slate-400">RUT</p><p className="text-sm text-slate-700">{quote.client_rut}</p></div>}
              {quote.client_email && <div><p className="text-xs text-slate-400">Email</p><p className="text-sm text-slate-700">{quote.client_email}</p></div>}
              {quote.client_phone && <div><p className="text-xs text-slate-400">Teléfono</p><p className="text-sm text-slate-700">{quote.client_phone}</p></div>}
              {quote.client_address && <div><p className="text-xs text-slate-400">Dirección</p><p className="text-sm text-slate-700">{quote.client_address}</p></div>}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-10 py-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Detalle de Servicios</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500">Descripción</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-500">Cant.</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">P. Unit.</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{item.service_name || item.description}</p>
                      {item.service_name && item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatCLP(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatCLP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCLP(quote.subtotal)}</span>
                </div>
                {paymentType === "Con IVA (19%)" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IVA (19%)</span>
                    <span className="font-medium text-slate-900">{formatCLP(quote.iva_amount)}</span>
                  </div>
                )}
                {isHonorarios && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Retención (10,75%)</span>
                      <span className="font-medium text-red-600">-{formatCLP(retencion)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Líquido a pagar</span>
                      <span className="font-medium text-slate-900">{formatCLP(liquidoHonorarios)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900">{formatCLP(quote.total)}</span>
                </div>
                {paymentType === "Sin IVA" && (
                  <p className="text-xs text-slate-400">* Precio no incluye IVA</p>
                )}
              </div>
            </div>
          </div>

          {/* Abonos */}
          {(quote.abonos || []).length > 0 && (
            <div className="px-10 py-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Abonos Recibidos</p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th className="text-left py-2 px-3 text-xs text-slate-500">Fecha</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500">Nota</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.abonos || []).map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td className="py-2 px-3 text-slate-600">{a.fecha ? format(new Date(a.fecha), "dd/MM/yyyy") : "—"}</td>
                      <td className="py-2 px-3 text-slate-500">{a.nota || "—"}</td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCLP(a.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-3 gap-10 text-sm">
                <div className="text-right">
                  <p className="text-slate-500">Total abonado</p>
                  <p className="font-semibold text-emerald-600">{formatCLP(totalAbonos)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Saldo pendiente</p>
                  <p className={`font-bold text-base ${saldoPendiente <= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatCLP(saldoPendiente)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="px-10 py-5 border-t border-gray-100" style={{ background: "#f8fafc" }}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Datos de Pago</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <div>
                <p className="text-xs text-slate-400">Forma de pago</p>
                <p className="font-medium text-slate-800">Efectivo, Transferencia o Boleta de Honorarios</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Titular</p>
                <p className="font-medium text-slate-800">Felipe Aguilar Monsalve</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">RUT</p>
                <p className="font-medium text-slate-800">18.460.276-8</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Banco</p>
                <p className="font-medium text-slate-800">Banco de Chile · Cuenta Corriente</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">N° de Cuenta</p>
                <p className="font-medium text-slate-800">00-804-03035-09</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email de confirmación</p>
                <p className="font-medium text-slate-800">felipemonsalveaguilar@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-10 py-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notas y Condiciones</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-10 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-slate-400">
              {company?.company_name || "Mi Empresa"}
              {company?.email ? ` · ${company.email}` : ""}
              {company?.phone ? ` · ${company.phone}` : ""}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">Documento generado digitalmente</p>
          </div>
        </div>
      </div>
    </div>
  );
}