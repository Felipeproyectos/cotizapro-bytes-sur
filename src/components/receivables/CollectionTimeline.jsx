import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { sendCollectionAction } from "@/lib/collectionApi";

const TYPE_STYLE = {
  nota: { label: "Gestión", dot: "bg-blue-500" },
  pago: { label: "Pago", dot: "bg-emerald-500" },
  anulacion: { label: "Anulación", dot: "bg-red-500" },
  estado: { label: "Estado", dot: "bg-violet-500" },
  vencimiento: { label: "Vencimiento", dot: "bg-amber-500" },
  seguimiento: { label: "Seguimiento", dot: "bg-slate-400" },
};

export default function CollectionTimeline({ quote, onUpdated }) {
  const [text, setText] = useState("");
  const [followup, setFollowup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const log = [...(quote.collection_log || [])].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  const save = async () => {
    setError("");
    if (!text.trim()) {
      setError("Escribe la observación de la gestión");
      return;
    }
    setSaving(true);
    try {
      const res = await sendCollectionAction(quote.id, "add_note", {
        text,
        next_followup_date: followup || undefined,
      });
      setText("");
      setFollowup("");
      if (res.quote) onUpdated(res.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-slate-900 mb-2">Historial de gestiones</p>

      <div className="bg-slate-50 border border-gray-100 rounded-2xl p-3 mb-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Ej: Se contactó al cliente el 15/11 y comprometió el pago para el 20/11"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white resize-none"
        />
        <div className="flex items-end gap-2 mt-2">
          <div className="flex-1">
            <label className="text-[11px] text-slate-500 block mb-1">Próximo seguimiento (opcional)</label>
            <input
              type="date"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Guardar gestión
          </button>
        </div>
        {error && <p className="text-[11px] text-red-600 mt-1.5">{error}</p>}
      </div>

      {!log.length ? (
        <p className="text-[11px] text-slate-400">Sin gestiones registradas todavía.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {log.map((entry, i) => {
            const style = TYPE_STYLE[entry.type] || TYPE_STYLE.nota;
            return (
              <div key={i} className="flex gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-700 leading-snug">{entry.text}</p>
                  <p className="text-[10px] text-slate-400">
                    {style.label} · {entry.at ? format(new Date(entry.at), "dd-MM-yyyy HH:mm") : "—"}
                    {entry.user ? ` · ${entry.user}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}