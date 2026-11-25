import { useState, useEffect, useCallback } from "react";
import { Banknote, Plus, UserPlus, Search, Calendar, Pencil, Ban, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatCLP, sumDistributions, totalsByPartner } from "@/lib/withdrawals";
import WithdrawalForm from "@/components/withdrawals/WithdrawalForm";
import PartnerQuickForm from "@/components/withdrawals/PartnerQuickForm";

const formatDate = (date) => (date ? date.substring(0, 10).split("-").reverse().join("-") : "");

export default function Withdrawals() {
  const { user } = useAuth();

  const [movements, setMovements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [editing, setEditing] = useState(null); // null: cerrado, {}: nuevo
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [movementsData, partnersData] = await Promise.all([
        base44.entities.Withdrawal.list("-date", 5000),
        base44.entities.Partner.list("full_name"),
      ]);
      setMovements(movementsData);
      setPartners(partnersData);
      setError("");
    } catch {
      setError("No se pudieron cargar los datos. Inténtalo nuevamente.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVoid = async (movement) => {
    const reason = prompt("Motivo de la anulación:");
    if (!reason?.trim()) return;
    try {
      await base44.entities.Withdrawal.update(movement.id, {
        is_voided: true,
        void_reason: reason.trim(),
        voided_at: new Date().toISOString(),
        voided_by: user?.email || "Usuario de la app",
      });
      await load();
    } catch {
      setError("No se pudo anular el movimiento.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = movements.filter((m) => {
    const text = [m.concept, m.reference, m.type, m.notes, ...(m.distributions || []).map((d) => d.partner_name)]
      .join(" ")
      .toLowerCase();
    return (!term || text.includes(term)) && (!filterMonth || m.date?.startsWith(filterMonth));
  });

  // Las tarjetas respetan el filtro de mes, no el de búsqueda
  const periodMovements = movements.filter((m) => !filterMonth || m.date?.startsWith(filterMonth));
  const active = periodMovements.filter((m) => !m.is_voided);
  const totalWithdrawn = active.reduce((sum, m) => sum + sumDistributions(m.distributions), 0);
  const byPartner = totalsByPartner(periodMovements);
  const partnerCards = [
    ...partners.map((p) => ({ id: p.id, name: p.full_name, total: byPartner[p.id]?.total || 0 })),
    ...Object.entries(byPartner)
      .filter(([id]) => !partners.some((p) => p.id === id))
      .map(([id, v]) => ({ id, ...v })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Giros / Retiros</h1>
              <p className="text-xs text-slate-500">Dinero retirado de la cuenta principal de ByteSur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPartnerForm(true)}
              className="flex items-center gap-2 border border-gray-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
              <UserPlus className="w-4 h-4" /> Agregar Socio
            </button>
            <button onClick={() => setEditing({})} disabled={partners.length === 0}
              title={partners.length === 0 ? "Primero agrega un socio" : undefined}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Registrar Retiro
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
            <p className="text-sm text-slate-500 font-medium mb-2">Total retirado {filterMonth ? "del mes" : "histórico"}</p>
            <p className="text-2xl font-bold text-red-600">{formatCLP(totalWithdrawn)}</p>
            <p className="text-xs text-slate-400 mt-1">{active.length} movimientos vigentes</p>
          </div>
          {partnerCards.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-sm text-slate-500 font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> <span className="truncate">{p.name}</span>
              </p>
              <p className="text-2xl font-bold text-slate-900">{formatCLP(p.total)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {totalWithdrawn > 0 ? Math.round((p.total / totalWithdrawn) * 100) : 0}% de lo retirado
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar por concepto, socio, comprobante..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="month" aria-label="Filtrar por mes" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-slate-500 font-medium">
              {partners.length === 0 ? "Agrega a los socios para comenzar" : "No hay movimientos registrados"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {filtered.map((m) => (
              <div key={m.id} className={`px-5 py-4 flex items-center justify-between gap-4 ${m.is_voided ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold text-slate-900 ${m.is_voided ? "line-through" : ""}`}>{m.concept || m.type}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{m.type}</span>
                    {m.is_voided && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Anulado</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(m.date)}{m.reference && ` · Comprobante ${m.reference}`}
                  </p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {(m.distributions || []).map((d) => (
                      <span key={d.partner_id} className="text-xs bg-slate-50 border border-gray-100 rounded-lg px-2 py-1 text-slate-600">
                        {d.partner_name}: <strong>{formatCLP(d.amount)}</strong>
                      </span>
                    ))}
                  </div>
                  {m.notes && <p className="text-xs text-slate-400 mt-1">{m.notes}</p>}
                  {m.is_voided && <p className="text-xs text-red-500 mt-1">Motivo: {m.void_reason} ({m.voided_by})</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className={`text-base font-bold ${m.is_voided ? "text-slate-400 line-through" : "text-red-600"}`}>
                    {formatCLP(m.total_amount)}
                  </p>
                  {!m.is_voided && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(m)} title="Editar" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleVoid(m)} title="Anular" className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <WithdrawalForm movement={editing.id ? editing : null} partners={partners}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {showPartnerForm && (
        <PartnerQuickForm onClose={() => setShowPartnerForm(false)} onSaved={() => { setShowPartnerForm(false); load(); }} />
      )}
    </div>
  );
}
