import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, UserSearch } from "lucide-react";
import { addDays, format } from "date-fns";

const IVA_RATE = 0.19;
const emptyItem = { service_type_id: "", service_name: "", description: "", quantity: 1, unit_price: 0, unit_price_uf: 0, total: 0, total_uf: 0, is_operational_expense: false };

function generateQuoteNumber() {
  const now = new Date();
  return `COT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;
}

export default function QuoteForm({ quote, onSave, onCancel }) {
  const [services, setServices] = useState([]);
  const [pastQuotes, setPastQuotes] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [form, setForm] = useState({
    quote_number: generateQuoteNumber(),
    title: "",
    currency: "CLP",
    uf_value: 38000,
    billing_type: "Único",
    billing_day: 5,
    client_name: "",
    client_company: "",
    client_rut: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    items: [{ ...emptyItem }],
    payment_type: "Sin IVA",
    include_iva: false,
    payment_options: [],
    status: "Borrador",
    notes: "",
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    abonos: [],
    discount_amount: 0,
    discount_percent: 0,
    subtotal: 0,
    operational_expenses_total: 0,
    total_client: 0,
    subtotal_after_discount: 0,
    iva_amount: 0,
    total: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ServiceType.list("name").then(setServices);
    base44.entities.Quote.list("-created_date", 100).then(setPastQuotes);
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) {
        setPaymentOptions(data[0].payment_options || []);
        if (!quote && data[0].quote_notes_default) {
          setForm(prev => ({ ...prev, notes: data[0].quote_notes_default }));
        }
      }
    });
    if (quote) {
      const payment_options = quote.payment_options || (quote.payment_option ? [quote.payment_option] : []);
      setForm(prev => ({ ...prev, ...quote, abonos: quote.abonos || [], payment_options }));
    }
  }, []);

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

  const recalc = (f) => {
    const ufVal = parseFloat(f.uf_value) || 1;
    // Solo ítems regulares suman al subtotal del cliente
    const regularItems = f.items.filter(i => !i.is_operational_expense);
    const subtotal = regularItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const subtotal_uf = f.currency === "UF" ? regularItems.reduce((sum, i) => sum + (parseFloat(i.total_uf) || 0), 0) : null;
    const discount_amount = parseFloat(f.discount_amount) || 0;
    const discount_percent = subtotal > 0 ? (discount_amount / subtotal) * 100 : 0;
    const subtotal_after_discount = subtotal - discount_amount;
    const include_iva = f.payment_type === "Con IVA (19%)";
    const iva_amount = include_iva ? subtotal_after_discount * IVA_RATE : 0;
    const total = subtotal_after_discount + iva_amount;
    const total_uf = f.currency === "UF" ? total / ufVal : null;
    // Gastos operacionales: solo para registro interno
    const operationalItems = f.items.filter(i => i.is_operational_expense);
    const operational_expenses_total = operationalItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const total_client = total;
    setForm({ ...f, subtotal, subtotal_uf, discount_amount, discount_percent, subtotal_after_discount, iva_amount, total, total_uf, include_iva, operational_expenses_total, total_client });
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    const ufVal = parseFloat(form.uf_value) || 1;
    const isUF = form.currency === "UF";
    if (field === "unit_price_uf" && isUF) {
      items[idx].unit_price = (parseFloat(val) || 0) * ufVal;
      items[idx].unit_price_uf = parseFloat(val) || 0;
      items[idx].total_uf = (parseFloat(items[idx].quantity) || 0) * (parseFloat(val) || 0);
      items[idx].total = items[idx].total_uf * ufVal;
    } else if (field === "quantity" || field === "unit_price") {
      if (isUF) {
        items[idx].total_uf = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price_uf) || 0);
        items[idx].total = items[idx].total_uf * ufVal;
      } else {
        items[idx].total = (parseFloat(items[idx].quantity) || 0) * (parseFloat(items[idx].unit_price) || 0);
      }
    }
    if (field === "service_type_id") {
      const svc = services.find(s => s.id === val);
      if (svc) {
        items[idx].service_name = svc.name;
        items[idx].description = svc.description || "";
        items[idx].unit_price = svc.default_price || 0;
        items[idx].unit_price_uf = svc.default_price ? svc.default_price / ufVal : 0;
        items[idx].total = items[idx].quantity * (svc.default_price || 0);
        items[idx].total_uf = isUF ? items[idx].total / ufVal : 0;
      }
    }
    recalc({ ...form, items });
  };

  const setField = (field, val) => {
    const updated = { ...form, [field]: val };
    if (field === "payment_type") {
      recalc(updated);
      return;
    }
    setForm(updated);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const addOpItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem, is_operational_expense: true }] }));
  const removeItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx);
    recalc({ ...form, items });
  };

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
    // Separar ítems regulares y operacionales
    const regularItems = form.items.filter(i => !i.is_operational_expense);
    const operationalItemsSave = form.items.filter(i => i.is_operational_expense);
    // Calcular totales solo sobre ítems regulares (los operacionales son internos)
    const subtotal = regularItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const discount_amount = parseFloat(form.discount_amount) || 0;
    const discount_percent = subtotal > 0 ? (discount_amount / subtotal) * 100 : 0;
    const subtotal_after_discount = subtotal - discount_amount;
    const include_iva = form.payment_type === "Con IVA (19%)";
    const iva_amount = include_iva ? subtotal_after_discount * IVA_RATE : 0;
    const total = subtotal_after_discount + iva_amount;
    const operational_expenses_total = operationalItemsSave.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const total_client = total;
    const payload = { ...form, subtotal, discount_amount, discount_percent, subtotal_after_discount, iva_amount, total, include_iva, operational_expenses_total, total_client, payment_options: form.payment_options || [] };

    let savedId = quote?.id;
    if (quote?.id) {
      await base44.entities.Quote.update(quote.id, payload);
    } else {
      const created = await base44.entities.Quote.create(payload);
      savedId = created.id;
    }

    if (payload.billing_type === "Mensual" && payload.status === "Ejecutada") {
      const existing = await base44.entities.RecurringCharge.filter({ quote_id: savedId, active: true });
      if (existing.length === 0) {
        const now = new Date();
        const day = payload.billing_day || 5;
        const nextDate = new Date(now.getFullYear(), now.getMonth(), day);
        if (nextDate <= now) nextDate.setMonth(nextDate.getMonth() + 1);
        await base44.entities.RecurringCharge.create({
          quote_id: savedId,
          client_name: payload.client_name,
          client_company: payload.client_company || "",
          title: payload.title || payload.quote_number,
          amount: payload.total,
          billing_day: day,
          next_billing_date: nextDate.toISOString().split("T")[0],
          status: "pendiente",
          active: true,
        });
      }
    }

    setSaving(false);
    onSave();
  };

  const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString("es-CL")}`;
  const formatUF = (n) => `${(n || 0).toFixed(2)} UF`;
  const isUF = form.currency === "UF";
  const ufVal = parseFloat(form.uf_value) || 1;

  const opItems = form.items.filter(i => i.is_operational_expense);
  const regularDisplayItems = form.items.filter(i => !i.is_operational_expense);
  // Solo ítems regulares suman al total del cliente
  const subtotal = regularDisplayItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const subtotal_uf = isUF ? regularDisplayItems.reduce((sum, i) => sum + (parseFloat(i.total_uf) || 0), 0) : 0;
  const totalGastosOp = opItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const discount_amount = parseFloat(form.discount_amount) || 0;
  const discount_percent = subtotal > 0 ? (discount_amount / subtotal) * 100 : 0;
  const subtotal_after_discount = subtotal - discount_amount;
  const include_iva = form.payment_type === "Con IVA (19%)";
  const iva_amount = include_iva ? subtotal_after_discount * IVA_RATE : 0;
  const total = subtotal_after_discount + iva_amount;
  const total_uf = isUF ? total / ufVal : 0;
  const totalAbonos = (form.abonos || []).reduce((s, a) => s + (a.monto || 0), 0);
  const saldoPendiente = total - totalAbonos;
  const showAbonos = ["Enviada", "Aceptada", "Ejecutada"].includes(form.status);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Datos de la Cotización</h2>
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Título / Asunto <span className="text-slate-300">(opcional)</span></label>
          <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={form.title || ""} onChange={e => setField("title", e.target.value)}
            placeholder="Ej: Instalación eléctrica Don Pedro, Cámaras sucursal norte..." />
        </div>
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
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block">Moneda</label>
          <div className="flex gap-3 items-center flex-wrap">
            {["CLP", "UF"].map(opt => (
              <button key={opt} type="button" onClick={() => setField("currency", opt)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${form.currency === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"}`}>
                {opt === "CLP" ? "💵 Pesos (CLP)" : "📊 UF"}
              </button>
            ))}
            {form.currency === "UF" && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 whitespace-nowrap">Valor UF del día:</label>
                <input type="number" min="1" className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.uf_value || ""} onChange={e => setField("uf_value", parseFloat(e.target.value) || 0)} placeholder="38000" />
                <span className="text-xs text-slate-400">CLP</span>
              </div>
            )}
          </div>
          {form.currency === "UF" && <p className="text-xs text-blue-600 mt-1.5">Los precios se ingresan en UF. El total se calculará en CLP usando el valor de UF indicado.</p>}
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block">Tipo de cobro</label>
          <div className="flex gap-3">
            {["Único", "Mensual"].map(opt => (
              <button key={opt} type="button" onClick={() => setField("billing_type", opt)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${form.billing_type === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"}`}>
                {opt === "Mensual" ? "🔄 Mensual" : "1️⃣ Único"}
              </button>
            ))}
          </div>
          {form.billing_type === "Mensual" && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Día de cobro (cada mes):</label>
              <input type="number" min="1" max="28" className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={form.billing_day || 5} onChange={e => setField("billing_day", parseInt(e.target.value))} />
              <span className="text-xs text-slate-400">de cada mes</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block">Tipo de documento / impuesto</label>
          <div className="flex gap-3 flex-wrap">
            {["Sin IVA", "Con IVA (19%)", "Boleta de Honorarios"].map(opt => (
              <button key={opt} type="button" onClick={() => setField("payment_type", opt)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${form.payment_type === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"}`}>
                {opt}
              </button>
            ))}
          </div>
          {form.payment_type === "Boleta de Honorarios" && <p className="text-xs text-amber-600 mt-2">⚠️ Se aplicará retención del 10,75% sobre el monto bruto (norma chilena).</p>}
        </div>
        {paymentOptions.length > 0 && (
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Datos de Pago <span className="text-slate-300">(puedes seleccionar una o más)</span></label>
            <div className="space-y-2">
              {paymentOptions.map((opt, idx) => {
                const key = opt.label + "|" + (opt.numero_cuenta || "");
                const isChecked = (form.payment_options || []).some(o => (o.label + "|" + (o.numero_cuenta || "")) === key);
                const toggle = () => {
                  const current = form.payment_options || [];
                  const next = isChecked ? current.filter(o => (o.label + "|" + (o.numero_cuenta || "")) !== key) : [...current, opt];
                  setField("payment_options", next);
                };
                return (
                  <button key={idx} type="button" onClick={toggle}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-start gap-3 ${isChecked ? "border-slate-900 bg-slate-50" : "border-gray-100 hover:border-gray-300 bg-white"}`}>
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isChecked ? "bg-slate-900 border-slate-900" : "border-gray-300"}`}>
                      {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {opt.titular && <span className="text-xs text-slate-500">Titular: {opt.titular}</span>}
                        {opt.banco && <span className="text-xs text-slate-500">Banco: {opt.banco}</span>}
                        {opt.numero_cuenta && <span className="text-xs text-slate-500">Cuenta: {opt.numero_cuenta}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Datos del Cliente</h2>
          <div className="relative">
            <button type="button" onClick={() => setShowClientDropdown(!showClientDropdown)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <UserSearch className="w-3.5 h-3.5" /> Autocompletar
            </button>
            {showClientDropdown && (
              <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-72">
                <div className="p-2 border-b border-gray-100">
                  <input className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                    placeholder="Buscar cliente..." value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)} autoFocus />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filteredClients.length === 0 && <p className="text-xs text-slate-400 px-4 py-3">No hay clientes previos</p>}
                  {filteredClients.map((c, i) => (
                    <button key={i} type="button" onClick={() => fillFromClient(c)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Servicios / Ítems</h2>
          <div className="flex gap-2">
            <button onClick={addOpItem} className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50">
              <Plus className="w-3.5 h-3.5" /> Gasto Operacional
            </button>
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <Plus className="w-3.5 h-3.5" /> Agregar ítem
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {form.items.map((item, idx) => (
            <div key={idx} className={`border rounded-xl p-4 ${item.is_operational_expense ? "border-orange-200 bg-orange-50/40" : "border-gray-100 bg-gray-50/50"}`}>
              <div className="flex items-center mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={!!item.is_operational_expense}
                    onChange={e => updateItem(idx, "is_operational_expense", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300" />
                  <span className={`text-xs font-medium ${item.is_operational_expense ? "text-orange-600" : "text-slate-400"}`}>
                    {item.is_operational_expense ? "⚙️ Gasto Operacional — no suma al total del cliente" : "Marcar como Gasto Operacional"}
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-4">
                  <label className="text-xs text-slate-400 mb-1 block">Servicio</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                    value={item.service_type_id || ""} onChange={e => updateItem(idx, "service_type_id", e.target.value)}>
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
                  {form.currency === "UF" ? (
                    <>
                      <label className="text-xs text-slate-400 mb-1 block">Precio Unit. (UF)</label>
                      <input type="number" step="0.01" className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-blue-50 focus:outline-none"
                        value={item.unit_price_uf || ""} onChange={e => updateItem(idx, "unit_price_uf", e.target.value)} placeholder="0.00 UF" />
                      {item.unit_price_uf > 0 && <p className="text-xs text-slate-400 mt-0.5">≈ {formatCLP(item.unit_price_uf * (form.uf_value || 1))}</p>}
                    </>
                  ) : (
                    <>
                      <label className="text-xs text-slate-400 mb-1 block">Precio Unit. (CLP)</label>
                      <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                        value={item.unit_price || ""} onChange={e => updateItem(idx, "unit_price", e.target.value)} />
                    </>
                  )}
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
                  <p className={`text-sm font-semibold py-2 ${item.is_operational_expense ? "text-orange-600" : "text-slate-900"}`}>
                    {form.currency === "UF" ? `${(item.total_uf || 0).toFixed(2)} UF` : formatCLP(item.total)}
                  </p>
                  {form.currency === "UF" && item.total_uf > 0 && <p className="text-xs text-slate-400">≈ {formatCLP(item.total)}</p>}
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

        <div className="mt-5 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Descuento (en pesos CLP)</label>
              <input type="number" min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                value={form.discount_amount || ""} placeholder="0" onChange={e => setField("discount_amount", e.target.value)} />
            </div>
            {discount_amount > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Equivale a</p>
                <p className="text-lg font-bold text-emerald-600">{discount_percent.toFixed(1)}%</p>
                <p className="text-xs text-slate-400">de descuento</p>
              </div>
            )}
          </div>
        </div>

        {opItems.length > 0 && (
          <div className="mt-5 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-xs font-bold text-orange-700 mb-2">⚙️ Gastos Operacionales (internos — no se cobran al cliente)</p>
            {opItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs text-orange-600 py-0.5">
                <span>{item.service_name || item.description || "Ítem sin nombre"} × {item.quantity || 1}</span>
                <span className="font-semibold">{formatCLP(item.total)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm font-bold text-orange-700 border-t border-orange-300 mt-2 pt-2">
              <span>Total Gastos Operacionales</span>
              <span>{formatCLP(totalGastosOp)}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-900 w-40 text-right">
              {isUF ? formatUF(subtotal_uf) : formatCLP(subtotal)}
              {isUF && <span className="block text-xs text-slate-400 font-normal">≈ {formatCLP(subtotal)}</span>}
            </span>
          </div>
          {discount_amount > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-600">Descuento ({discount_percent.toFixed(1)}%)</span>
              <span className="font-semibold text-emerald-600 w-40 text-right">-{formatCLP(discount_amount)}</span>
            </div>
          )}
          {discount_amount > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">Subtotal c/descuento</span>
              <span className="font-semibold text-slate-900 w-40 text-right">{formatCLP(subtotal_after_discount)}</span>
            </div>
          )}
          {include_iva && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500">IVA (19%)</span>
              <span className="font-semibold text-slate-900 w-40 text-right">{formatCLP(iva_amount)}</span>
            </div>
          )}
          {form.payment_type === "Boleta de Honorarios" && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Retención (10,75%)</span>
                <span className="font-semibold text-red-600 w-40 text-right">-{formatCLP(subtotal_after_discount * 0.1075)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Líquido a pagar</span>
                <span className="font-semibold text-slate-900 w-40 text-right">{formatCLP(subtotal_after_discount * (1 - 0.1075))}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-4 border-t border-gray-200 pt-2 mt-1">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-base font-bold text-slate-900 w-40 text-right">
              {isUF ? (
                <>
                  {formatUF(total_uf)}
                  <span className="block text-xs text-slate-500 font-normal">≈ {formatCLP(total)}</span>
                </>
              ) : formatCLP(total)}
            </span>
          </div>
        </div>
      </div>

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
          {(form.abonos || []).length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin abonos registrados</p>}
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notas / Condiciones</label>
        <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
          rows={3} value={form.notes || ""} onChange={e => setField("notes", e.target.value)}
          placeholder="Condiciones de pago, garantías, observaciones..." />
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-5 py-2.5 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || !form.client_name}
          className="px-5 py-2.5 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Guardando..." : quote?.id ? "Actualizar" : "Crear Cotización"}
        </button>
      </div>
    </div>
  );
}