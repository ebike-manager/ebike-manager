import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function usePagosVenta() {
  const [planes, setPlanes]   = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPlanes = useCallback(async () => {
    const { data, error } = await supabase
      .from('pagos_plan')
      .select('*, pagos_cuota(*)');
    if (!error && data) {
      const mapped = {};
      data.forEach((plan) => {
        const cuotas = (plan.pagos_cuota || [])
          .sort((a, b) => a.numero_cuota - b.numero_cuota)
          .map((c) => ({
            numeroCuota:      c.numero_cuota,
            fechaVencimiento: c.fecha_vencimiento,
            monto:            Number(c.monto),
            pagado:           c.pagado,
            fechaPago:        c.fecha_pago,
            id:               c.id,
          }));
        mapped[plan.venta_id] = {
          planId:         plan.id,
          totalCuotas:    plan.total_cuotas,
          montoPorCuota:  Number(plan.monto_por_cuota),
          moneda:         plan.moneda,
          fechaInicio:    plan.fecha_inicio,
          pagos:          cuotas,
        };
      });
      setPlanes(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlanes();

    const channel = supabase
      .channel('pagos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_plan' }, () => {
        fetchPlanes();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_cuota' }, () => {
        fetchPlanes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPlanes]);

  const crearPlan = async (ventaId, { total, nCuotas, moneda, fechaInicio }) => {
    const montoPorCuota = Math.round((total / nCuotas) * 100) / 100;

    // Insert plan
    const { data: planData, error: planErr } = await supabase.from('pagos_plan').insert({
      venta_id:        ventaId,
      total_cuotas:    nCuotas,
      monto_por_cuota: montoPorCuota,
      moneda,
      fecha_inicio:    fechaInicio,
    }).select().single();
    if (planErr) { console.error('Error creando plan:', planErr); return null; }

    // Insert cuotas
    const cuotasRows = [];
    for (let i = 1; i <= nCuotas; i++) {
      const fecha = new Date(fechaInicio + 'T00:00:00');
      fecha.setMonth(fecha.getMonth() + i);
      cuotasRows.push({
        plan_id:           planData.id,
        numero_cuota:      i,
        fecha_vencimiento: fecha.toISOString().split('T')[0],
        monto:             i === nCuotas ? Math.round((total - montoPorCuota * (nCuotas - 1)) * 100) / 100 : montoPorCuota,
        pagado:            false,
      });
    }
    const { error: cuotaErr } = await supabase.from('pagos_cuota').insert(cuotasRows);
    if (cuotaErr) console.error('Error insertando cuotas:', cuotaErr);

    await fetchPlanes();
    return planes[ventaId];
  };

  const marcarPago = async (ventaId, numeroCuota) => {
    const plan = planes[ventaId];
    if (!plan) return;
    const cuota = plan.pagos.find((p) => p.numeroCuota === numeroCuota);
    if (!cuota) return;

    const nuevoPagado = !cuota.pagado;
    const { error } = await supabase.from('pagos_cuota').update({
      pagado:     nuevoPagado,
      fecha_pago: nuevoPagado ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', cuota.id);
    if (error) { console.error('Error marcando pago:', error); return; }

    // Update local state
    setPlanes((prev) => {
      const p = { ...prev[ventaId] };
      p.pagos = p.pagos.map((c) =>
        c.numeroCuota === numeroCuota
          ? { ...c, pagado: nuevoPagado, fechaPago: nuevoPagado ? new Date().toISOString().split('T')[0] : null }
          : c
      );
      return { ...prev, [ventaId]: p };
    });
  };

  const eliminarPlan = async (ventaId) => {
    const plan = planes[ventaId];
    if (!plan) return;
    // Cuotas se borran en cascada
    const { error } = await supabase.from('pagos_plan').delete().eq('id', plan.planId);
    if (error) { console.error('Error eliminando plan:', error); return; }
    setPlanes((prev) => {
      const next = { ...prev };
      delete next[ventaId];
      return next;
    });
  };

  const getPlan = (ventaId) => planes[ventaId] ?? null;

  const tieneCuotaVencida = (ventaId) => {
    const plan = planes[ventaId];
    if (!plan) return false;
    const hoy = new Date().toISOString().split('T')[0];
    return plan.pagos.some((p) => !p.pagado && p.fechaVencimiento < hoy);
  };

  const cuotasVencidas = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const result = [];
    Object.entries(planes).forEach(([ventaId, plan]) => {
      plan.pagos.forEach((p) => {
        if (!p.pagado && p.fechaVencimiento < hoy) {
          result.push({ ventaId, ...p, moneda: plan.moneda });
        }
      });
    });
    return result;
  };

  return { planes, loading, crearPlan, marcarPago, eliminarPlan, getPlan, tieneCuotaVencida, cuotasVencidas, refetch: fetchPlanes };
}
