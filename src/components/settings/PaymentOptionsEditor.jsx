import { useState } from "react";
import { Plus, Trash2, CreditCard, ChevronDown, ChevronUp } from "lucide-react";

const emptyOption = {
  label: "",
  titular: "",
  rut: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  email_confirmacion: "",
};

export default function PaymentOptionsEditor({ options = [], onChange }) {
  const [expanded, setExpanded] = useState(null);

  const add = () => {
    const newOptions = [...options, { ...emptyOption, label: `Opción ${options.length + 1}` }];
    onChange(newOptions);
    setExpanded(newOptions.length - 1);
  };

  const remove = (idx) => {
    const newOptions = options.filter((_, i) => i !== idx);
    onChange(newOptions);
    if (expanded === idx) setExpanded(null);
  };

  const update = (idx, field, val) => {
    const newOptions = options.map((opt, i) => i === idx ? { ...opt, [field]: val } : opt);
    onChange(newOptions);
  };

  const fields = [
    { key: "titular", label: "Titular" },
    { key: "rut", label: "RUT" },
    { key: "banco", label: "Banco" },
    { key: "tipo_cuenta", label: "Tipo de cuenta" },
    { key: "numero_cuenta", label: "N° de cuenta" },
    { key: "email_confirmacion", label: "Email de confirmación" },
  ];

  return (
    <div>
      <div className="space-y-3">
        {options.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
            Sin opciones de pago. Agrega al menos una.
          </p>
        )}
        {options.map((opt, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-800">
                  {opt.label || `Opción ${idx + 1}`}
                </span>
                {opt.banco && <span className="text-xs text-slate-400">· {opt.banco}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(idx); }}
                  className="p-1 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {expanded === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expanded === idx && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Nombre de la opción *</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={opt.label || ""}
                    onChange={e => update(idx, "label", e.target.value)}
                    placeholder="Ej: Transferencia BCI, Cuenta Empresa..."
                  />
                </div>
                {fields.map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={opt[key] || ""}
                      onChange={e => update(idx, key, e.target.value)}
                      placeholder={label}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {options.length < 5 && (
        <button
          type="button"
          onClick={add}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 border border-dashed border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 w-full justify-center transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar opción de pago
        </button>
      )}
    </div>
  );
}