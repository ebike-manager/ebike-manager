import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Compute estado from fechaVencimiento
export function getEstadoGarantia(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + 'T00:00:00');
  const diffDias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencida';
  if (diffDias <= 30) return 'por_vencer';
  return 'activa';
}

export function diasRestantes(fechaVencimiento) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + 'T00:00:00');
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function useGarantias() {
  const [garantias, setGarantias] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchGarantias = useCallback(async () => {
    const { data, error } = await supabase
      .from('garantias')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setGarantias(data.map(mapGarantia));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGarantias();

    const channel = supabase
      .channel('garantias-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'garantias' }, () => {
        fetchGarantias();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchGarantias]);

  // Enrich each garantia with computed estado
  const garantiasConEstado = garantias.map((g) => ({
    ...g,
    estado: getEstadoGarantia(g.fechaVencimiento),
    diasRestantes: diasRestantes(g.fechaVencimiento),
  }));

  const agregarGarantia = async (datos) => {
    const { fechaCompra, duracionMeses } = datos;
    const fechaVencimiento = addMonths(fechaCompra, Number(duracionMeses));
    const row = {
      venta_id:          datos.ventaId || null,
      cliente_nombre:    datos.clienteNombre,
      producto_nombre:   datos.productoNombre,
      fecha_compra:      fechaCompra,
      duracion_meses:    Number(duracionMeses),
      fecha_vencimiento: fechaVencimiento,
      notas:             datos.notas || null,
    };
    const { data, error } = await supabase.from('garantias').insert(row).select().single();
    if (error) { console.error('Error agregando garantía:', error); return null; }
    const nueva = mapGarantia(data);
    setGarantias((prev) => [nueva, ...prev]);
    return nueva;
  };

  const editarGarantia = async (id, datos) => {
    const row = {};
    if (datos.clienteNombre !== undefined)  row.cliente_nombre = datos.clienteNombre;
    if (datos.productoNombre !== undefined) row.producto_nombre = datos.productoNombre;
    if (datos.fechaCompra !== undefined)    row.fecha_compra = datos.fechaCompra;
    if (datos.duracionMeses !== undefined)  row.duracion_meses = Number(datos.duracionMeses);
    if (datos.notas !== undefined)          row.notas = datos.notas;
    if (datos.ventaId !== undefined)        row.venta_id = datos.ventaId;

    // Recalculate fechaVencimiento
    const existing = garantias.find((g) => g.id === id);
    const fc = datos.fechaCompra ?? existing?.fechaCompra;
    const dm = datos.duracionMeses ?? existing?.duracionMeses;
    if (fc && dm) row.fecha_vencimiento = addMonths(fc, Number(dm));

    const { error } = await supabase.from('garantias').update(row).eq('id', id);
    if (error) { console.error('Error editando garantía:', error); return; }

    setGarantias((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, ...datos };
        updated.fechaVencimiento = addMonths(updated.fechaCompra, Number(updated.duracionMeses));
        return updated;
      })
    );
  };

  const eliminarGarantia = async (id) => {
    const { error } = await supabase.from('garantias').delete().eq('id', id);
    if (error) { console.error('Error eliminando garantía:', error); return; }
    setGarantias((prev) => prev.filter((g) => g.id !== id));
  };

  return { garantias: garantiasConEstado, loading, agregarGarantia, editarGarantia, eliminarGarantia, refetch: fetchGarantias };
}

function mapGarantia(row) {
  return {
    id:               row.id,
    ventaId:          row.venta_id,
    clienteNombre:    row.cliente_nombre,
    productoNombre:   row.producto_nombre,
    fechaCompra:      row.fecha_compra,
    duracionMeses:    row.duracion_meses,
    fechaVencimiento: row.fecha_vencimiento,
    notas:            row.notas,
  };
}
