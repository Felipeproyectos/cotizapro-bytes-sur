import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  FolderOpen, Plus, X, Trash2, Upload, FileText, FileSpreadsheet,
  Star, Search, Users, Pencil, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";

const CAT_COLORS = {
  Legal: "bg-red-100 text-red-700",
  Contable: "bg-green-100 text-green-700",
  Contratos: "bg-blue-100 text-blue-700",
  Técnico: "bg-indigo-100 text-indigo-700",
  "Recursos Humanos": "bg-pink-100 text-pink-700",
  Comercial: "bg-amber-100 text-amber-700",
  Otro: "bg-gray-100 text-gray-600",
};

const CATEGORIES = ["Legal", "Contable", "Contratos", "Técnico", "Recursos Humanos", "Comercial", "Otro"];

function fileIcon(type) {
  if (!type) return <FileText className="w-5 h-5 text-slate-400" />;
  if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("xlsx") || type.includes("xls"))
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (type.includes("word") || type.includes("doc"))
    return <FileText className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-slate-400" />;
}

const emptyDoc = { title: "", description: "", category: "Legal", tags: "", is_important: false };
const emptyPartner = { full_name: "", rut: "", role: "", equity_percent: "", email: "", phone: "", address: "", notes: "" };

export default function CompanyDocs() {
  const [docs, setDocs] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("todas");
  const [activeTab, setActiveTab] = useState("documentos");

  // Doc modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [uploading, setUploading] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Partner modal
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState(emptyPartner);
  const [savingPartner, setSavingPartner] = useState(false);

  const load = async () => {
    const [docsData, partnersData] = await Promise.all([
      base44.entities.CompanyDocument.list("-created_date"),
      base44.entities.Partner.list("full_name"),
    ]);
    setDocs(docsData);
    setPartners(partnersData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ---- Docs ----
  const openNewDoc = () => {
    setEditingDoc(null);
    setDocForm(emptyDoc);
    setSelectedFile(null);
    setShowDocModal(true);
  };

  const openEditDoc = (doc) => {
    setEditingDoc(doc);
    setDocForm({
      title: doc.title || "",
      description: doc.description || "",
      category: doc.category || "Legal",
      tags: doc.tags || "",
      is_important: doc.is_important || false,
    });
    setSelectedFile(null);
    setShowDocModal(true);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
  };

  const handleSaveDoc = async () => {
    if (!docForm.title) return;
    setSavingDoc(true);

    let fileData = {};
    if (selectedFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      fileData = {
        file_url,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
      };
      setUploading(false);
    }

    const payload = { ...docForm, ...fileData };

    if (editingDoc?.id) {
      await base44.entities.CompanyDocument.update(editingDoc.id, payload);
    } else {
      await base44.entities.CompanyDocument.create(payload);
    }

    setSavingDoc(false);
    setShowDocModal(false);
    load();
  };

  const handleDeleteDoc = async (id) => {
    if (!confirm("¿Eliminar este documento?")) return;
    await base44.entities.CompanyDocument.delete(id);
    load();
  };

  const filteredDocs = docs.filter(d => {
    const matchSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.tags?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "todas" || d.category === filterCat;
    return matchSearch && matchCat;
  });

  // ---- Partners ----
  const openNewPartner = () => {
    setEditingPartner(null);
    setPartnerForm(emptyPartner);
    setShowPartnerModal(true);
  };

  const openEditPartner = (p) => {
    setEditingPartner(p);
    setPartnerForm({
      full_name: p.full_name || "",
      rut: p.rut || "",
      role: p.role || "",
      equity_percent: p.equity_percent || "",
      email: p.email || "",
      phone: p.phone || "",
      address: p.address || "",
      notes: p.notes || "",
    });
    setShowPartnerModal(true);
  };

  const handleSavePartner = async () => {
    if (!partnerForm.full_name) return;
    setSavingPartner(true);
    const payload = {
      ...partnerForm,
      equity_percent: parseFloat(partnerForm.equity_percent) || 0,
    };
    if (editingPartner?.id) {
      await base44.entities.Partner.update(editingPartner.id, payload);
    } else {
      await base44.entities.Partner.create(payload);
    }
    setSavingPartner(false);
    setShowPartnerModal(false);
    load();
  };

  const handleDeletePartner = async (id) => {
    if (!confirm("¿Eliminar este socio?")) return;
    await base44.entities.Partner.delete(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Documentación de la Empresa</h1>
              <p className="text-xs text-slate-500">Archivos, contratos y datos societarios de Byte Sur</p>
            </div>
          </div>
          <button
            onClick={activeTab === "documentos" ? openNewDoc : openNewPartner}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800">
            <Plus className="w-4 h-4" />
            {activeTab === "documentos" ? "Agregar Documento" : "Agregar Socio"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setActiveTab("documentos")}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === "documentos" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"}`}>
            <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Documentos ({docs.length})</span>
          </button>
          <button onClick={() => setActiveTab("socios")}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === "socios" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-gray-200 hover:border-slate-400"}`}>
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Socios ({partners.length})</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ========== TAB DOCUMENTOS ========== */}
        {activeTab === "documentos" && (
          <>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar documentos..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="todas">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-slate-500 font-medium">No hay documentos cargados aún</p>
                <button onClick={openNewDoc} className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 mx-auto">
                  <Plus className="w-4 h-4" /> Agregar Documento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDocs.map(doc => (
                  <div key={doc.id} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${doc.is_important ? "border-amber-200" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          {fileIcon(doc.file_type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {doc.is_important && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 fill-amber-400" />}
                            <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
                          </div>
                          {doc.category && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[doc.category] || CAT_COLORS["Otro"]}`}>
                              {doc.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => openEditDoc(doc)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{doc.description}</p>
                    )}

                    {doc.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {doc.tags.split(",").map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag.trim()}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">
                        {doc.created_date ? format(new Date(doc.created_date), "dd/MM/yyyy") : ""}
                      </p>
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                          <ExternalLink className="w-3 h-3" />
                          {doc.file_name ? doc.file_name.substring(0, 20) + (doc.file_name.length > 20 ? "..." : "") : "Abrir archivo"}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Sin archivo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== TAB SOCIOS ========== */}
        {activeTab === "socios" && (
          <>
            {partners.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-slate-500 font-medium">No hay socios registrados</p>
                <button onClick={openNewPartner} className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 mx-auto">
                  <Plus className="w-4 h-4" /> Agregar Socio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {partners.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                          {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">{p.full_name}</p>
                          {p.role && <p className="text-sm text-slate-500">{p.role}</p>}
                          {p.equity_percent > 0 && (
                            <span className="inline-block mt-1 text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                              {p.equity_percent}% participación
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditPartner(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeletePartner(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {p.rut && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">RUT</span>
                          <span className="text-slate-700 font-mono">{p.rut}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">Email</span>
                          <span className="text-slate-700 truncate">{p.email}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">Teléfono</span>
                          <span className="text-slate-700">{p.phone}</span>
                        </div>
                      )}
                      {p.address && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-20 flex-shrink-0">Dirección</span>
                          <span className="text-slate-700 truncate">{p.address}</span>
                        </div>
                      )}
                      {p.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                          <p className="text-xs text-slate-500">{p.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== MODAL DOCUMENTO ========== */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-900">{editingDoc ? "Editar Documento" : "Nuevo Documento"}</h2>
              <button onClick={() => setShowDocModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Título *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Escritura de constitución, Contrato arriendo oficina..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Descripción</label>
                <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="¿De qué trata este documento?..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Categoría</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Etiquetas</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={docForm.tags} onChange={e => setDocForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="SII, contrato, 2024..." />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={docForm.is_important}
                  onChange={e => setDocForm(f => ({ ...f, is_important: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300" />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> Marcar como importante
                </span>
              </label>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Archivo (PDF, Excel, Word)</label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-gray-50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-sm text-slate-500">
                    {selectedFile ? selectedFile.name : (editingDoc?.file_name ? `Archivo actual: ${editingDoc.file_name}` : "Haz clic para subir archivo")}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">PDF, XLSX, DOCX</span>
                  <input type="file" accept=".pdf,.xlsx,.xls,.docx,.doc" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowDocModal(false)} className="px-4 py-2 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSaveDoc} disabled={savingDoc || uploading || !docForm.title}
                className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
                {uploading ? "Subiendo archivo..." : savingDoc ? "Guardando..." : editingDoc ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL SOCIO ========== */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-slate-900">{editingPartner ? "Editar Socio" : "Nuevo Socio"}</h2>
              <button onClick={() => setShowPartnerModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nombre completo *</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.full_name} onChange={e => setPartnerForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Nombre y apellidos" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">RUT</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.rut} onChange={e => setPartnerForm(f => ({ ...f, rut: e.target.value }))}
                    placeholder="12.345.678-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">% Participación</label>
                  <input type="number" min="0" max="100" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.equity_percent} onChange={e => setPartnerForm(f => ({ ...f, equity_percent: e.target.value }))}
                    placeholder="50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Cargo / Rol</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.role} onChange={e => setPartnerForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="Ej: Gerente General, Director Técnico..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Email</label>
                  <input type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="socio@empresa.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Teléfono</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.phone} onChange={e => setPartnerForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Dirección</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={partnerForm.address} onChange={e => setPartnerForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Calle 123, Ciudad" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notas</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                    value={partnerForm.notes} onChange={e => setPartnerForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Información adicional..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowPartnerModal(false)} className="px-4 py-2 text-sm text-slate-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSavePartner} disabled={savingPartner || !partnerForm.full_name}
                className="px-4 py-2 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50">
                {savingPartner ? "Guardando..." : editingPartner ? "Actualizar" : "Guardar Socio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}