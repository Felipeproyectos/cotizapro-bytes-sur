import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Search, Trash2, Pencil, X, Upload, FileText,
  ExternalLink, Calendar, ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DEFAULT_FORM = {
  invoice_number: "",
  client_name: "",
  issue_date: "",
  amount: "",
  notes: "",
};

function fileIcon(type) {
  if (!type) return <FileText className="w-4 h-4 text-slate-400" />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("xlsx"))
    return <FileText className="w-4 h-4 text-green-600" />;
  if (type.includes("image")) return <FileText className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-slate-400" />;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.Invoice.list("-issue_date");
    setInvoices(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, issue_date: format(new Date(), "yyyy-MM-dd") });
    setSelectedFiles([]);
    setShowForm(true);
  };

  const openEdit = (inv) => {
    setEditing(inv);
    setForm({
      invoice_number: inv.invoice_number || "",
      client_name: inv.client_name || "",
      issue_date: inv.issue_date || "",
      amount: inv.amount || "",
      notes: inv.notes || "",
    });
    setSelectedFiles([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.invoice_number || !form.issue_date) return;
    setSaving(true);

    try {
      let existingFiles = editing?.files || [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        for (const file of selectedFiles) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          existingFiles = [...existingFiles, { file_url, file_name: file.name, file_type: file.type }];
        }
        setUploading(false);
      }

      const payload = {
        invoice_number: form.invoice_number,
        client_name: form.client_name || "",
        issue_date: form.issue_date,
        amount: form.amount ? parseFloat(form.amount) : null,
        notes: form.notes || "",
        files: existingFiles,
      };

      if (editing) {
        await base44.entities.Invoice.update(editing.id, payload);
      } else {
        await base44.entities.Invoice.create(payload);
      }

      setShowForm(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta factura?")) return;
    await base44.entities.Invoice.delete(id);
    load();
  };

  const removeFile = async (inv, idx) => {
    const files = (inv.files || []).filter((_, i) => i !== idx);
    await base44.entities.Invoice.update(inv.id, { files });
    load();
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || inv.issue_date >= dateFrom;
    const matchTo = !dateTo || inv.issue_date <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  const formatCLP = (n) => n ? `$${Math.round(n).toLocaleString("es-CL")}` : "-";

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Facturas Emitidas</h1>
            <p className="text-sm text-slate-500 mt-1">{invoices.length} factura{invoices.length !== 1 ? "s" : ""} registrada{invoices.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay facturas que mostrar</p>
            <button onClick={openNew} className="mt-4 text-sm text-slate-900 underline underline-offset-2">
              Cargar primera factura
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-gray-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{inv.invoice_number}</p>
                      {inv.client_name && <span className="text-xs text-slate-500">· {inv.client_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {inv.issue_date && (
                        <p className="text-xs text-slate-400">
                          {format(new Date(inv.issue_date + "T12:00:00"), "dd MMM yyyy", { locale: es })}
                        </p>
                      )}
                      {inv.amount && (
                        <p className="text-xs font-semibold text-slate-700">{formatCLP(inv.amount)}</p>
                      )}
                    </div>
                    {inv.notes && <p className="text-xs text-slate-400 mt-1">{inv.notes}</p>}
                    {/* Archivos adjuntos */}
                    {(inv.files || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {inv.files.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                            {fileIcon(f.file_type)}
                            <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 max-w-[120px] truncate font-medium flex items-center gap-1">
                              {f.file_name}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <button onClick={() => removeFile(inv, i)} className="ml-1 text-slate-300 hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(inv)} className="p-2 hover:bg-gray-100 rounded-lg" title="Editar">
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(inv.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-900">{editing ? "Editar Factura" : "Nueva Factura"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">N° Factura *</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="Ej: 001234"
                    value={form.invoice_number}
                    onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Fecha de emisión *</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form.issue_date}
                    onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Cliente</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Nombre del cliente o empresa"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Monto (CLP)</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Ej: 150000"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Notas</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  placeholder="Observaciones opcionales..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Upload */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Documentos adjuntos</label>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-sm text-slate-500">
                    {selectedFiles.length > 0 ? `${selectedFiles.length} archivo(s) seleccionado(s)` : "Haz clic para adjuntar archivos"}
                  </span>
                  <span className="text-xs text-slate-400">PDF, Excel, Word, Imagen — múltiples permitidos</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={e => setSelectedFiles(Array.from(e.target.files))}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFiles.map((f, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg truncate max-w-[160px]">
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
                {editing && (editing.files || []).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 mb-1">Archivos ya adjuntos: {editing.files.length}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading || !form.invoice_number || !form.issue_date}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Subiendo..." : saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}