'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'rol7yka@gmail.com';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Munkamenet ellenőrzése
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // 2. Bejelentkezési állapot élő figyelése
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // GARANTÁLT KIJELENTKEZÉS ÁTIRÁNYÍTÁSSAL A KEZDŐLAPRA (/)
  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      setUser(null);

      // 1. Globális Supabase kijelentkezés
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Kijelentkezési hiba:', err);
    }

    // 2. LocalStorage és SessionStorage törlése
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}

    // 3. Auth sütik törlése
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
    });

    // 4. ÁTIRÁNYÍTÁS A KEZDŐLAPRA (localhost:3000/)
    window.location.href = '/';
  };

  return (
    <nav className="w-full bg-slate-950 border-b border-slate-900 px-6 py-4 flex justify-between items-center fixed top-0 left-0 z-50">
      
      {/* 1. MÁRKANÉV / LOGO (Bal oldalon) */}
      <div className="flex items-center">
        <Link 
          href="/" 
          className="text-xl font-bold tracking-wider text-slate-100 hover:text-blue-400 transition-colors flex items-center gap-2"
        >
          <span className="text-blue-500">🚪</span> KAPU-NYITÓ
        </Link>
      </div>

      {/* 2. GYORSLINKEK / GOMBOK (Jobb oldalon) */}
      <div className="flex items-center gap-6">
        
        {/* Vezérlőpult gyorslink */}
        <Link 
          href="/dashboard" 
          className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Vezérlőpult
        </Link>

        {/* Csak az adminisztrátor láthatja az Admin Panelt */}
        {(user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'Admin') && (
          <Link 
            href="/admin" 
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Admin Panel
          </Link>
        )}

        {/* Állapot alapú gombok */}
        {!loading && (
          user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {user.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-rose-600 hover:bg-rose-700 text-slate-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Kijelentkezés
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="bg-blue-600 hover:bg-blue-700 text-slate-100 font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Bejelentkezés
            </Link>
          )
        )}
        
      </div>
      
    </nav>
  );
}