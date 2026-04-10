import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  FileText,
  BarChart3,
  Settings,
  Wrench,
  Menu,
  X,
  Wifi,
  ChevronRight } from
"lucide-react";

const navItems = [
{ name: "Dashboard", page: "Dashboard", icon: BarChart3 },
{ name: "Cotizaciones", page: "Quotes", icon: FileText },
{ name: "Historial", page: "History", icon: Wrench },
{ name: "Servicios", page: "Services", icon: Wifi },
{ name: "Configuración", page: "Settings", icon: Settings }];


export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then((data) => {
      if (data && data.length > 0) setCompany(data[0]);
    });
    // Suscribirse a cambios en tiempo real
    const unsub = base44.entities.CompanySettings.subscribe((event) => {
      if (event.data) setCompany(event.data);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
        .nav-link-active { background: #0f172a; color: white; }
        .nav-link-active svg { color: white; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 bottom-0 z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          {company?.logo_url ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-50 border border-gray-100 flex-shrink-0">
                <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight">{company.company_name}</p>
                {company.rut && <p className="text-xs text-slate-400 truncate font-mono">{company.rut}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{company?.company_name || "CotizaPro"}</p>
                <p className="text-xs text-slate-400">Panel de gestión</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map(({ name, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive ?
                "bg-slate-900 text-white" :
                "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`
                }>

                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                {name}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>);

          })}
        </nav>

        <div className="px-4 py-5 border-t border-gray-100">
          <p className="text-xs text-slate-400 text-center">© 2026 WWW.SOLUCIONESFML.CL</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {company?.logo_url ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 border border-gray-100">
              <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Wifi className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-semibold text-slate-900 text-sm">{company?.company_name || "CotizaPro"}</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-35 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl pt-20 px-3" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {navItems.map(({ name, page, icon: Icon }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`
                  }>

                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {name}
                  </Link>);

            })}
            </nav>
          </div>
        </div>
      }

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-0 md:pt-0">
        <div className="md:pt-0 pt-16">
          {children}
        </div>
      </main>
    </div>);

}