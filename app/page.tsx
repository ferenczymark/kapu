'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Cpu, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Munkamenet lekérése
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

  // GARANTÁLT KIJELENTKEZÉS ÁTIRÁNYÍTÁSSAL A FŐOLDALRA (/)
  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // 1. React állapot törlése
      setUser(null);

      // 2. LocalStorage és SessionStorage ürítése
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.clear();
      sessionStorage.clear();

      // 3. Auth sütik törlése
      document.cookie.split(';').forEach((c) => {
        const cookieName = c.split('=')[0].trim();
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      });

      // 4. Supabase globális kijelentkezés
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Kijelentkezési hiba:', err);
    } finally {
      // 5. ÁTIRÁNYÍTÁS ÉS REFRESH A FŐOLDALRA (localhost:3000 /)
      window.location.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white flex flex-col justify-between p-6 relative overflow-hidden">
      
      {/* 1. FEJLÉC */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-3 px-6 rounded-full bg-[#080d1a]/80 border border-slate-800/80 backdrop-blur-md z-20">
        
        {/* Bal oldal: Logó */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
            IoT
          </div>
          <span className="font-bold text-sm tracking-wide text-slate-100">
            IoT Beléptető Rendszer
          </span>
        </div>

        {/* Jobb oldal: Felhasználó + Kijelentkezés VAGY Bejelentkezés gomb */}
        <div className="flex items-center gap-3">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#0a2725] text-emerald-400 border border-[#134e48]">
                  {user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer px-2 py-1 font-medium"
                >
                  Kijelentkezés
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-bold px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20"
              >
                Bejelentkezés
              </Link>
            )
          )}
        </div>
      </header>

      {/* 2. KÖZÉPSŐ TARTALOM */}
      <main className="max-w-4xl mx-auto text-center my-auto space-y-8 z-10 py-12">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Cpu className="w-3.5 h-3.5" />
          <span>Next.js 16 & Turbopack Motor</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Üdvözöllek a felhő alapú <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Kapunyitó rendszerben!
          </span>
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Ez egy újgenerációs, hardveresen megkerült beléptető megoldás. A gyors és szerver nélküli kiszolgálásért a <strong className="text-slate-200">Vercel</strong> felel, a felhasználók és logok golyóálló biztonságát a <strong className="text-slate-200">Supabase</strong> garantálja, a parancsok pedig a <strong className="text-slate-200">HiveMQ</strong> brókeren keresztül azonnal eljutnak az ESP32 mikrovezérlőhöz.
        </p>

        <div className="pt-4">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/20"
          >
            <span>Vezérlőpult megnyitása</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Lábléc */}
      <footer className="text-center text-xs text-slate-600 py-4 z-10">
        © 2026 Kapu Vezérlő Rendszer — Minden jog fenntartva.
      </footer>
    </div>
  );
}