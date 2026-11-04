import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Layers } from "lucide-react";
import QuotePreviewFrame from "@/components/quotes/QuotePreviewFrame";
import { QUOTE_PROPOSALS } from "@/lib/quoteProposals";

const DEMO_QUOTE = {
  quote_number: "COT-20261104-102",
  title: "Implementación y soporte de red",
  status: "Enviada",
  currency: "CLP",
  billing_type: "Mensual",
  billing_day: 5,
  created_date: new Date().toISOString(),
  valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
  client_name: "María Fernández",
  client_company: "Comercial Andes Ltda.",
  client_rut: "76.543.210-8",
  client_email: "maria@comercialandes.cl",
  client_phone: "+56 9 8765 4321",
  client_address: "Av. Apoquindo 4501, of. 802, Las Condes",
  items: [
    { service_name: "Instalación de red estructurada", description: "Cableado Cat 6, 12 puntos y certificación", quantity: 1, unit_price: 480000, total: 480000 },
    { service_name: "Configuración de firewall", description: "Reglas, VPN y respaldo de configuración", quantity: 1, unit_price: 180000, total: 180000 },
    { service_name: "Soporte mensual", description: "Monitoreo y atención remota", quantity: 1, unit_price: 120000, total: 120000 },
  ],
  subtotal: 780000,
  total: 780000,
  payment_type: "Sin IVA",
  notes: "Valores en pesos chilenos. El soporte mensual se factura el día 5 de cada mes.",
  payment_options: [
    { label: "Transferencia", titular: "Bytes-SUR SpA", rut: "77.111.222-3", banco: "Banco de Chile", tipo_cuenta: "Corriente", numero_cuenta: "12345678", email_confirmacion: "pagos@bytesur.cl" },
  ],
};

export default function QuoteDesignProposals() {
  const [company, setCompany] = useState(null);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CompanySettings.list(),
      base44.entities.Quote.list("-created_date", 1),
    ]).then(([settings, quotes]) => {
      setCompany(settings[0] || null);
      setQuote(quotes[0] || DEMO_QUOTE);
    });
  }, []);

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Propuestas de diseño · PDF de cotizaciones</h1>
            <p className="text-sm text-slate-500 mt-1">
              Tres layouts con el encabezado rediseñado, mostrados con datos reales
              {quote === DEMO_QUOTE ? " (ejemplo, aún no hay cotizaciones)" : ` (${quote.client_name})`}.
              Dime cuál prefieres y lo aplico al PDF definitivo.
            </p>
          </div>
        </div>

        <div className="space-y-8 mt-8">
          {QUOTE_PROPOSALS.map((p, i) => (
            <div key={p.key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-base font-bold text-slate-900">{p.name}</p>
                    <span className="text-xs text-slate-400">{p.tagline}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {p.points.map((pt) => (
                      <li key={pt} className="text-xs text-slate-500 flex gap-1.5">
                        <span className="text-slate-300">·</span>{pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <QuotePreviewFrame html={p.build(quote, company)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}