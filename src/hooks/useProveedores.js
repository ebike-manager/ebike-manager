import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);

  const fetchProveedores = useCallback(async () => {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setProveedores(data.map(mapProveedor));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProveedores();

    const channel = supabase
      .channel('proveedores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        fetchProveedores();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProveedores]);

  const agregarProveedor = async (datos) => {
    const row = {
      nombre:              datos.nombre,
      pais:                datos.pais || null,
      contacto:            datos.contacto || null,
      email:               datos.email || null,
      telefono:            datos.telefono || null,
      condiciones_pago:    datos.condicionesPago || null,
      tiempo_entrega_dias: datos.tiempoEntregaDias ?? null,
      notas:               datos.notas || null,
    };
    const { data, error } = await supabase.from('proveedores').insert(row).select().single();
    if (error) { console.error('Error agregando proveedor:', error); return null; }
    const nuevo = mapProveedor(data);
    setProveedores((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const editarProveedor = async (id, datos) => {
    const row = {};
    if (datos.nombre !== undefined)           row.nombre = datos.nombre;
    if (datos.pais !== undefined)             row.pais = datos.pais;
    if (datos.contacto !== undefined)         row.contacto = datos.contacto;
    if (datos.email !== undefined)            row.email = datos.email;
    if (datos.telefono !== undefined)         row.telefono = datos.telefono;
    if (datos.condicionesPago !== undefined)  row.condiciones_pago = datos.condicionesPago;
    if (datos.tiempoEntregaDias !== undefined) row.tiempo_entrega_dias = datos.tiempoEntregaDias;
    if (datos.notas !== undefined)            row.notas = datos.notas;

    const { error } = await supabase.from('proveedores').update(row).eq('id', id);
    if (error) { console.error('Error editando proveedor:', error); return; }
    setProveedores((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...datos } : p))
    );
  };

  const eliminarProveedor = async (id) => {
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    if (error) { console.error('Error eliminando proveedor:', error); return; }
    setProveedores((prev) => prev.filter((p) => p.id !== id));
  };

  return { proveedores, loading, agregarProveedor, editarProveedor, eliminarProveedor, refetch: fetchProveedores };
}

function mapProveedor(row) {
  return {
    id:               row.id,
    nombre:           row.nombre,
    pais:             row.pais,
    contacto:         row.contacto,
    email:            row.email,
    telefono:         row.telefono,
    condicionesPago:  row.condiciones_pago,
    tiempoEntregaDias: row.tiempo_entrega_dias,
    notas:            row.notas,
    fechaCreacion:    row.created_at,
  };
}
