import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ebike_inventario';

const productosDemo = [
  {
    id: '1',
    nombre: 'E-Bike Mountain Pro 29"',
    categoria: 'Bicicletas',
    descripcion: 'Bicicleta eléctrica para montaña con motor 500W y batería 48V',
    precio: 1299.99,
    stock: 5,
    umbralMinimo: 2,
    estado: 'activo',
    fechaCreacion: new Date('2025-01-15').toISOString(),
  },
  {
    id: '2',
    nombre: 'Motor Bafang BBS02 750W',
    categoria: 'Motores',
    descripcion: 'Motor central de alto rendimiento para conversiones e-bike',
    precio: 489.99,
    stock: 8,
    umbralMinimo: 3,
    estado: 'activo',
    fechaCreacion: new Date('2025-01-20').toISOString(),
  },
  {
    id: '3',
    nombre: 'Batería Litio 48V 15Ah',
    categoria: 'Baterías',
    descripcion: 'Batería de alta capacidad, celdas Samsung 18650',
    precio: 349.99,
    stock: 2,
    umbralMinimo: 3,
    estado: 'activo',
    fechaCreacion: new Date('2025-02-01').toISOString(),
  },
  {
    id: '4',
    nombre: 'Casco Urbano Talla M Negro',
    categoria: 'Accesorios',
    descripcion: 'Casco homologado CE para ciclismo urbano',
    precio: 59.99,
    stock: 15,
    umbralMinimo: 5,
    estado: 'activo',
    fechaCreacion: new Date('2025-02-10').toISOString(),
  },
  {
    id: '5',
    nombre: 'Kit Luces LED Recargables',
    categoria: 'Accesorios',
    descripcion: 'Set delantera 800lm y trasera intermitente, carga USB-C',
    precio: 34.99,
    stock: 20,
    umbralMinimo: 8,
    estado: 'activo',
    fechaCreacion: new Date('2025-02-15').toISOString(),
  },
  {
    id: '6',
    nombre: 'Controlador Sinusoidal 48V 25A',
    categoria: 'Repuestos',
    descripcion: 'Controlador para motores de rueda trasera, silencioso',
    precio: 79.99,
    stock: 1,
    umbralMinimo: 2,
    estado: 'activo',
    fechaCreacion: new Date('2025-03-01').toISOString(),
  },
];

export function useInventario() {
  const [productos, setProductos] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    return productosDemo;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
  }, [productos]);

  const agregarProducto = (datos) => {
    const nuevo = {
      ...datos,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
    };
    setProductos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const editarProducto = (id, datos) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...datos } : p))
    );
  };

  const eliminarProducto = (id) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  return { productos, agregarProducto, editarProducto, eliminarProducto };
}
