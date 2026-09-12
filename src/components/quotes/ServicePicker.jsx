import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";

const CATEGORY_COLORS = {
  Redes: "bg-blue-100 text-blue-700 border-blue-200",
  Software: "bg-violet-100 text-violet-700 border-violet-200",
  Hardware: "bg-amber-100 text-amber-700 border-amber-200",
  Soporte: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Seguridad: "bg-red-100 text-red-700 border-red-200",
  Infraestructura: "bg-slate-100 text-slate-700 border-slate-200",
  "Consultoría": "bg-pink-100 text-pink-700 border-pink-200",
  Producto: "bg-orange-100 text-orange-700 border-orange-200",
  Otro: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function ServicePicker({ services, value, onChange, placeholder = "Seleccionar servicio" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const ref = useRef(null);
  const selected = services.find(s => s.id === value);

  const categories = ["Todas", ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  const filtered = services.filter(s => {
    const matchCat = category === "Todas" || s.category === category;
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (svc) => {
    onChange(svc.id);
    setOpen(false);
    setSearch("");
    setCategory("Todas");
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none flex items-center justify-between gap-2 transition-colors ${open ? "border-slate-900 ring-2 ring-slate-900/10" : "border-gray-200 hover:border-gray-300"}`}
      >
        <span className={`truncate text-left ${selected ? "text-slate-900 font-medium" : "text-slate-400"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="text-slate-300 hover:text-red-400 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar servicio..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 2 && (
            <div className="flex gap-1.5 p-2 border-b border-gray-100 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${category === cat ? (CATEGORY_COLORS[cat] || "bg-slate-900 text-white border-slate-900") : "bg-white text-slate-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-4 text-center">No se encontraron servicios</p>
            ) : (
              filtered.map(svc => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => select(svc)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-2 transition-colors ${value === svc.id ? "bg-slate-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{svc.name}</p>
                      {svc.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${CATEGORY_COLORS[svc.category] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {svc.category}
                        </span>
                      )}
                    </div>
                    {svc.description && <p className="text-xs text-slate-400 truncate mt-0.5">{svc.description}</p>}
                    {svc.default_price > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">${svc.default_price.toLocaleString("es-CL")} · {svc.unit || "unidad"}</p>
                    )}
                  </div>
                  {value === svc.id && <Check className="w-4 h-4 text-slate-900 mt-0.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}