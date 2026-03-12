import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const ESTADOS_SERVICIO = [
  { id: 'pendiente',   label: 'Pendiente',    color: 'bg-amber-100 text-amber-700' },
  { id: 'en_proceso',  label: 'En proceso',   color: 'bg-blue-100 text-blue-700' },
  { id: 'listo',       label: 'Listo',        color: 'bg-emerald-100 text-emerald-700' },
  { id: 'entregado',   label: 'Entregado',    color: 'bg-slate-100 text-slate-600' },
];

export function useServicioTecnico() {
  const [ordenes, setOrdenes]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchOrdenes = useCallback(async () => {
    const { data, error } = await supabase
      .from('servicio_tecnico')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setOrdenes(data.map(mapOrden));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrdenes();

    const channel = supabase
      .channel('servicio-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicio_tecnico' }, () => {
        fetchOrdenes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrdenes]);

  const agregarOrden = async (datos) => {
    const row = {
      cliente_nombre:         datos.clienteNombre,
      cliente_telefono:       datos.clienteTelefono || null,
      ebike:                  datos.ebike || null,
      problema_reportado:     datos.problemaReportado || null,
      diagnostico:            datos.diagnostico || null,
      costo:                  datos.costo ?? 0,
      moneda:                 datos.moneda || 'USD',
      estado:                 datos.estado || 'pendiente',
      fecha_ingreso:          datos.fechaIngreso || new Date().toISOString().split('T')[0],
      fecha_estimada_entrega: datos.fechaEstimadaEntrega || null,
      notas:                  datos.notas || null,
    };
    const { data, error } = await supabase.from('servicio_tecnico').insert(row).select().single();
    if (error) { console.error('Error agregando orden:', error); return null; }
    const nueva = mapOrden(data);
    setOrdenes((prev) => [nueva, ...prev]);
    return nueva;
  };

  const editarOrden = async (id, datos) => {
    const row = {};
    if (datos.clienteNombre !== undefined)        row.cliente_nombre = datos.clienteNombre;
    if (datos.clienteTelefono !== undefined)       row.cliente_telefono = datos.clienteTelefono;
    if (datos.ebike !== undefined)                 row.ebike = datos.ebike;
    if (datos.problemaReportado !== undefined)     row.problema_reportado = datos.problemaReportado;
    if (datos.diagnostico !== undefined)           row.diagnostico = datos.diagnostico;
    if (datos.costo !== undefined)                 row.costo = datos.costo;
    if (datos.moneda !== undefined)                row.moneda = datos.moneda;
    if (datos.estado !== undefined)                row.estado = datos.estado;
    if (datos.fechaIngreso !== undefined)          row.fecha_ingreso = datos.fechaIngreso;
    if (datos.fechaEstimadaEntrega !== undefined)  row.fecha_estimada_entrega = datos.fechaEstimadaEntrega;
    if (datos.notas !== undefined)                 row.notas = datos.notas;

    const { error } = await supabase.from('servicio_tecnico').update(row).eq('id', id);
    if (error) { console.error('Error editando orden:', error); return; }
    setOrdenes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...datos } : o))
    );
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('servicio_tecnico').update({ estado: nuevoEstado }).eq('id', id);
    if (error) { console.error('Error cambiando estado:', error); return; }
    setOrdenes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado: nuevoEstado } : o))
    );
  };

  const eliminarOrden = async (id) => {
    const { error } = await supabase.from('servicio_tecnico').delete().eq('id', id);
    if (error) { console.error('Error eliminando orden:', error); return; }
    setOrdenes((prev) => prev.filter((o) => o.id !== id));
  };

  return { ordenes, loading, agregarOrden, editarOrden, cambiarEstado, eliminarOrden, refetch: fetchOrdenes };
}

function mapOrden(row) {
  return {
    id:                    row.id,
    clienteNombre:         row.cliente_nombre,
    clienteTelefono:       row.cliente_telefono,
    ebike:                 row.ebike,
    problemaReportado:     row.problema_reportado,
    diagnostico:           row.diagnostico,
    costo:                 Number(row.costo),
    moneda:                row.moneda,
    estado:                row.estado,
    fechaIngreso:          row.fecha_ingreso,
    fechaEstimadaEntrega:  row.fecha_estimada_entrega,
    notas:                 row.notas,
  };
}
