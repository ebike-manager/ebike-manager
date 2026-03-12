import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchClientes = useCallback(async () => {
    // Fetch clients with their purchase history
    const { data, error } = await supabase
      .from('clientes')
      .select('*, historial_compras(*)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setClientes(data.map(mapCliente));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();

    const channel = supabase
      .channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
        fetchClientes();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_compras' }, () => {
        fetchClientes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchClientes]);

  const agregarCliente = async (datos) => {
    const row = {
      nombre:          datos.nombre,
      apellido:        datos.apellido || null,
      telefono:        datos.telefono || null,
      email:           datos.email || null,
      notas:           datos.notas || null,
      ebike_principal: datos.ebikePrincipal || null,
      fecha_registro:  new Date().toISOString().split('T')[0],
    };
    const { data, error } = await supabase.from('clientes').insert(row).select('*, historial_compras(*)').single();
    if (error) { console.error('Error agregando cliente:', error); return null; }
    const nuevo = mapCliente(data);
    setClientes((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const editarCliente = async (id, datos) => {
    const row = {};
    if (datos.nombre !== undefined)          row.nombre = datos.nombre;
    if (datos.apellido !== undefined)        row.apellido = datos.apellido;
    if (datos.telefono !== undefined)        row.telefono = datos.telefono;
    if (datos.email !== undefined)           row.email = datos.email;
    if (datos.notas !== undefined)           row.notas = datos.notas;
    if (datos.ebikePrincipal !== undefined)  row.ebike_principal = datos.ebikePrincipal;

    const { error } = await supabase.from('clientes').update(row).eq('id', id);
    if (error) { console.error('Error editando cliente:', error); return; }
    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...datos } : c))
    );
  };

  const eliminarCliente = async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) { console.error('Error eliminando cliente:', error); return; }
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  const agregarCompra = async (clienteId, compra) => {
    const row = {
      cliente_id:  clienteId,
      fecha:       compra.fecha,
      producto:    compra.producto,
      precio:      compra.precio,
      descripcion: compra.descripcion || null,
    };
    const { data, error } = await supabase.from('historial_compras').insert(row).select().single();
    if (error) { console.error('Error agregando compra:', error); return; }
    const nuevaCompra = {
      id:          data.id,
      fecha:       data.fecha,
      producto:    data.producto,
      precio:      Number(data.precio),
      descripcion: data.descripcion,
    };
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? { ...c, historialCompras: [nuevaCompra, ...c.historialCompras] }
          : c
      )
    );
  };

  const eliminarCompra = async (clienteId, compraId) => {
    const { error } = await supabase.from('historial_compras').delete().eq('id', compraId);
    if (error) { console.error('Error eliminando compra:', error); return; }
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? { ...c, historialCompras: c.historialCompras.filter((cp) => cp.id !== compraId) }
          : c
      )
    );
  };

  return { clientes, loading, agregarCliente, editarCliente, eliminarCliente, agregarCompra, eliminarCompra, refetch: fetchClientes };
}

function mapCliente(row) {
  return {
    id:               row.id,
    nombre:           row.nombre,
    apellido:         row.apellido,
    telefono:         row.telefono,
    email:            row.email,
    notas:            row.notas,
    ebikePrincipal:   row.ebike_principal,
    fechaRegistro:    row.fecha_registro,
    historialCompras: (row.historial_compras || []).map((hc) => ({
      id:          hc.id,
      fecha:       hc.fecha,
      producto:    hc.producto,
      precio:      Number(hc.precio),
      descripcion: hc.descripcion,
    })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
  };
}
