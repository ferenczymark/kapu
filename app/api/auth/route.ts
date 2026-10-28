import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { action, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Hiányzó e-mail cím vagy jelszó!' },
        { status: 400 }
      );
    }

    // REGISZTRÁCIÓ (Supabase Auth)
    if (action === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Sikeres regisztráció!',
        user: data.user,
      });
    }

    // BEJELENTKEZÉS (Supabase Auth)
    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json(
          { error: 'Hibás e-mail cím vagy jelszó!' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Sikeres bejelentkezés!',
        token: data.session?.access_token,
        user: data.user,
      });
    }

    return NextResponse.json({ error: 'Érvénytelen művelet!' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Szerver hiba: ' + error.message },
      { status: 500 }
    );
  }
}