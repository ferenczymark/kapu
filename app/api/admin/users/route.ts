import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'rol7yka@gmail.com';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'sb_publishable_sroMUWD6pnJes-7w7FcDUA_YaHYZpNJ',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_n0SDe1GykvunQlZiJMRhBA_q0-7g1Yr'
);

// 1. Felhasználók és elmentett szerepköreik lekérése
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    const isAdmin = user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'Admin';
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
    }

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      // A role-t a user_metadata-ból olvassuk ki!
      role: (u.user_metadata?.role === 'Admin' || u.email === ADMIN_EMAIL) ? 'Admin' : 'Ügyfél',
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Szerepkör elmentése a Supabase Auth user_metadata-ba
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    const isAdmin = user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'Admin';
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
    }

    const { userId, role } = await req.json();

    // Szerepkör frissítése közvetlenül a Supabase user_metadata-ban
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. Felhasználó törlése
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    const isAdmin = user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'Admin';
    if (authError || !user || !isAdmin) {
      return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
    }

    const { userId } = await req.json();
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (targetUser?.user?.email === ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Az admin fiók nem törölhető!' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
