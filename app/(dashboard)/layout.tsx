'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Home, Cpu, Shield, User, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace('/login');
        return;
      }
      setCurrentUser(session?.user ?? null);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        window.location.replace('/login');
        return;
      }
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // 1. React állapot ürítése
      setCurrentUser(null);

      // 2. Globális Supabase kijelentkezés a felhőben
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Kijelentkezési hiba:', err);
    }

    // 3. LocalStorage és SessionStorage teljes ürítése
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}

    // 4. Minden auth süti (cookie) törlése
    try {
      document.cookie.split(';').forEach((c) => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
      });
    } catch (_) {}

    // 5. Garantált átirányítás a login oldalra (előzmény felülírásával, hogy a vissza gomb ne vihesse vissza)
    window.location.replace('/login');
  };

  const username = currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'Betöltés...';
  const email = currentUser?.email || '';

  const navItems = [
    {
      name: 'Vezérlőpult',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Eszközök',
      href: '/devices',
      icon: Cpu,
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Shield,
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col md:flex-row p-4 md:p-6 gap-6 selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Liquid Orbok a háttérben */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[150px] animate-orb-1 pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[150px] animate-orb-2 pointer-events-none" />

      {/* OLDALSÁV (Sidebar) */}
      <aside className="w-full md:w-64 liquid-glass rounded-3xl p-6 flex flex-col justify-between shrink-0 relative z-10">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs tracking-widest text-white uppercase">
              Kapu Rendszer
            </span>
          </div>

          {/* Dinamikus Navigáció */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              // Biztonságos ellenőrzés (ha a pathname épp betöltődik)
              const isActive = pathname ? pathname.startsWith(item.href) : false;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium ${
                    isActive
                      ? 'bg-white/10 border border-white/15 text-white backdrop-blur-xl shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Felhasználó & Kijelentkezés */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{username}</p>
              <p className="text-[10px] text-slate-400 truncate">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </aside>

      {/* A kiválasztott aloldal tartalma */}
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  );
}
