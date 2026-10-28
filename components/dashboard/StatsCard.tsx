'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Cpu, 
  ShieldAlert, 
  LogOut, 
  User, 
  CircuitBoard 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Bejelentkezett felhasználó e-mail címének lekérése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Megjelenítjük az e-mail cím elejét vagy a teljes e-mailt
        setUserEmail(user.email);
      }
    };

    getUser();

    // Figyeljük a login / logout eseményeket is
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Kijelentkezés
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Vezérlőpult', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Eszközök', href: '/devices', icon: Cpu },
    { name: 'Admin Panel', href: '/admin', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0b0f19] border-r border-white/10 p-4 flex flex-col justify-between">
      <div className="space-y-8">
        
        {/* LOGO */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CircuitBoard className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-white tracking-wider text-sm">
            KAPU RENDSZER
          </span>
        </div>

        {/* MENÜPONTOK */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ALSÓ FELHASZNÁLÓI BLOKK */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        
        {/* Felhasználó adatai */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <User className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">
              {userEmail || 'Betöltés...'}
            </p>
          </div>
        </div>

        {/* Kijelentkezés gomb */}
        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Kijelentkezés</span>
        </button>

      </div>
    </aside>
  );
}