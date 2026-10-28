'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useDevices } from '../../../hooks/useDevices';
import { useDeviceStatus } from '../../../hooks/useDeviceStatus';
import { deviceTopics } from '../../../lib/topics';
import {
  Wifi,
  WifiOff,
  Activity,
  Lock,
  Unlock,
  Radio,
  Server,
  Cpu,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface CommandResult {
  ok: boolean;
  message: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { devices, loading: devicesLoading } = useDevices();
  const { brokerOnline, broker, reason, statuses, checking, refresh } = useDeviceStatus();

  // Melyik eszközre melyik parancs van folyamatban, pl. "<id>:NYIT"
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUser(session.user);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Élő állapot (MQTT), amíg nincs, az adatbázisban tárolt utolsó ismert érték
  const isOnline = (deviceId: string, fallback: string) =>
    (statuses[deviceId] ?? fallback) === 'Online';

  const handleCommand = async (deviceId: string, action: 'NYIT' | 'ZAR') => {
    setPendingCommand(`${deviceId}:${action}`);
    setLastResult(null);

    try {
      // Supabase session token lekérése a jogosultság-ellenőrzéshez
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/mqtt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ deviceId, action }),
      });
      const data = await res.json();

      if (res.ok) {
        setLastResult({ ok: data.acknowledged, message: data.message });
      } else {
        setLastResult({ ok: false, message: data.error || 'Hiba történt a kapu vezérlésekor.' });
        // Pl. offline lett az eszköz: frissítjük az állapotot
        void refresh();
      }
    } catch (err) {
      console.error('Hálózati hiba:', err);
      setLastResult({ ok: false, message: 'Nem sikerült kapcsolódni a szerverhez.' });
    } finally {
      setPendingCommand(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Hitelesítés ellenőrzése...</p>
      </div>
    );
  }

  const username = user?.user_metadata?.username || user?.email?.split('@')[0];
  const onlineCount = devices.filter((device) => isOnline(device.id, device.status)).length;

  return (
    <div className="space-y-6">

      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Vezérlőpult
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bejelentkezve mint: <span className="text-emerald-400 font-semibold">{username}</span>
          </p>
        </div>

        {/* Csatlakozási jelvény */}
        <button
          type="button"
          onClick={() => void refresh()}
          title="Állapot frissítése"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${
            brokerOnline
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
        >
          {checking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Radio className={`w-3.5 h-3.5 ${brokerOnline ? 'animate-pulse' : ''}`} />
          )}
          <span>{brokerOnline ? 'Élő Kapcsolat' : brokerOnline === null ? 'Ellenőrzés...' : 'Nincs Kapcsolat'}</span>
        </button>
      </div>

      {/* Státusz Kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Broker Státusz (Mosquitto) */}
        <div className="liquid-glass p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">MQTT Broker</span>
            <Server className={`w-4 h-4 ${brokerOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-lg font-bold flex items-center gap-2 ${brokerOnline ? 'text-white' : 'text-rose-400'}`}>
            {brokerOnline && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />}
            <span>
              {brokerOnline === null ? 'Ellenőrzés...' : brokerOnline ? 'Mosquitto Online' : 'Mosquitto Offline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate" title={reason ?? undefined}>
            {broker ?? 'Nincs beállítva'}
            {!brokerOnline && reason ? ` — ${reason}` : ''}
          </p>
        </div>

        {/* Hardver Státusz (ESP32) */}
        <div className="liquid-glass p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Hardver</span>
            <Activity className={`w-4 h-4 ${onlineCount > 0 ? 'text-cyan-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-lg font-bold ${onlineCount > 0 ? 'text-white' : 'text-rose-400'}`}>
            {onlineCount} / {devices.length} ESP32 online
          </div>
          <p className="text-[11px] text-slate-400">
            {onlineCount > 0 ? 'Mosquitto kapcsolat OK' : 'Várakozás eszközre...'}
          </p>
        </div>

        {/* Utolsó parancs */}
        <div className="liquid-glass p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Utolsó parancs</span>
            {lastResult ? (
              lastResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )
            ) : (
              <Lock className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <p className={`text-xs font-semibold ${
            !lastResult ? 'text-slate-500' : lastResult.ok ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {lastResult?.message ?? 'Még nem küldtél parancsot.'}
          </p>
        </div>
      </div>

      {/* KAPUK VEZÉRLÉSE */}
      <div className="liquid-glass p-6 md:p-8 rounded-[2.5rem] space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Kapu Vezérlése</h2>
          <p className="text-xs text-slate-400">
            Csak online eszköznek küldhető parancs. Az állapot 10 másodpercenként frissül.
          </p>
        </div>

        {devicesLoading ? (
          <div className="py-10 flex items-center justify-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Eszközök betöltése...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
            <p>Még nincs felvett eszköz. Vegyél fel egy ESP32-t az Eszközök oldalon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((device) => {
              const online = isOnline(device.id, device.status);
              const busy = pendingCommand?.startsWith(`${device.id}:`) ?? false;
              const canSend = online && !!device.topic_prefix && !pendingCommand;

              return (
                <div key={device.id} className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{device.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {device.topic_prefix
                          ? deviceTopics(device.topic_prefix).command
                          : 'Nincs MQTT topic beállítva'}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                        online
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCommand(device.id, 'NYIT')}
                      disabled={!canSend}
                      className="py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all hover:bg-emerald-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy && pendingCommand?.endsWith(':NYIT') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      Nyitás
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCommand(device.id, 'ZAR')}
                      disabled={!canSend}
                      className="py-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all hover:bg-amber-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy && pendingCommand?.endsWith(':ZAR') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      Zárás
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
