import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useVentas() {
  const [ventas, setVentas]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVentas = useCallback(async () => {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, venta_items(*)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setVentas(data.map(mapVenta));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVentas();

    const channel = supabase
      .channel('ventas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
        fetchVentas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venta_items' }, () => {
        fetchVentas();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchVentas]);

  const agregarVenta = async (datos) => {
    // Insert venta
    const ventaRow = {
      fecha:          datos.fecha || new Date().toISOString().split('T')[0],
      cliente_id:     datos.clienteId || null,
      cliente_nombre: datos.clienteNombre || null,
      total:          datos.total ?? 0,
      estado:         datos.estado || 'completada',
      notas:          datos.notas || null,
    };
    const { data: ventaData, error: ventaErr } = await supabase
      .from('ventas').insert(ventaRow).select().single();
    if (ventaErr) { console.error('Error creando venta:', ventaErr); return null; }

    // Insert items
    if (datos.items && datos.items.length > 0) {
      const itemRows = datos.items.map((item) => ({
        venta_id:        ventaData.id,
        producto_id:     item.productoId || null,
        producto_nombre: item.productoNombre,
        cantidad:        item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal:        item.subtotal,
        moneda:          item.moneda || 'USD',
      }));
      const { error: itemErr } = await supabase.from('venta_items').insert(itemRows);
      if (itemErr) console.error('Error insertando items de venta:', itemErr);
    }

    // Refetch to get complete data
    await fetchVentas();
    return ventaData;
  };

  const eliminarVenta = async (id) => {
    // Items se borran en cascada
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    if (error) { console.error('Error eliminando venta:', error); return; }
    setVentas((prev) => prev.filter((v) => v.id !== id));
  };

  const editarVenta = async (id, datos) => {
    const row = {};
    if (datos.fecha !== undefined)          row.fecha = datos.fecha;
    if (datos.clienteId !== undefined)      row.cliente_id = datos.clienteId;
    if (datos.clienteNombre !== undefined)  row.cliente_nombre = datos.clienteNombre;
    if (datos.total !== undefined)          row.total = datos.total;
    if (datos.estado !== undefined)         row.estado = datos.estado;
    if (datos.notas !== undefined)          row.notas = datos.notas;

    const { error } = await supabase.from('ventas').update(row).eq('id', id);
    if (error) { console.error('Error editando venta:', error); return; }
    setVentas((prev) => prev.map((v) => (v.id === id ? { ...v, ...datos } : v)));
  };

  return { ventas, loading, agregarVenta, eliminarVenta, editarVenta, refetch: fetchVentas };
}

function mapVenta(row) {
  return {
    id:            row.id,
    fecha:         row.fecha,
    clienteId:     row.cliente_id,
    clienteNombre: row.cliente_nombre,
    items:         (row.venta_items || []).map((item) => ({
      productoId:     item.producto_id,
      productoNombre: item.producto_nombre,
      cantidad:       item.cantidad,
      precioUnitario: Number(item.precio_unitario),
      subtotal:       Number(item.subtotal),
      moneda:         item.moneda,
    })),
    total:  Number(row.total),
    estado: row.estado,
    notas:  row.notas,
  };
}
