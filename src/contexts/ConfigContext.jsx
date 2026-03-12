import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ConfigContext = createContext(null);

const empresaDefault = {
  nombre: 'E-Bike Manager',
  slogan:  'Movilidad eléctrica inteligente',
  moneda:  'USD',
};

export function ConfigProvider({ children }) {
  const [empresa, setEmpresa]     = useState(empresaDefault);
  const [empresaId, setEmpresaId] = useState(null);
  const [usuarios, setUsuarios]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Fetch empresa config
  const fetchEmpresa = useCallback(async () => {
    const { data, error } = await supabase
      .from('empresa')
      .select('*')
      .limit(1)
      .single();
    if (!error && data) {
      setEmpresa({ nombre: data.nombre, slogan: data.slogan, moneda: data.moneda });
      setEmpresaId(data.id);
    }
  }, []);

  // Fetch all user profiles
  const fetchUsuarios = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setUsuarios(data.map(mapUsuario));
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchEmpresa(), fetchUsuarios()]).then(() => setLoading(false));

    const channel = supabase
      .channel('config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa' }, () => {
        fetchEmpresa();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsuarios();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEmpresa, fetchUsuarios]);

  const actualizarEmpresa = async (datos) => {
    const row = {};
    if (datos.nombre !== undefined) row.nombre = datos.nombre;
    if (datos.slogan !== undefined) row.slogan = datos.slogan;
    if (datos.moneda !== undefined) row.moneda = datos.moneda;

    if (empresaId) {
      await supabase.from('empresa').update(row).eq('id', empresaId);
    }
    setEmpresa((prev) => ({ ...prev, ...datos }));
  };

  const agregarUsuario = async (datos) => {
    // Create user via Supabase Auth signUp
    const { data, error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: {
          nombre: datos.nombre,
          rol: datos.rol || 'viewer',
        },
      },
    });
    if (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
    // The trigger handle_new_user will create the profile
    setTimeout(() => fetchUsuarios(), 1000);
    return data;
  };

  const editarUsuario = async (id, datos) => {
    const row = {};
    if (datos.nombre !== undefined) row.nombre = datos.nombre;
    if (datos.rol !== undefined)    row.rol = datos.rol;
    if (datos.activo !== undefined) row.activo = datos.activo;

    const { error } = await supabase.from('profiles').update(row).eq('id', id);
    if (error) { console.error('Error editando usuario:', error); return; }
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...datos } : u))
    );
  };

  const eliminarUsuario = async (id) => {
    // Deactivate user (can't delete auth users from client)
    const { error } = await supabase.from('profiles').update({ activo: false }).eq('id', id);
    if (error) { console.error('Error desactivando usuario:', error); return; }
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: false } : u))
    );
  };

  return (
    <ConfigContext.Provider
      value={{
        empresa,
        actualizarEmpresa,
        usuarios,
        agregarUsuario,
        editarUsuario,
        eliminarUsuario,
        loading,
        refetchUsuarios: fetchUsuarios,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>');
  return ctx;
}

function mapUsuario(row) {
  return {
    id:     row.id,
    nombre: row.nombre,
    email:  row.email,
    rol:    row.rol,
    activo: row.activo,
  };
}
