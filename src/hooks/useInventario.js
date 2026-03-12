import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { appendLog } from './useActivityLog';

export function useInventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchProductos = useCallback(async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setProductos(data.map(mapProducto));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProductos();

    const channel = supabase
      .channel('productos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        fetchProductos();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProductos]);

  const agregarProducto = async (datos) => {
    const row = {
      nombre:            datos.nombre,
      categoria:         datos.categoria || null,
      descripcion:       datos.descripcion || null,
      precio:            datos.precio,
      moneda:            datos.moneda || 'USD',
      stock:             datos.stock ?? 0,
      umbral_minimo:     datos.umbralMinimo ?? 0,
      estado:            datos.estado || 'activo',
      historial_precios: datos.historialPrecios || [],
    };
    const { data, error } = await supabase.from('productos').insert(row).select().single();
    if (error) { console.error('Error agregando producto:', error); return null; }
    appendLog(`Creó producto "${datos.nombre}"`, 'Inventario', `Precio: ${datos.precio} ${datos.moneda}`);
    const nuevo = mapProducto(data);
    setProductos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const editarProducto = async (id, datos) => {
    const oldProd = productos.find((p) => p.id === id);
    const row = {};
    if (datos.nombre !== undefined)       row.nombre = datos.nombre;
    if (datos.categoria !== undefined)    row.categoria = datos.categoria;
    if (datos.descripcion !== undefined)  row.descripcion = datos.descripcion;
    if (datos.precio !== undefined)       row.precio = datos.precio;
    if (datos.moneda !== undefined)       row.moneda = datos.moneda;
    if (datos.stock !== undefined)        row.stock = datos.stock;
    if (datos.umbralMinimo !== undefined) row.umbral_minimo = datos.umbralMinimo;
    if (datos.estado !== undefined)       row.estado = datos.estado;

    if (datos.precio !== undefined && oldProd && datos.precio !== oldProd.precio) {
      const entrada = {
        fecha: new Date().toISOString().split('T')[0],
        precioAnterior: oldProd.precio,
        precioNuevo: datos.precio,
        moneda: datos.moneda ?? oldProd.moneda,
        usuario: 'Sistema',
      };
      row.historial_precios = [...(oldProd.historialPrecios ?? []), entrada];
      appendLog(`Cambió precio de "${oldProd.nombre}"`, 'Inventario', `${oldProd.precio} → ${datos.precio} ${entrada.moneda}`);
    } else if (datos.nombre || datos.stock !== undefined) {
      if (oldProd) appendLog(`Editó producto "${oldProd.nombre}"`, 'Inventario');
    }

    if (datos.historialPrecios !== undefined && !row.historial_precios) {
      row.historial_precios = datos.historialPrecios;
    }

    const { error } = await supabase.from('productos').update(row).eq('id', id);
    if (error) { console.error('Error editando producto:', error); return; }

    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...datos } : p))
    );
  };

  const eliminarProducto = async (id) => {
    const p = productos.find((x) => x.id === id);
    if (p) appendLog(`Eliminó producto "${p.nombre}"`, 'Inventario');
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) { console.error('Error eliminando producto:', error); return; }
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  return { productos, loading, agregarProducto, editarProducto, eliminarProducto, refetch: fetchProductos };
}

function mapProducto(row) {
  return {
    id:               row.id,
    nombre:           row.nombre,
    categoria:        row.categoria,
    descripcion:      row.descripcion,
    precio:           Number(row.precio),
    moneda:           row.moneda,
    stock:            row.stock,
    umbralMinimo:     row.umbral_minimo,
    estado:           row.estado,
    historialPrecios: row.historial_precios || [],
    fechaCreacion:    row.created_at,
  };
}
