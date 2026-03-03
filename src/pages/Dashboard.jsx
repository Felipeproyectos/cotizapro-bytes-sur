import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, TrendingUp, CheckCircle, Clock, XCircle, Plus, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS = {
  Borrador: "#94a3b8",
  Enviada: "#3b82f6",
  Aceptada: "#10b981",
  Rechazada: "#ef4444",
  Ejecutada: "#8b5cf6",
};

const CHART_COLORS = ["#0f172a", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Quote.list("-created_date", 200).then(data => {
      setQuotes(data);
      setLoading(false);
    });
  }, []);

  const totalRevenue = quotes
    .filter(q => q.status === "Ejecutada" || q.status === "Aceptada")
    .reduce((sum, q) => sum + (q.total || 0), 0);

  const statusCounts = quotes.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Monthly revenue last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthQuotes = quotes.filter(q => {
      const d = new Date(q.created_date);
      return d >= start && d <= end && (q.status === "Ejecutada" || q.status === "Aceptada");
    });
    return {
      month: format(date, "MMM", { locale: es }),
      total: monthQuotes.reduce((sum, q) => sum + (q.total || 0), 0),
    };
  });

  const recentQuotes = quotes.slice(0, 5);

  const formatCLP = (n) => `$${(n || 0).toLocaleString("es-CL")}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Resumen de tu negocio</p>
          </div>
          <Link
            to={createPageUrl("Quotes") + "?new=1"}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Cotizaciones" value={quotes.length} subtitle="Todas las cotizaciones" icon={FileText} color="bg-slate-900" />
          <StatCard title="Ejecutadas" value={statusCounts["Ejecutada"] || 0} subtitle="Trabajos completados" icon={CheckCircle} color="bg-emerald-500" />
          <StatCard title="Pendientes" value={(statusCounts["Enviada"] || 0) + (statusCounts["Borrador"] || 0)} subtitle="En espera" icon={Clock} color="bg-blue-500" />
          <StatCard title="Ingresos (Ejec.)" value={formatCLP(totalRevenue)} subtitle="Cotizaciones aceptadas/ejecutadas" icon={TrendingUp} color="bg-violet-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Ingresos últimos 6 meses</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCLP(v)} labelStyle={{ color: "#0f172a", fontWeight: 600 }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Estado de cotizaciones</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[entry.name] || CHART_COLORS[i] }} />
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent quotes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Cotizaciones recientes</h2>
            <Link to={createPageUrl("Quotes")} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentQuotes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No hay cotizaciones aún</p>
            )}
            {recentQuotes.map(q => (
              <div key={q.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{q.client_name}</p>
                  <p className="text-xs text-slate-400">{q.quote_number} · {format(new Date(q.created_date), "dd MMM yyyy", { locale: es })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{formatCLP(q.total)}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: STATUS_COLORS[q.status] + "20", color: STATUS_COLORS[q.status] }}>
                    {q.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}