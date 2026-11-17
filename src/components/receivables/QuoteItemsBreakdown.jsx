import { fmtCLP, getTotalAcordado, getTotalAbonado, getSaldo } from "@/lib/receivables";

const fmtNum = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("es-CL") : "0");

const fmtUF = (n) =>
  `${(Number(n) || 0).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF`;

function TotalRow({ label, value, strong = false, tone }) {
  const color = tone === "emerald" ? "text-emerald-600" : strong ? "text-slate-900" : "text-slate-600";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[11px] ${strong ? "font-semibold text-slate-700" : "text-slate-500"}`}>{label}</span>
      <span className={`text-xs whitespace-nowrap ${strong ? "font-bold" : "font-semibold"} ${color}`}>{value}</span>
    </div>
  );
}

/**
 * Desglose de lo que se cobra en una cotización: ítems, materiales internos
 * y totales (subtotal, descuento, IVA, total, abonado y saldo).
 */
export default function QuoteItemsBreakdown({ quote, compact = false, showSaldo = true }) {
  const items = quote?.items || [];
  const services = items.filter((i) => !i.is_operational_expense);
  const expenses = items.filter((i) => i.is_operational_expense);
  const isUF = (quote?.currency || "CLP") === "UF";
  const text = compact ? "text-[11px]" : "text-xs";

  const amount = (clp, uf) => (isUF && Number(uf) ? `${fmtUF(uf)} (${fmtCLP(clp)})` : fmtCLP(clp));

  const subtotal = quote?.subtotal != null ? Number(quote.subtotal) : services.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const discount = Number(quote?.discount_amount) || 0;
  const iva = Number(quote?.iva_amount) || 0;
  const total = getTotalAcordado(quote) || subtotal - discount + iva;
  const abonado = getTotalAbonado(quote);
  const saldo = getSaldo(quote);
  const expensesTotal = expenses.reduce((s, i) => s + (Number(i.total) || 0), 0);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {services.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic">
          Sin ítems registrados{quote?.title ? `: ${quote.title}` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-1.5 pr-2">Servicio / detalle</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-1.5 px-2">Cant.</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-1.5 px-2">P. unitario</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-1.5 pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-2 align-top">
                    <p className={`${text} font-medium text-slate-900`}>{item.service_name || "Servicio"}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 leading-snug whitespace-pre-line">{item.description}</p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 align-top text-right text-slate-600 whitespace-nowrap">{fmtNum(item.quantity || 1)}</td>
                  <td className="py-1.5 px-2 align-top text-right text-slate-600 whitespace-nowrap">
                    {amount(item.unit_price, item.unit_price_uf)}
                  </td>
                  <td className="py-1.5 pl-2 align-top text-right font-semibold text-slate-900 whitespace-nowrap">
                    {amount(item.total, item.total_uf)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="bg-slate-50 border border-gray-100 rounded-xl px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Materiales / gastos operacionales{" "}
            <span className="normal-case tracking-normal font-normal">— registro interno, no se cobra al cliente</span>
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {expenses.map((e, i) => `${e.service_name || e.description || "Ítem"} (${fmtCLP(e.total)})`).join(" · ")}
          </p>
          <p className="text-[11px] font-semibold text-slate-700 mt-1">Subtotal interno: {fmtCLP(expensesTotal)}</p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-2 space-y-1">
        <TotalRow label="Subtotal servicios" value={amount(subtotal, quote?.subtotal_uf)} />
        {discount > 0 && (
          <TotalRow
            label={`Descuento${quote?.discount_percent ? ` (${Number(quote.discount_percent).toFixed(1)}%)` : ""}`}
            value={`-${fmtCLP(discount)}`}
            tone="emerald"
          />
        )}
        {quote?.include_iva && <TotalRow label="IVA 19%" value={fmtCLP(iva)} />}
        <TotalRow label="Total cotización" value={amount(total, quote?.total_uf)} strong />
        {quote?.payment_type && quote.payment_type !== "Sin IVA" && (
          <p className="text-[10px] text-slate-400">Documento: {quote.payment_type}</p>
        )}
        <TotalRow label="Abonado" value={fmtCLP(abonado)} tone="emerald" />
        {showSaldo && (
          <div className="flex items-center justify-between gap-3 bg-slate-900 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-semibold text-slate-200">Saldo por cobrar</span>
            <span className="text-sm font-bold text-white whitespace-nowrap">{fmtCLP(saldo)}</span>
          </div>
        )}
      </div>
    </div>
  );
}