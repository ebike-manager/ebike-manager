import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ebike_ventas';

const ventasDemo = [
  {
    id: 'v1',
    fecha: '2025-01-20',
    clienteId: '1',
    clienteNombre: 'Martín González',
    items: [
      { productoId: '1', productoNombre: 'E-Bike Mountain Pro 29"', cantidad: 1, precioUnitario: 1299.99, subtotal: 1299.99 },
    ],
    total: 1299.99,
    estado: 'completada',
    notas: '',
  },
  {
    id: 'v2',
    fecha: '2025-01-10',
    clienteId: '3',
    clienteNombre: 'Carlos Méndez',
    items: [
      { productoId: '2', productoNombre: 'Motor Bafang BBS02 750W', cantidad: 1, precioUnitario: 489.99, subtotal: 489.99 },
      { productoId: '3', productoNombre: 'Batería Litio 48V 15Ah', cantidad: 1, precioUnitario: 349.99, subtotal: 349.99 },
    ],
    total: 839.98,
    estado: 'completada',
    notas: 'Combo motor + batería',
  },
  {
    id: 'v3',
    fecha: '2025-02-05',
    clienteId: '2',
    clienteNombre: 'Laura Rodríguez',
    items: [
      { productoId: '1', productoNombre: 'E-Bike Mountain Pro 29"', cantidad: 1, precioUnitario: 999.99, subtotal: 999.99 },
    ],
    total: 999.99,
    estado: 'completada',
    notas: '',
  },
  {
    id: 'v4',
    fecha: '2025-02-15',
    clienteId: '1',
    clienteNombre: 'Martín González',
    items: [
      { productoId: '5', productoNombre: 'Kit Luces LED Recargables', cantidad: 1, precioUnitario: 34.99, subtotal: 34.99 },
      { productoId: '4', productoNombre: 'Casco Urbano Talla M Negro', cantidad: 1, precioUnitario: 59.99, subtotal: 59.99 },
    ],
    total: 94.98,
    estado: 'completada',
    notas: '',
  },
  {
    id: 'v5',
    fecha: '2025-03-01',
    clienteId: '3',
    clienteNombre: 'Carlos Méndez',
    items: [
      { productoId: '6', productoNombre: 'Controlador Sinusoidal 48V 25A', cantidad: 1, precioUnitario: 79.99, subtotal: 79.99 },
    ],
    total: 79.99,
    estado: 'completada',
    notas: 'Reemplazo',
  },
  {
    id: 'v6',
    fecha: '2026-03-01',
    clienteId: '4',
    clienteNombre: 'Sofía Peralta',
    items: [
      { productoId: '1', productoNombre: 'E-Bike Mountain Pro 29"', cantidad: 1, precioUnitario: 1299.99, subtotal: 1299.99 },
    ],
    total: 1299.99,
    estado: 'completada',
    notas: '',
  },
  {
    id: 'v7',
    fecha: '2026-03-05',
    clienteId: '3',
    clienteNombre: 'Carlos Méndez',
    items: [
      { productoId: '4', productoNombre: 'Casco Urbano Talla M Negro', cantidad: 2, precioUnitario: 59.99, subtotal: 119.98 },
      { productoId: '5', productoNombre: 'Kit Luces LED Recargables', cantidad: 2, precioUnitario: 34.99, subtotal: 69.98 },
    ],
    total: 189.96,
    estado: 'completada',
    notas: 'Para dos bicicletas',
  },
];

export function useVentas() {
  const [ventas, setVentas] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return ventasDemo;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ventas));
  }, [ventas]);

  const agregarVenta = (datos) => {
    const nueva = {
      ...datos,
      id: Date.now().toString(),
      fecha: datos.fecha || new Date().toISOString().split('T')[0],
    };
    setVentas((prev) => [nueva, ...prev]);
    return nueva;
  };

  const eliminarVenta = (id) => {
    setVentas((prev) => prev.filter((v) => v.id !== id));
  };

  const editarVenta = (id, datos) => {
    setVentas((prev) => prev.map((v) => (v.id === id ? { ...v, ...datos } : v)));
  };

  return { ventas, agregarVenta, eliminarVenta, editarVenta };
}
