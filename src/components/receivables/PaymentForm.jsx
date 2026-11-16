import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { sendCollectionAction, newRequestId } from "@/lib/collectionApi";
import { MEDIOS_PAGO, fmtCLP } from "@/lib/receivables";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const field = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10";

export default function PaymentForm({ quote, saldo, onUpdated }) {
  const [form, setForm] = useState({
    monto: "",
    fecha: todayStr(),
    medio_pago: "Transferencia",
    referencia: "",
    observaciones: "",
  });
  const [requestId, setRequestId] = useState(newRequestId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto mayor a cero");
      return;
    }
    if (monto > saldo) {
      setError(`El monto no puede superar el saldo pendiente (${fmtCLP(saldo)})`);
      return;
    }
    setSaving(true);
    try {
      const res = await sendCollectionAction(quote.id, "add_payment", { ...form, monto, requestId });
      setForm({ monto: "", fecha: todayStr(), medio_pago: form.medio_pago, referencia: "", observaciones: "" });
      setRequestId(newRequestId());
      if (res.quote) onUpdated(res.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-slate-50 border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-900">Registrar abono</p>
        <p className="text-[11px] text-slate-500">Saldo pendiente {fmtCLP(saldo)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] text-slate-500 block mb-1">Monto recibido (CLP) *</label>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.monto}
            onChange={(e) => set("monto", e.target.value)}
            placeholder={String(Math.round(saldo))}
            className={field}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] text-slate-500 block mb-1">Fecha del pago *</label>
          <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 block mb-1">Medio de pago</label>
          <select value={form.medio_pago} onChange={(e) => set("medio_pago", e.target.value)} className={field}>
            {MEDIOS_PAGO.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 block mb-1">Referencia / comprobante</label>
          <input
            value={form.referencia}
            onChange={(e) => set("referencia", e.target.value)}
            placeholder="Opcional"
            className={field}
          />
        </div>
        <div className="col-span-2">
          <label className="text-[11px] text-slate-500 block mb-1">Observaciones</label>
          <input
            value={form.observaciones}
            onChange={(e) => set("observaciones", e.target.value)}
            placeholder="Opcional"
            className={field}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}

      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? "Registrando..." : "Registrar abono"}
        </button>
      </div>
    </form>
  );
}