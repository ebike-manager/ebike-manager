import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const MAX_ENTRIES = 500;

// Singleton log function accessible without hook
export async function appendLog(accion, modulo, detalles = '') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    let nombre = 'Sistema';
    let email  = '';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('id', user.id)
        .single();
      if (profile) {
        nombre = profile.nombre;
        email  = profile.email;
      }
    }
    const { data, error } = await supabase.from('activity_log').insert({
      usuario:  nombre,
      email,
      accion,
      modulo,
      detalles,
    }).select().single();
    if (error) console.error('Error logging:', error);
    return data;
  } catch {
    // Silently fail — logging should never break the app
  }
}

export function useActivityLog() {
  const [log, setLog]       = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(MAX_ENTRIES);
    if (!error && data) {
      setLog(data.map(mapEntry));
    }
    setLoading(false);
  }, []);

  const logActividad = useCallback(async (accion, modulo, detalles = '') => {
    await appendLog(accion, modulo, detalles);
    refresh();
  }, [refresh]);

  const limpiarLog = async () => {
    // Delete all entries
    await supabase.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setLog([]);
  };

  return { log, loading, logActividad, refresh, limpiarLog };
}

function mapEntry(row) {
  return {
    id:        row.id,
    timestamp: row.timestamp,
    usuario:   row.usuario,
    email:     row.email,
    accion:    row.accion,
    modulo:    row.modulo,
    detalles:  row.detalles,
  };
}
