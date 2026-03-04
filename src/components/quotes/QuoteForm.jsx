import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ChevronDown, UserSearch } from "lucide-react";
import { addDays, format } from "date-fns";

const IVA_RATE = 0.19;
const emptyItem = { service_type_id: "", service_name: "", description: "", quantity: 1, unit_price: 0, total: 0 };

function generateQuoteNumber() {
  const now = new Date();
  return `COT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;
}

export default function QuoteForm({ quote, onSave, onCancel }) {
  const [services, setServices] = useState([]);
  const [pastQuotes, setPastQuotes] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [form, setForm] = useState({
    quote_number: generateQuoteNumber(),
    client_name: "",
    client_company: "",
    client_rut: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    items: [{ ...emptyItem }],
    payment_type: "Sin IVA",
    include_iva: false,
    status: "Borrador",
    notes: "",
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    abonos: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ServiceType.list("name").then(setServices);
    base44.entities.Quote.list("-created_date", 100).then(setPastQuotes);
    if (quote) {
      setForm(prev => ({ ...prev, ...quote, abonos: quote.abonos || [] }));
    } else {
      base44.entities.CompanySettings.list().then(data => {
        if (data && data.length > 0 && data[0].quote_notes_default) {
          setForm(prev => ({ ...prev, notes: data[0].quote_notes_default }));
        }
      });
    }
  }, []);

  // Unique clients from past quotes
  const uniqueClients = [];
  const seen = new Set();
  for (const q of pastQuotes) {
    const key = q.client_rut || q.client_name;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueClients.push(q);
    }
  }
  const filteredClients = uniqueClients.filter(c =>
    c.client_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_company?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.client_rut?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const fillFromClient = (q) => {
    setForm(prev => ({
      ...prev,
      client_name: q.client_name || "",
      client_company: q.client_company || "",
      client_rut: q.client_rut || "",
      client_email: q.client_email || "",
      client_phone: q.client_phone || "",
      client_address: q.client_address || "",
    }));
    setShowClientDropdown(false);
    setClientSearch("");
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === "quantity" || field === "unit_price") {
      items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0);
    }
    if (field === "service_type_id") {
      const svc = services.find(s => s.id === val);
      if (svc) {
        items[idx].service_name = svc.name;
        items[idx].description = svc.description || "";
        items[idx].unit_price = svc.default_price || 0;
        items[idx].total = items[idx].quantity * (svc.default_price || 0);
      }
    }
    recalc({ ...form, items });
  };

  const recalc = (f) => {
    const subtotal = f.items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const include_iva = f.payment_type === "Con IVA (19%)";
    const iva_amount = include_iva ? subtotal * IVA_RATE : 0;
    const total = subtotal + iva_amount;
    setForm({ ...f, subtotal, iva_amount, total, include_iva });
  };

  const setField = (field, val) => {
    const updated = { ...form, [field]: val };
    if (field === "payment_type") {
      const subtotal = form.subtotal || 0;
      const include_iva = val === "Con IVA (19%)";
      updated.include_iva = include_iva;
      updated.iva_amount = include_iva ? subtotal * IVA_RATE : 0;
      updated.total = subtotal + updated.iva_amount;
    }
    setForm(updated);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx);
    recalc({ ...form, items });
  };

  // Abonos
  const addAbono = () => {
    setForm(f => ({
      ...f,
      abonos: [...(f.abonos || []), { fecha: format(new Date(), "yyyy-MM-dd"), monto: 0, nota: "" }]
    }));
  };
  const updateAbono = (idx, field, val) => {
    const abonos = [...(form.abonos || [])];
    abonos[idx] = { ...abonos[idx], [field]: field === "monto" ? parseFloat(val) || 0 : val };
    setForm(f => ({ ...f, abonos }));
  };
  const removeAbono = (idx) => {
    setForm(f => ({ ...f, abonos: f.abonos.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const subtotal = form.items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const include_iva = form.payment_type === "Con IVA (19%)";
    const iva_amount = include_iva ? subtotal * IVA_RATE : 0;
    const payload = { ...form, subtotal, iva_amount, total: subtotal + iva_amount, include_iva };
    if (quote?.id) {
      await base44.entities.Quote.update(quote.id, payload);
    } else {
      await base44.entities.Quote.create(payload);
    }
    setSaving(false);
    onSave();
  };

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;

  const subtotal = form.items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const include_iva = form.payment_type === "Con IVA (19%)";
  const iva_amount = include_iva ? subtotal * IVA_RATE : 0;
  const total = subtotal + iva_amount;
  const totalAbonos = (form.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = total - totalAbonos;

  const showAbonos = ["Enviada", "Aceptada", "Ejecutada"].includes(form.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos de la Cotización</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nº Cotización</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={form.quote_number} onChange={e => setField("quote_number", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Estado</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={form.status} onChange={e => setField("status", e.target.value)}>
              {["Borrador", "Enviada", "Aceptada", "Rechazada", "Ejecutada"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Válida hasta</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={form.valid_until} onChange={e => setField("valid_until", e.target.value)} />
          </div>
        </div>
        {/* Tipo de cobro */}
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block">Tipo de documento / cobro</label>
          <div className="flex gap-3 flex-wrap">
            {["Sin IVA", "Con IVA (19%)", "Boleta de Honorarios"].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setField("payment_type", opt)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.payment_type === opt
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {form.payment_type === "Boleta de Honorarios" && (
            <p className="text-xs text-amber-600 mt-2">⚠️ Se aplicará retención del 10,75% sobre el monto bruto (norma chilena).</p>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos del Cliente</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowClientDropdown(!showClientDropdown)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <UserSearch className="w-3.5 h-3.5" /> Autocompletar
            </button>
            {showClientDropdown && (
              <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-72">
                <div className="p-2 border-b border-gray-100">
                  <input
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filteredClients.length === 0 && (
                    <p className="text-xs text-slate-400 px-4 py-3">No hay clientes previos</p>
                  )}
                  {filteredClients.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => fillFromClient(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                    >
                      <p className="font-medium text-slate-900">{c.client_name}</p>
                      {c.client_company && <p className="text-xs text-slate-400">{c.client_company}</p>}
                      {c.client_rut && <p className="text-xs text-slate-300">{c.client_rut}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Nombre *", field: "client_name", placeholder: "Nombre completo" },
            { label: "Empresa", field: "client_company", placeholder: "Empresa S.A." },
            { label: "RUT", field: "client_rut", placeholder: "12.345.678-9" },
            { label: "Email", field: "client_email", placeholder: "cliente@email.com" },
            { label: "Teléfono", field: "client_phone", placeholder: "+56 9 1234 5678" },
            { label: "Dirección", field: "client_address", placeholder: "Calle 123, Ciudad" },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={form[field] || ""} onChange={e => setField(field, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Servicios / Ítems</h2>
          <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Agregar ítem
          </button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-4">
                  <label className="text-xs text-slate-400 mb-1 block">Servicio</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                    value={item.service_type_id || ""}
                    onChange={e => updateItem(idx, "service_type_id", e.target.value)}
                  >
                    <option value="">-- Seleccionar --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">Descripción</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                    value={item.description || ""} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Detalle..." />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Precio Unit.</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                    value={item.unit_price || ""} onChange={e => updateItem(idx, "unit_price", e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">
                    {services.find(s => s.id === item.service_type_id)?.unit === "metro" ? "Metros" : "Cant."}
                  </label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                    value={item.quantity || ""} onChange={e => updateItem(idx, "quantity", e.target.value)} min="1" />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">Total</label>
                  <p className="text-sm font-semibold text-slate-900 py-2">{formatCLP(item.total)}</p>
                </div>
                <div className="md:col-span-1 flex items-end pb-1">
                  <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-900 w-32 text-right">{formatCLP(subtotal)}</span>
          </div>
          {include_iva && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">IVA (19%)</span>
              <span className="font-semibold text-slate-900 w-32 text-right">{formatCLP(iva_amount)}</span>
            </div>
          )}
          {form.payment_type === "Boleta de Honorarios" && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Retención (10,75%)</span>
                <span className="font-semibold text-red-600 w-32 text-right">-{formatCLP(subtotal * 0.1075)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Líquido a pagar</span>
                <span className="font-semibold text-slate-900 w-32 text-right">{formatCLP(subtotal * (1 - 0.1075))}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-4 border-t border-gray-200 pt-2 mt-1">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-base font-bold text-slate-900 w-32 text-right">{formatCLP(total)}</span>
          </div>
        </div>
      </div>

      {/* Abonos */}
      {showAbonos && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Abonos / Pagos Parciales</h2>
              {totalAbonos > 0 && (
                <p className={`text-xs mt-0.5 font-medium ${saldoPendiente <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  Abonado: {formatCLP(totalAbonos)} · Saldo pendiente: {formatCLP(saldoPendiente)}
                </p>
              )}
            </div>
            <button onClick={addAbono} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <Plus className="w-3.5 h-3.5" /> Agregar abono
            </button>
          </div>
          {(form.abonos || []).length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Sin abonos registrados</p>
          )}
          <div className="space-y-2">
            {(form.abonos || []).map((abono, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                <div className="col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                    value={abono.fecha || ""} onChange={e => updateAbono(idx, "fecha", e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">Monto (CLP)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                    value={abono.monto || ""} onChange={e => updateAbono(idx, "monto", e.target.value)} />
                </div>
                <div className="col-span-5">
                  <label className="text-xs text-slate-400 mb-1 block">Nota</label>
                  <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                    value={abono.nota || ""} onChange={e => updateAbono(idx, "nota", e.target.value)} placeholder="Ej: Transferencia 50%" />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <button onClick={() => removeAbono(idx)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notas / Condiciones</label>
        <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
          rows={3} value={form.notes || ""} onChange={e => setField("notes", e.target.value)}
          placeholder="Condiciones de pago, garantías, observaciones..." />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-5 py-2.5 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.client_name}
          className="px-5 py-2.5 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Guardando..." : quote?.id ? "Actualizar" : "Crear Cotización"}
        </button>
      </div>
    </div>
  );
}