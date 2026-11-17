import ReceivableRow from "./ReceivableRow";
import ReceivableCard from "./ReceivableCard";
import { FileText } from "lucide-react";

export default function ReceivablesTable({ quotes, onOpen, onDelete }) {
  if (!quotes.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <FileText className="w-9 h-9 text-slate-200 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No hay cuentas por cobrar con estos filtros</p>
      </div>
    );
  }

  return (
    <>
      {/* Tabla (tablet / escritorio) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-slate-50/60">
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 pl-4 pr-2">Cotización</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Cliente</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Trabajo</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Vence</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Montos (CLP)</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold py-2.5 px-2">Estado pago</th>
              <th className="py-2.5 pl-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <ReceivableRow key={q.id} quote={q} onOpen={onOpen} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="md:hidden space-y-3">
        {quotes.map((q) => (
          <ReceivableCard key={q.id} quote={q} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
    </>
  );
}