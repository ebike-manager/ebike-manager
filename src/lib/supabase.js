import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '⚠️  Supabase no está configurado. Copiá .env.example a .env y completá tus credenciales.'
  );
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder',
  {
    auth: {
      // Bypass Web Locks API — evita el bug "Lock was not released within 5000ms"
      // que deja la app colgada en el spinner de carga.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  }
);
