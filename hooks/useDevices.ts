'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // A korábbi importálási mód szerint

// Az eszköz típusa (szükség szerint bővíthető a te adatbázisod mezőivel)
export interface Device {
  id: string;
  name: string;
  status: string;
  location?: string;
  ip_address?: string;
  topic_prefix?: string | null;
  created_at?: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. KEZDETI ADATOK LEKÉRÉSE A SUPABASE-BŐL
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('devices') // Győződj meg róla, hogy az adatbázis táblád neve 'devices'
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDevices(data || []);
      } catch (err: any) {
        console.error('Hiba az eszközök betöltésekor:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // 2. VALÓS IDEJŰ (REALTIME) CSATORNA NYITÁSA
    const channel = supabase
      .channel('realtime-devices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          // INSERT: Új eszköz hozzáadása
          if (payload.eventType === 'INSERT') {
            setDevices((prev) => [payload.new as Device, ...prev]);
          }
          // UPDATE: Módosítás (pl. átnevezés, státuszváltozás)
          else if (payload.eventType === 'UPDATE') {
            setDevices((prev) =>
              prev.map((device) =>
                device.id === payload.new.id ? (payload.new as Device) : device
              )
            );
          }
          // DELETE: Eszköz törlése
          else if (payload.eventType === 'DELETE') {
            setDevices((prev) =>
              prev.filter((device) => device.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Takarítás: Leiratkozunk a csatornáról, ha a komponens megszűnik
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { devices, loading, error };
}