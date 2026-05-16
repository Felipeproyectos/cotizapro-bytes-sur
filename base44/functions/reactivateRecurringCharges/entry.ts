import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Buscar cobros pagados donde la next_billing_date ya llegó (deben reactivarse)
    const charges = await base44.asServiceRole.entities.RecurringCharge.filter({ active: true, status: "pagado" });

    const toReactivate = charges.filter(c => c.next_billing_date && c.next_billing_date <= todayStr);

    let reactivated = 0;
    for (const charge of toReactivate) {
      await base44.asServiceRole.entities.RecurringCharge.update(charge.id, {
        status: "pendiente",
        paid_date: null,
      });
      reactivated++;
    }

    return Response.json({ success: true, reactivated, checked: charges.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});