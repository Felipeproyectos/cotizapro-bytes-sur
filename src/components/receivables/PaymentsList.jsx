import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { sendCollectionAction } from "@/lib/collectionApi";
import { fmtCLP, fmtDate } from "@/lib/receivables";

export default function PaymentsList({ quote, onUpdated }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const abonos = [...(quote.abonos || [])].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const voidPayment = async (abono) => {
    const motivo = window.prompt("Motivo de la anulación (opcional):", "");
    if (motivo === null) return;
    setError("");
    setBusyId(abono.id);
    try {
      const res = await sendCollectionAction(quote.id, "void_payment", { abonoId: abono.id, motivo });
      if (res.quote) onUpdated(res.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-900 mb-2">Pagos registrados ({abonos.length})</p>
      {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}
      {!abonos.length ? (
        <p className="text-[11px] text-slate-400 bg-gray-50 rounded-xl px-3 py-3">Aún no hay abonos registrados.</p>
      ) : (
        <div className="space-y-1.5">
          {abonos.map((a, i) => (
            <div
              key={a.id || `legacy-${i}`}
              className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                a.anulado ? "border-gray-100 bg-gray-50/60" : "border-gray-100 bg-white"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-xs font-medium ${a.anulado ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {fmtDate(a.fecha)} · {a.medio_pago || "Sin medio"}
                  {a.referencia ? ` · Ref. ${a.referencia}` : ""}
                </p>
                {a.nota && <p className="text-[11px] text-slate-500 truncate">{a.nota}</p>}
                <p className="text-[10px] text-slate-400">
                  {a.registrado_por ? `Registrado por ${a.registrado_por}` : "Registro histórico"}
                  {a.anulado ? " · Anulado" : ""}
                  {a.anulado_motivo ? `: ${a.anulado_motivo}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold ${a.anulado ? "text-slate-400 line-through" : "text-emerald-600"}`}>
                  {fmtCLP(a.monto)}
                </span>
                {!a.anulado && a.id && (
                  <button
                    onClick={() => voidPayment(a)}
                    disabled={busyId === a.id}
                    title="Anular abono"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-50"
                  >
                    {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}