import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Building2, Upload, ImageIcon, Trash2, AlertTriangle } from "lucide-react";

export default function Settings() {
  const [form, setForm] = useState({
    company_name: "",
    rut: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logo_url: "",
    quote_notes_default: "",
    quote_validity_days: 30,
  });
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data && data.length > 0) {
        setForm({ ...form, ...data[0] });
        setSettingsId(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      await base44.entities.CompanySettings.update(settingsId, form);
    } else {
      const created = await base44.entities.CompanySettings.create(form);
      setSettingsId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setField = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setField("logo_url", file_url);
    setUploadingLogo(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500 mt-1">Datos de tu empresa para las cotizaciones</p>
        </div>

        <div className="space-y-5">
          {/* Logo upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Logo de la Empresa</h2>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div>
                <label className="cursor-pointer flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? "Subiendo..." : "Subir Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
                {form.logo_url && (
                  <button onClick={() => setField("logo_url", "")} className="mt-2 text-xs text-red-400 hover:text-red-600 block">
                    Eliminar logo
                  </button>
                )}
                <p className="text-xs text-slate-400 mt-2">PNG, JPG recomendado. Aparecerá en tus cotizaciones PDF.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Datos de la Empresa</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Nombre de la empresa *", field: "company_name", placeholder: "Mi Empresa SpA" },
                { label: "RUT", field: "rut", placeholder: "76.123.456-7" },
                { label: "Dirección", field: "address", placeholder: "Av. Principal 123, Santiago" },
                { label: "Teléfono", field: "phone", placeholder: "+56 2 1234 5678" },
                { label: "Email", field: "email", placeholder: "contacto@empresa.cl" },
                { label: "Sitio web", field: "website", placeholder: "www.empresa.cl" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={form[field] || ""}
                    onChange={e => setField(field, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Configuración de Cotizaciones</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Días de validez por defecto</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  value={form.quote_validity_days || 30}
                  onChange={e => setField("quote_validity_days", parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Notas por defecto en cotizaciones</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  rows={4}
                  value={form.quote_notes_default || ""}
                  onChange={e => setField("quote_notes_default", e.target.value)}
                  placeholder="Condiciones generales de pago, garantía, etc."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.company_name}
              className={`select-none flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                saved ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
              } disabled:opacity-50`}
            >
              <Check className="w-4 h-4" />
              {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar Configuración"}
            </button>
          </div>

          {/* Delete Account */}
          <div className="bg-white rounded-2xl border border-red-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-600">Zona de Peligro</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Eliminar tu cuenta borrará permanentemente todos tus datos, cotizaciones y configuraciones. Esta acción no se puede deshacer.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="select-none flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar cuenta
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-red-700">¿Estás seguro? Esta acción es irreversible.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="select-none flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setDeletingAccount(true);
                      await base44.auth.logout();
                    }}
                    disabled={deletingAccount}
                    className="select-none flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingAccount ? "Eliminando..." : "Sí, eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}