import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ebike_clientes';

const clientesDemo = [
  {
    id: '1',
    nombre: 'Martín',
    apellido: 'González',
    telefono: '+54 9 11 4567-8901',
    email: 'martin.gonzalez@email.com',
    notas: 'Cliente frecuente, interesado en accesorios y upgrades.',
    ebikePrincipal: 'E-Bike Mountain Pro 29"',
    fechaRegistro: '2025-01-20',
    historialCompras: [
      { id: 'hc1', fecha: '2025-01-20', producto: 'E-Bike Mountain Pro 29"', precio: 1299.99, descripcion: 'Compra inicial' },
      { id: 'hc2', fecha: '2025-02-15', producto: 'Kit Luces LED Recargables', precio: 34.99, descripcion: '' },
      { id: 'hc3', fecha: '2025-03-01', producto: 'Casco Urbano Talla M Negro', precio: 59.99, descripcion: 'Regalo para su pareja' },
    ],
  },
  {
    id: '2',
    nombre: 'Laura',
    apellido: 'Rodríguez',
    telefono: '+54 9 351 678-9012',
    email: '',
    notas: '',
    ebikePrincipal: 'E-Bike Urbana City 26"',
    fechaRegistro: '2025-02-05',
    historialCompras: [
      { id: 'hc4', fecha: '2025-02-05', producto: 'E-Bike Urbana City 26"', precio: 999.99, descripcion: '' },
    ],
  },
  {
    id: '3',
    nombre: 'Carlos',
    apellido: 'Méndez',
    telefono: '+54 9 261 789-0123',
    email: 'carlos.mendez@gmail.com',
    notas: 'Mecánico, realiza su propio mantenimiento. Prefiere componentes de alta gama.',
    ebikePrincipal: 'Motor Bafang BBS02 750W',
    fechaRegistro: '2025-01-10',
    historialCompras: [
      { id: 'hc5', fecha: '2025-01-10', producto: 'Motor Bafang BBS02 750W', precio: 489.99, descripcion: '' },
      { id: 'hc6', fecha: '2025-01-10', producto: 'Batería Litio 48V 15Ah', precio: 349.99, descripcion: 'Combo con motor' },
      { id: 'hc7', fecha: '2025-02-20', producto: 'Controlador Sinusoidal 48V 25A', precio: 79.99, descripcion: 'Reemplazo' },
    ],
  },
  {
    id: '4',
    nombre: 'Sofía',
    apellido: 'Peralta',
    telefono: '+54 9 11 5678-9012',
    email: 'sofi.peralta@outlook.com',
    notas: 'Usa la bici para ir al trabajo. Interesada en una segunda batería.',
    ebikePrincipal: 'E-Bike Mountain Pro 29"',
    fechaRegistro: '2026-03-01',
    historialCompras: [
      { id: 'hc8', fecha: '2026-03-01', producto: 'E-Bike Mountain Pro 29"', precio: 1299.99, descripcion: '' },
    ],
  },
];

export function useClientes() {
  const [clientes, setClientes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore parse errors
    }
    return clientesDemo;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  }, [clientes]);

  const agregarCliente = (datos) => {
    const nuevo = {
      ...datos,
      id: Date.now().toString(),
      fechaRegistro: new Date().toISOString().split('T')[0],
      historialCompras: [],
    };
    setClientes((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const editarCliente = (id, datos) => {
    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...datos } : c))
    );
  };

  const eliminarCliente = (id) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  const agregarCompra = (clienteId, compra) => {
    const nuevaCompra = { ...compra, id: Date.now().toString() };
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? { ...c, historialCompras: [nuevaCompra, ...c.historialCompras] }
          : c
      )
    );
  };

  const eliminarCompra = (clienteId, compraId) => {
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? { ...c, historialCompras: c.historialCompras.filter((cp) => cp.id !== compraId) }
          : c
      )
    );
  };

  return { clientes, agregarCliente, editarCliente, eliminarCliente, agregarCompra, eliminarCompra };
}
