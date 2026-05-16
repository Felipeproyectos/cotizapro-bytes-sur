import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, AlertCircle, ArrowUpRight } from "lucide-react";
import { differenceInDays, isPast, isToday } from "date-fns";

export default function RecurringChargesAlert() {
  const [overdueCount, setOverdueCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.RecurringCharge.filter({ active: true, status: "pendiente" }).then(charges => {
      let overdue = 0;
      let upcoming = 0;
      let total = 0;
      for (const c of charges) {
        if (!c.next_billing_date) continue;
        const d = new Date(c.next_billing_date);
        if (isPast(d) || isToday(d)) {
          overdue++;
          total += c.amount || 0;
        } else if (differenceInDays(d, new Date()) <= 7) {
          upcoming++;
          total += c.amount || 0;
        }
      }
      setOverdueCount(overdue);
      setUpcomingCount(upcoming);
      setTotalPending(total);
      setLoading(false);
    });
  }, []);

  if (loading || (overdueCount === 0 && upcomingCount === 0)) return null;

  return (
    <div className={`rounded-2xl border p-5 mb-6 flex items-start gap-4 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${overdueCount > 0 ? "bg-red-100" : "bg-amber-100"}`}>
        {overdueCount > 0
          ? <AlertCircle className="w-5 h-5 text-red-600" />
          : <Bell className="w-5 h-5 text-amber-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
          {overdueCount > 0
            ? `${overdueCount} cobro${overdueCount !== 1 ? "s" : ""} mensual${overdueCount !== 1 ? "es" : ""} vencido${overdueCount !== 1 ? "s" : ""}`
            : `${upcomingCount} cobro${upcomingCount !== 1 ? "s" : ""} mensual${upcomingCount !== 1 ? "es" : ""} próximo${upcomingCount !== 1 ? "s" : ""} (esta semana)`
          }
        </p>
        <p className={`text-xs mt-0.5 ${overdueCount > 0 ? "text-red-600" : "text-amber-600"}`}>
          Monto pendiente: ${Math.round(totalPending).toLocaleString("es-CL")}
          {upcomingCount > 0 && overdueCount > 0 && ` · ${upcomingCount} más esta semana`}
        </p>
      </div>
      <Link
        to={createPageUrl("Quotes") + "?tab=mensualidades"}
        className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
          overdueCount > 0 ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
        }`}
      >
        Ver <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}