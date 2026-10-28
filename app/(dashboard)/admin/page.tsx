'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  ShieldAlert, 
  Settings, 
  Cpu, 
  Save, 
  Clock, 
  Bell, 
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Send,
  Users,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  FileText,
  Server,
  PlugZap
} from 'lucide-react';
const ADMIN_EMAIL = 'rol7yka@gmail.com';
interface DeviceData {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  status: string;
}
interface UserData {
  id: string;
  email: string;
  role?: string;
}
interface LogData {
  id: number;
  user_email: string;
  action: string;
  status: string;
  details?: string;
  created_at: string;
}
export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  // Beállítások állapota
  const [autoCloseMinutes, setAutoCloseMinutes] = useState('5');
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  // MQTT broker beállítások
  const [mqttHost, setMqttHost] = useState('');
  const [mqttPort, setMqttPort] = useState('1883');
  const [mqttSource, setMqttSource] = useState<'admin' | 'env' | null>(null);
  const [isSavingBroker, setIsSavingBroker] = useState(false);
  const [isTestingBroker, setIsTestingBroker] = useState(false);
  const [brokerMessage, setBrokerMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const isUserAdmin = session.user.email === ADMIN_EMAIL || session.user.user_metadata?.role === 'Admin';
        if (isUserAdmin) {
          fetchUsers(session.access_token);
          fetchDevices();
          fetchLogs(session.access_token);
          fetchBrokerSettings(session.access_token);
        }
      }
      setAuthLoading(false);
    };
    init();
  }, []);
  // 1. Felhasználók lekérése az Admin API-n keresztül (Supabase Auth)
  const fetchUsers = async (accessToken?: string) => {
    setLoadingUsers(true);
    try {
      let token = accessToken;
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }
      if (!token) return;
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        console.error('Hiba a felhasználók lekérésekor:', data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };
  // 2. Eszközök lekérése Supabase-ből
  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data, error: dbError } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (!dbError && data) {
        setDevices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };
  // 3. Eseménynapló (Audit Log) lekérése
  const fetchLogs = async (accessToken?: string) => {
    setLoadingLogs(true);
    try {
      let token = accessToken;
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }
      if (!token) return;
      const res = await fetch('/api/admin/logs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      } else {
        console.error('Hiba az audit naplók lekérésekor:', data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };
  // 4. MQTT broker beállítás lekérése
  const fetchBrokerSettings = async (accessToken: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMqttHost(data.mqttHost);
        setMqttPort(String(data.mqttPort));
        setMqttSource(data.source);
      } else {
        console.error('Hiba a broker beállítás lekérésekor:', data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };
  // MQTT broker cím mentése
  const handleSaveBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBroker(true);
    setBrokerMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ mqttHost, mqttPort: Number(mqttPort) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nem sikerült menteni.');
      setMqttSource('admin');
      setBrokerMessage({ ok: true, text: `Mentve: ${data.mqttHost}:${data.mqttPort}` });
    } catch (err: any) {
      setBrokerMessage({ ok: false, text: err.message });
    } finally {
      setIsSavingBroker(false);
    }
  };
  // Kapcsolat tesztelése a mentett brokerrel
  const handleTestBroker = async () => {
    setIsTestingBroker(true);
    setBrokerMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mqtt', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.mosquittoOnline) {
        setBrokerMessage({ ok: true, text: `A broker elérhető (${data.broker}).` });
      } else {
        setBrokerMessage({ ok: false, text: `Nem elérhető: ${data.reason || data.error || 'ismeretlen hiba'}` });
      }
    } catch (err: any) {
      setBrokerMessage({ ok: false, text: err.message });
    } finally {
      setIsTestingBroker(false);
    }
  };
  // Felhasználó törlése Supabase Auth adatbázisból
  const handleDeleteUser = async (userId: string, email: string) => {
    if (currentUser?.email !== ADMIN_EMAIL) {
      alert('Kizárólag a főadminisztrátor (rol7yka@gmail.com) törölhet felhasználót!');
      return;
    }
    if (!confirm(`Biztosan törölni szeretnéd a(z) ${email} felhasználót a Supabase adatbázisból?`)) {
      return;
    }
    setDeletingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'A törlés nem sikerült');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingUserId(null);
    }
  };
  // Teszt e-mail küldő
  const triggerEmailAlert = async () => {
    setIsSendingTestEmail(true);
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: 'Főbejárati Kapu Vezérlő',
          eventType: 'Teszt Riasztás / Szabálytalan nyitás',
          timestamp: new Date().toLocaleString('hu-HU'),
        }),
      });
      if (res.ok) {
        alert('Teszt riasztó e-mail elküldve!');
      } else {
        alert('Hiba történt az e-mail küldésekor.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingTestEmail(false);
    }
  };
  // Jogosultság (szerepkör) váltás
  const handleRoleChange = async (userId: string, newRole: string) => {
  if (currentUser?.email !== ADMIN_EMAIL) {
    alert('Kizárólag a főadminisztrátor (rol7yka@gmail.com) módosíthatja a szerepköröket!');
    return;
  }
  setUpdatingUserId(userId);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Nem sikerült elmenteni a szerepkört.');
    }
    // A FONTOS RÉSZ: Azonnali, friss adatok lekérése a szerverről
    await fetchUsers(session?.access_token);
    
  } catch (err: any) {
    alert(`Hiba a mentés során: ${err.message}`);
  } finally {
    setUpdatingUserId(null);
  }
};
  // Beállítások mentése
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }
  const isPrimaryAdmin = currentUser?.email === ADMIN_EMAIL;
  const isUserAdmin = isPrimaryAdmin || currentUser?.user_metadata?.role === 'Admin';
  if (!isUserAdmin) {
    return (
      <div className="liquid-glass p-8 rounded-3xl text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Hozzáférés megtagadva</h2>
        <p className="text-sm text-slate-400">
          Az Admin Panel kizárólag a kijelölt adminisztrátorok számára érhető el.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      
      {/* Fejléc */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Admin Panel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Rendszerszintű beállítások, jogosultságok és eszközök kezelése.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BAL OSZLOP: Beállítások & Felhasználók */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* BEÁLLÍTÁSOK KÁRTYA */}
          <div className="liquid-glass p-6 md:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Settings className="w-5 h-5" />
              <h2 className="text-lg text-white">Beállítások</h2>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Automatikus zárás (perc)
                </label>
                <input
                  type="number"
                  value={autoCloseMinutes}
                  onChange={(e) => setAutoCloseMinutes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  min="1"
                  max="60"
                />
              </div>
              {/* Értesítés Kapcsoló */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      E-mail Értesítések
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications(!notifications)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                      notifications ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        notifications ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {notifications && (
                  <button
                    type="button"
                    onClick={triggerEmailAlert}
                    disabled={isSendingTestEmail}
                    className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] font-semibold text-rose-300 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSendingTestEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Teszt riasztási e-mail küldése</span>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
                <span>{isSaving ? 'Mentés...' : saveSuccess ? 'Sikeresen mentve!' : 'Beállítások mentése'}</span>
              </button>
            </form>
          </div>
          {/* MQTT BROKER KÁRTYA */}
          <div className="liquid-glass p-6 md:p-8 rounded-[2rem] space-y-5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Server className="w-5 h-5" />
              <h2 className="text-lg text-white">MQTT Broker</h2>
            </div>
            <form onSubmit={handleSaveBroker} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <label htmlFor="mqtt-host" className="text-xs font-medium text-slate-300">
                    IP-cím / hosztnév
                  </label>
                  <input
                    id="mqtt-host"
                    type="text"
                    value={mqttHost}
                    onChange={(e) => setMqttHost(e.target.value)}
                    placeholder="pl. 192.168.1.100"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mqtt-port" className="text-xs font-medium text-slate-300">
                    Port
                  </label>
                  <input
                    id="mqtt-port"
                    type="number"
                    value={mqttPort}
                    onChange={(e) => setMqttPort(e.target.value)}
                    min="1"
                    max="65535"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                </div>
              </div>
              {mqttSource === 'env' && (
                <p className="text-[11px] text-amber-400">
                  Jelenleg a .env.local MQTT_URL értéke van használatban. Mentés után az itt megadott cím lesz érvényes.
                </p>
              )}
              {brokerMessage && (
                <p className={`text-[11px] font-semibold ${brokerMessage.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {brokerMessage.text}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={isSavingBroker}
                  className="py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingBroker ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
                  <span>Mentés</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestBroker}
                  disabled={isTestingBroker}
                  className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  title="A mentett címmel próbál kapcsolódni"
                >
                  {isTestingBroker ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                  <span>Kapcsolat teszt</span>
                </button>
              </div>
            </form>
          </div>
          {/* FELHASZNÁLÓK ÉS JOGOSULTSÁGOK KÁRTYA */}
          <div className="liquid-glass p-6 md:p-8 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Users className="w-5 h-5" />
                <h2 className="text-lg text-white">Felhasználók & Jogosultságok</h2>
              </div>
              <button onClick={() => fetchUsers()} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-3">
              {loadingUsers ? (
                <div className="py-6 flex items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Felhasználók betöltése...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Még nincs regisztrált felhasználó a rendszerben.
                </div>
              ) : (
                users.map((user) => {
                  const isTargetPrimaryAdmin = user.email === ADMIN_EMAIL;
                  const isTargetAdmin = user.role === 'Admin' || isTargetPrimaryAdmin;
                  return (
                    <div key={user.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> 
                          Jelenlegi szerep: <span className={isTargetAdmin ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>{isTargetAdmin ? 'Admin' : 'Ügyfél'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {updatingUserId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                        <select
                          value={isTargetAdmin ? 'Admin' : 'Ügyfél'}
                          disabled={!isPrimaryAdmin || isTargetPrimaryAdmin}
                          title={!isPrimaryAdmin ? 'Kizárólag a főadminisztrátor (rol7yka@gmail.com) módosíthatja a szerepköröket.' : undefined}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Ügyfél">Ügyfél</option>
                        </select>
                        {isPrimaryAdmin && !isTargetPrimaryAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            disabled={deletingUserId === user.id}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                            title="Felhasználó törlése a Supabase adatbázisból"
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {/* JOBB OSZLOP: Eszközök */}
        <div className="lg:col-span-7 liquid-glass p-6 md:p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Cpu className="w-5 h-5" />
              <h2 className="text-lg text-white">Rendszerben lévő Eszközök</h2>
            </div>
            
            <button 
              onClick={fetchDevices} 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title="Lista frissítése"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDevices ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="overflow-x-auto">
            {loadingDevices ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">Eszközök betöltése a Supabase-ből...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Még nincs egyetlen eszköz sem felvéve a Supabase `devices` táblájában.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="pb-3 font-medium">Eszköz Neve</th>
                    <th className="pb-3 font-medium">Helyszín / IP</th>
                    <th className="pb-3 font-medium">Állapot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                  {devices.map((device) => (
                    <tr key={device.id} className="group hover:bg-white/[0.02]">
                      <td className="py-3.5 font-medium text-white">{device.name}</td>
                      <td className="py-3.5 text-slate-400">
                        {device.location} <span className="text-[10px] text-slate-500 font-mono">({device.ip_address})</span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                          device.status === 'Online'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {device.status === 'Online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {device.status || 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {/* AUDIT LOG / ESEMÉNYNAPLÓ SZEKCIÓ */}
      <div className="liquid-glass p-6 md:p-8 rounded-[2rem] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg text-white">Eseménynapló (Audit Log)</h2>
          </div>
          
          <button 
            onClick={() => fetchLogs()} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Napló frissítése"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          {loadingLogs ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Eseménynapló betöltése...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Még nincsenek rögzített kapunyitási események a naplóban.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="pb-3 font-medium">Időpont</th>
                  <th className="pb-3 font-medium">Felhasználó</th>
                  <th className="pb-3 font-medium">Művelet</th>
                  <th className="pb-3 font-medium">Állapot</th>
                  <th className="pb-3 font-medium">Részletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.02]">
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('hu-HU')}
                    </td>
                    <td className="py-3.5 font-medium text-white">{log.user_email || 'Rendszer / Ismeretlen'}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-emerald-400 font-semibold border border-white/5">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                        log.status === 'SIKERES'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 text-[11px]">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
