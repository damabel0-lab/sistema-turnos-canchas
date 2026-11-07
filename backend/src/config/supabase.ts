import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
}

// Cliente con service role: solo para uso del backend (nunca exponer en frontend)
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
