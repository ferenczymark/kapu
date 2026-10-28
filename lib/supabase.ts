import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hrjwxpaacvafhuciumhr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sroMUWD6pnJes-7w7FcDUA_YaHYZpNJ';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Hiányzó Supabase konfiguráció!');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);