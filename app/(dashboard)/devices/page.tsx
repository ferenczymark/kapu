'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useDeviceStatus } from '../../../hooks/useDeviceStatus';
import { deviceTopics, isValidTopicPrefix } from '../../../lib/topics';
import {
  Cpu,
  Wifi,
  WifiOff,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  CheckCircle2
} from 'lucide-react';

interface Device {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  status: string;
  topic_prefix: string | null;
}

export default function DevicesPage() {
  // Eszközök állapota
  const [devices, setDevices] = useState<Device[]>([]);

  // Betöltési állapotok
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal állapota
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Admin jogosultság
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Új eszköz form adatai
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [topicPrefix, setTopicPrefix] = useState('');

  // Tényleges online állapot az MQTT brokerből
  const { statuses, refresh: refreshStatus } = useDeviceStatus();

  // --------------------------------------------------
  // ADMIN JOGOSULTSÁG ELLENŐRZÉSE
  // Az admin szerepkört az app_metadata tárolja.
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      setIsCheckingAdmin(true);

      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (!active) return;

        if (error) {
          console.error(
            'Hiba a felhasználó ellenőrzésekor:',
            error
          );

          setIsAdmin(false);
          return;
        }

        // Csak az admin szerepkörrel rendelkező
        // felhasználó kezelheti a törlést.
        setIsAdmin(
          user?.app_metadata?.role === 'admin'
        );
      } catch (err) {
        console.error(
          'Váratlan hiba az admin ellenőrzésekor:',
          err
        );

        if (active) {
          setIsAdmin(false);
        }
      } finally {
        if (active) {
          setIsCheckingAdmin(false);
        }
      }
    };

    void checkAdmin();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // ESZKÖZÖK LEKÉRÉSE A SUPABASE-BŐL
  // --------------------------------------------------

  const fetchDevices = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(
          'Hiba az eszközök lekérésekor:',
          error
        );

        alert(
          'Nem sikerült betölteni az eszközöket!\n\n' +
          error.message
        );

        return;
      }

      setDevices(data || []);
    } catch (err) {
      console.error(
        'Váratlan hiba az eszközök lekérésekor:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // Első betöltés
  useEffect(() => {
    void fetchDevices();
  }, []);

  // --------------------------------------------------
  // ÚJ ESZKÖZ HOZZÁADÁSA
  // --------------------------------------------------

  const handleAddDevice = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Az eszköz nevét kötelező megadni!');
      return;
    }

    if (!isValidTopicPrefix(topicPrefix.trim())) {
      alert(
        'Érvénytelen MQTT topic!\n\n' +
        'Példa: otthon/kapu — szóköz, +, # nélkül, ' +
        'és nem kezdődhet vagy végződhet perjellel.'
      );
      return;
    }

    if (devices.some((device) => device.topic_prefix === topicPrefix.trim())) {
      alert('Ez az MQTT topic már egy másik eszközhöz tartozik!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('devices')
        .insert([
          {
            name: name.trim(),
            location: location.trim() || 'Nincs megadva',
            ip_address: ipAddress.trim() || '192.168.1.X',
            topic_prefix: topicPrefix.trim(),
            status: 'Offline'
          }
        ]);

      if (error) {
        console.error(
          'Hiba az eszköz mentésekor:',
          error
        );

        alert(
          'Hiba történt az eszköz mentése során!\n\n' +
          'Hiba: ' + error.message +
          '\nKód: ' + (error.code || 'Nincs megadva')
        );

        return;
      }

      // Form ürítése sikeres mentés után
      setName('');
      setLocation('');
      setIpAddress('');
      setTopicPrefix('');

      // Modal bezárása
      setIsModalOpen(false);

      // Eszközlista és állapot frissítése
      await fetchDevices();
      void refreshStatus();
    } catch (err) {
      console.error(
        'Váratlan hiba az eszköz mentésekor:',
        err
      );

      alert(
        'Váratlan hiba történt a mentés során. ' +
        'Nézd meg a böngésző konzolját!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // ESZKÖZ TÖRLÉSE
  // Csak admin kezdeményezheti a felületen.
  // Az adatbázis RLS-szabálya is ellenőrzi a jogosultságot.
  // --------------------------------------------------

  const handleDeleteDevice = async (id: string) => {
    // Első ellenőrzés: admin-e a jelenlegi felhasználó?
    if (!isAdmin) {
      alert(
        'Nincs jogosultságod az eszköz törléséhez. ' +
        'Ezt a műveletet kizárólag admin végezheti el.'
      );

      return;
    }

    const confirmed = window.confirm(
      'Biztosan törölni szeretnéd ezt az eszközt? ' +
      'A művelet nem vonható vissza.'
    );

    if (!confirmed) return;

    try {
      // A törlés feltételhez kötött, ezért csak
      // a megadott azonosítójú eszközt célozza.
      const { data, error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id)
        .select('id');

      // Supabase-hiba ellenőrzése
      if (error) {
        console.error(
          'Hiba az eszköz törlésekor:',
          error
        );

        alert(
          'Nem sikerült törölni az eszközt!\n\n' +
          'Hiba: ' + error.message +
          '\nHibakód: ' +
          (error.code || 'Nincs megadva') +
          '\n\nEllenőrizd a Supabase RLS- és DELETE-szabályait.'
        );

        return;
      }

      // Ha nincs visszaadott sor, nem feltételezzük,
      // hogy a törlés sikeresen megtörtént.
      if (!data || data.length === 0) {
        console.error(
          'A Supabase nem adott vissza törölt sort.',
          {
            deviceId: id,
            possibleCauses: [
              'Az eszköz nem található',
              'Az RLS-szabály megakadályozza a törlést',
              'Hiányzik a DELETE jogosultság',
              'A visszaadáshoz szükséges SELECT-jogosultság hiányzik'
            ]
          }
        );

        alert(
          'A Supabase nem igazolta vissza a törlést.\n\n' +
          'Ellenőrizd, hogy az eszköz még létezik-e, ' +
          'valamint a devices tábla DELETE, SELECT és RLS szabályait.'
        );

        return;
      }

      // Sikeres törlés: az eszköz azonnali eltávolítása
      // a dashboard helyi listájából.
      setDevices((currentDevices) =>
        currentDevices.filter(
          (device) => device.id !== id
        )
      );

      console.log(
        'Az eszköz sikeresen törölve:',
        id
      );
    } catch (err) {
      console.error(
        'Váratlan hiba történt a törlés során:',
        err
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : String(err);

      alert(
        'Váratlan hiba történt az eszköz törlésekor!\n\n' +
        errorMessage
      );
    }
  };

  // --------------------------------------------------
  // OLDAL MEGJELENÍTÉSE
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* FEJLÉC */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-emerald-400" />

            Csatlakoztatott Eszközök
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Itt kezelheted a kapuvezérlő hardvereket és I/O modulokat.
          </p>
        </div>

        {/* FEJLÉC GOMBOK */}
        <div className="flex items-center gap-3">

          {/* FRISSÍTÉS */}
          <button
            type="button"
            onClick={() => {
              void fetchDevices();
              void refreshStatus();
            }}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />

            <span>Frissítés</span>
          </button>

          {/* ÚJ ESZKÖZ */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />

            <span>Új eszköz</span>
          </button>
        </div>
      </div>

      {/* ADMIN SZEREPKÖR ÁLLAPOTA */}
      {!isCheckingAdmin && isAdmin && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />

          <span>
            Admin jogosultság aktív. Törölheted az eszközöket.
          </span>
        </div>
      )}

      {/* ESZKÖZÖK RÁCSA */}
      {loading ? (

        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">

          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />

          <span className="text-xs font-medium">
            Eszközök betöltése a Supabase-ből...
          </span>
        </div>

      ) : devices.length === 0 ? (

        <div className="liquid-glass p-12 rounded-[2rem] text-center space-y-3">

          <Cpu className="w-12 h-12 text-slate-600 mx-auto" />

          <h3 className="text-base font-bold text-white">
            Nincs csatlakoztatott eszköz
          </h3>

          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Még egyetlen hardver sincs felvéve a Supabase adatbázisba.
            Kattints az Új eszköz gombra a hozzáadáshoz!
          </p>
        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {devices.map((device) => {
            const online = (statuses[device.id] ?? device.status) === 'Online';

            return (
            <div
              key={device.id}
              className="liquid-glass p-6 rounded-[2rem] space-y-4 relative group"
            >

              {/* KÁRTYA FEJLÉCE */}
              <div className="flex items-center justify-between">

                {/* ESZKÖZ IKON */}
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-2">

                  {/* ESZKÖZ ÁLLAPOTA */}
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                      online
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {online ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        Offline
                      </>
                    )}
                  </span>

                  {/* TÖRLÉS GOMB: CSAK ADMINNAK */}
                  {isAdmin && !isCheckingAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteDevice(device.id)
                      }
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-rose-500/20"
                      title="Eszköz törlése"
                      aria-label={`${device.name} törlése`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                </div>
              </div>

              {/* ESZKÖZ INFORMÁCIÓI */}
              <div>
                <h3 className="text-lg font-bold text-white">
                  {device.name}
                </h3>

                <p className="text-xs text-slate-400">
                  {device.location}
                </p>
              </div>

              {/* IP-CÍM */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">

                <span className="text-slate-500 font-medium">
                  IP Cím:
                </span>

                <span className="text-slate-300 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  {device.ip_address}
                </span>
              </div>

              {/* MQTT TOPIC */}
              <div className="flex items-center justify-between text-xs gap-3">

                <span className="text-slate-500 font-medium shrink-0">
                  Parancs topic:
                </span>

                <span className={`font-mono px-2.5 py-1 rounded-lg border border-white/5 truncate ${
                  device.topic_prefix ? 'text-slate-300 bg-white/5' : 'text-amber-400 bg-amber-500/10'
                }`}>
                  {device.topic_prefix
                    ? deviceTopics(device.topic_prefix).command
                    : 'Nincs beállítva'}
                </span>
              </div>

            </div>
            );
          })}

        </div>
      )}

      {/* ADATBÁZIS ÁLLAPOTJELZŐ */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-4">

        <CheckCircle2 className="w-4 h-4 text-emerald-400" />

        <span>
          Supabase adatbázis-kapcsolat (`devices` tábla)
        </span>
      </div>

      {/* MODAL: ÚJ ESZKÖZ HOZZÁADÁSA */}
      {isModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">

          <div className="liquid-glass p-6 md:p-8 rounded-[2rem] w-full max-w-md space-y-6 relative border border-white/10">

            {/* MODAL BEZÁRÁSA */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
              aria-label="Ablak bezárása"
            >
              <X className="w-5 h-5" />
            </button>

            {/* MODAL FEJLÉCE */}
            <div className="space-y-1">

              <h2 className="text-xl font-bold text-white">
                Új eszköz hozzáadása
              </h2>

              <p className="text-xs text-slate-400">
                Add meg az ESP32 vagy I/O modul adatait.
              </p>
            </div>

            {/* ÚJ ESZKÖZ ŰRLAP */}
            <form
              onSubmit={handleAddDevice}
              className="space-y-4"
            >

              {/* ESZKÖZ NEVE */}
              <div className="space-y-1">

                <label
                  htmlFor="device-name"
                  className="text-xs text-slate-300 font-medium"
                >
                  Eszköz neve
                </label>

                <input
                  id="device-name"
                  type="text"
                  placeholder="pl. Főbejárati Kapu Vezérlő"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* HELYSZÍN */}
              <div className="space-y-1">

                <label
                  htmlFor="device-location"
                  className="text-xs text-slate-300 font-medium"
                >
                  Helyszín / Leírás
                </label>

                <input
                  id="device-location"
                  type="text"
                  placeholder="pl. Északi kapu"
                  value={location}
                  onChange={(e) =>
                    setLocation(e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* IP-CÍM */}
              <div className="space-y-1">

                <label
                  htmlFor="device-ip"
                  className="text-xs text-slate-300 font-medium"
                >
                  IP-cím
                </label>

                <input
                  id="device-ip"
                  type="text"
                  placeholder="pl. 192.168.1.105"
                  value={ipAddress}
                  onChange={(e) =>
                    setIpAddress(e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* MQTT TOPIC-ELŐTAG */}
              <div className="space-y-1">

                <label
                  htmlFor="device-topic"
                  className="text-xs text-slate-300 font-medium"
                >
                  MQTT topic-előtag
                </label>

                <input
                  id="device-topic"
                  type="text"
                  placeholder="pl. otthon/kapu"
                  value={topicPrefix}
                  onChange={(e) =>
                    setTopicPrefix(e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />

                <p className="text-[11px] text-slate-500">
                  Ugyanez kerüljön az ESP32 kódjában a TOPIC_PREFIX-be.
                  {isValidTopicPrefix(topicPrefix.trim()) && (
                    <>
                      {' '}Parancsok:{' '}
                      <span className="font-mono text-slate-400">
                        {deviceTopics(topicPrefix.trim()).command}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* ŰRLAP GOMBOK */}
              <div className="pt-2 flex gap-3">

                {/* MÉGSE */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Mégse
                </button>

                {/* MENTÉS */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-slate-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mentés...
                    </>
                  ) : (
                    'Mentés'
                  )}
                </button>

              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}