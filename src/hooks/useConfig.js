import { useState, useEffect } from 'react';

const KEY_EMPRESA  = 'ebike_empresa';
const KEY_USUARIOS = 'ebike_usuarios';

const empresaDefault = {
  nombre: 'E-Bike Manager',
  slogan:  'Movilidad eléctrica inteligente',
  moneda:  'USD',
};

const usuariosDefault = [
  {
    id: '1',
    nombre: 'Administrador',
    email: 'admin@ebike.com',
    rol: 'admin',
    password: 'admin123',
    activo: true,
  },
];

export function useConfig() {
  const [empresa, setEmpresa] = useState(() => {
    try {
      const s = localStorage.getItem(KEY_EMPRESA);
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return empresaDefault;
  });

  const [usuarios, setUsuarios] = useState(() => {
    try {
      const s = localStorage.getItem(KEY_USUARIOS);
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return usuariosDefault;
  });

  useEffect(() => {
    localStorage.setItem(KEY_EMPRESA, JSON.stringify(empresa));
  }, [empresa]);

  useEffect(() => {
    localStorage.setItem(KEY_USUARIOS, JSON.stringify(usuarios));
  }, [usuarios]);

  const actualizarEmpresa = (datos) =>
    setEmpresa((prev) => ({ ...prev, ...datos }));

  const agregarUsuario = (datos) =>
    setUsuarios((prev) => [...prev, { ...datos, id: Date.now().toString() }]);

  const editarUsuario = (id, datos) =>
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...datos } : u)));

  const eliminarUsuario = (id) =>
    setUsuarios((prev) => prev.filter((u) => u.id !== id));

  return {
    empresa, actualizarEmpresa,
    usuarios, agregarUsuario, editarUsuario, eliminarUsuario,
  };
}
