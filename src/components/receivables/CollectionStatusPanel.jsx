import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { sendCollectionAction } from "@/lib/collectionApi";
import { WORK_STATUSES, resolveWorkStatus } from "@/lib/receivables";

const field = "w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10";

const TONES = {
  Pendiente: "bg-slate-100 text-slate-600 border-slate-200",
  "En ejecución": "bg-blue-50 text-blue-600 border-blue-200",
  "Por entregar": "bg-amber-50 text-amber-700 border-amber-200",
  Ejecutado: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Cancelado: "bg-red-50 text-red-600 border-red-200",
};

export default function CollectionStatusPanel({ quote, onUpdated }) {
  const current = resolveWorkStatus(quote);
  const [executedDate, setExecutedDate] = useState(quote.executed_date || "");
  const [dueDate, setDueDate] = useState(quote.payment_due_date || "");
  const [followup, setFollowup] = useState(quote.next_followup_date || "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setExecutedDate(quote.executed_date || "");
    setDueDate(quote.payment_due_date || "");
    setFollowup(quote.next_followup_date || "");
  }, [quote.id, quote.executed_date, quote.payment_due_date, quote.next_followup_date]);

  const run = async (key, action, payload) => {
    setError("");
    setBusy(key);
    try {
      const res = await sendCollectionAction(quote.id, action, payload);
      if (res.quote) onUpdated(res.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-900 mb-2">Estado del trabajo</p>
        <div className="flex flex-wrap gap-1.5">
          {WORK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => run(`status-${s}`, "set_work_status", { work_status: s, executed_date: executedDate || undefined })}
              disabled={!!busy}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-60 ${
                current === s ? TONES[s] : "bg-white text-slate-500 border-gray-200 hover:border-slate-300"
              }`}
            >
              {busy === `status-${s}` ? "..." : s}
            </button>
          ))}
        </div>
        {current === "Ejecutado" && (
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1">
              <label className="text-[11px] text-slate-500 block mb-1">Fecha de ejecución</label>
              <input type="date" value={executedDate} onChange={(e) => setExecutedDate(e.target.value)} className={field} />
            </div>
            <button
              onClick={() => run("exec-date", "set_work_status", { work_status: "Ejecutado", executed_date: executedDate })}
              disabled={!!busy || !executedDate}
              className="text-[11px] px-3 py-2 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-50"
            >
              {busy === "exec-date" ? "..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-500 block mb-1">Vencimiento del pago</label>
          <div className="flex gap-2">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
            <button
              onClick={() => run("due", "set_due_date", { payment_due_date: dueDate || null })}
              disabled={!!busy || dueDate === (quote.payment_due_date || "")}
              className="text-[11px] px-3 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-40"
            >
              {busy === "due" ? "..." : "Guardar"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 block mb-1">Próximo seguimiento</label>
          <div className="flex gap-2">
            <input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} className={field} />
            <button
              onClick={() => run("follow", "set_followup", { next_followup_date: followup || null })}
              disabled={!!busy || followup === (quote.next_followup_date || "")}
              className="text-[11px] px-3 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-40"
            >
              {busy === "follow" ? "..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}