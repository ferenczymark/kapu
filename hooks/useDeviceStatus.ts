'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Az eszközök tényleges online állapota az MQTT brokerből (/api/devices/status).
// Alapból 10 másodpercenként frissül.
export function useDeviceStatus(intervalMs = 10000) {
  const [brokerOnline, setBrokerOnline] = useState<boolean | null>(null);
  const [broker, setBroker] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, 'Online' | 'Offline'>>({});
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/devices/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Hiba az eszközállapot lekérésekor:', data.error);
        return;
      }

      setBrokerOnline(data.brokerOnline);
      setBroker(data.broker);
      setReason(data.reason ?? null);
      setStatuses(data.statuses ?? {});
    } catch (err) {
      console.error('Hálózati hiba az eszközállapot lekérésekor:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { brokerOnline, broker, reason, statuses, checking, refresh };
}
