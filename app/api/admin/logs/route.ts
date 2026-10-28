import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'rol7yka@gmail.com';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'sb_publishable_sroMUWD6pnJes-7w7FcDUA_YaHYZpNJ',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_n0SDe1GykvunQlZiJMRhBA_q0-7g1Yr'
);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    const isAdmin = user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'Admin';
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
    }

    // Audit naplók lekérése időrendben visszafelé (legfrissebb elöl)
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      // Ha még nincs létrehozva az audit_logs tábla a Supabase-ben, üres listát adunk hiba helyett
      console.warn('Figyelem: audit_logs tábla lekérdezése sikertelen (lehet, hogy még nem létezik):', logsError.message);
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
