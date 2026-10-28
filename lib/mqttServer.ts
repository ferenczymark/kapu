import mqtt, { MqttClient } from 'mqtt';
import { createClient, User } from '@supabase/supabase-js';
import { deviceTopics } from './topics';

// FIGYELEM: csak szerveroldalon (API route-okban) használható,
// mert a service role kulcsot és az MQTT jelszót használja.

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_EMAIL = 'rol7yka@gmail.com';

// --------------------------------------------------
// JOGOSULTSÁG
// --------------------------------------------------

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;

  return user;
}

// Ugyanaz a szabály, mint az /api/admin/* végpontokban
export function isAdminUser(user: User): boolean {
  return user.email === ADMIN_EMAIL || user.user_metadata?.role === 'Admin';
}

export async function writeAuditLog(
  user: User | null,
  action: string,
  status: 'SIKERES' | 'HIBA',
  details: string
) {
  try {
    await supabaseAdmin.from('audit_logs').insert([
      {
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        action,
        status,
        details,
      },
    ]);
  } catch (err) {
    console.error('Audit log mentési hiba:', err);
  }
}

// --------------------------------------------------
// BROKER BEÁLLÍTÁSOK (admin felületen szerkeszthető)
// --------------------------------------------------

export interface BrokerSettings {
  host: string;
  port: number;
  source: 'admin' | 'env';
}

export async function getBrokerSettings(): Promise<BrokerSettings | null> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')
    .in('key', ['mqtt_host', 'mqtt_port']);

  if (error) {
    console.error('Hiba az app_settings olvasásakor (lefutott a migráció?):', error.message);
  }

  const values = new Map((data ?? []).map((row) => [row.key, row.value as string | null]));
  const host = values.get('mqtt_host')?.trim();

  if (host) {
    return { host, port: Number(values.get('mqtt_port')) || 1883, source: 'admin' };
  }

  // Tartalék: a .env.local MQTT_URL értéke
  if (process.env.MQTT_URL) {
    try {
      const url = new URL(process.env.MQTT_URL);
      return { host: url.hostname, port: Number(url.port) || 1883, source: 'env' };
    } catch {
      console.error('Érvénytelen MQTT_URL a .env.local fájlban:', process.env.MQTT_URL);
    }
  }

  return null;
}

// --------------------------------------------------
// MQTT KAPCSOLAT
// --------------------------------------------------

export function connectBroker(settings: BrokerSettings, timeoutMs = 4000): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const client = mqtt.connect(`mqtt://${settings.host}:${settings.port}`, {
      clientId: `nextjs_${Math.random().toString(16).slice(2, 10)}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      connectTimeout: timeoutMs,
      reconnectPeriod: 0,
      clean: true,
    });

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end(true);
      reject(err);
    };

    const timer = setTimeout(
      () => fail(new Error(`Időtúllépés: ${settings.host}:${settings.port} nem válaszol.`)),
      timeoutMs
    );

    client.once('connect', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(client);
    });

    // Kapcsolódás utáni hibák csak naplózódnak (különben kezeletlen 'error' esemény lenne)
    client.on('error', (err) => {
      console.error('MQTT hiba:', err.message);
      fail(err);
    });

    client.once('close', () => fail(new Error('A broker bontotta a kapcsolatot.')));
  });
}

// Kiolvassa az eszközök retained ONLINE/OFFLINE üzenetét.
// A broker a feliratkozás után azonnal elküldi a megőrzött üzeneteket,
// ezért elég rövid ideig várni. Ha nincs üzenet, az eszköz offline.
export async function readOnlineStates(
  client: MqttClient,
  prefixes: string[],
  graceMs = 500
): Promise<Map<string, boolean>> {
  const states = new Map<string, boolean>();
  if (prefixes.length === 0) return states;

  const prefixByTopic = new Map(prefixes.map((prefix) => [deviceTopics(prefix).online, prefix]));

  const onMessage = (topic: string, payload: Buffer) => {
    const prefix = prefixByTopic.get(topic);
    if (prefix) {
      states.set(prefix, payload.toString().trim().toUpperCase() === 'ONLINE');
    }
  };

  client.on('message', onMessage);
  try {
    await client.subscribeAsync([...prefixByTopic.keys()], { qos: 1 });
    await new Promise((resolve) => setTimeout(resolve, graceMs));
  } finally {
    client.off('message', onMessage);
  }

  return states;
}

// Parancs küldése, majd várakozás az ESP32 nyugtájára (pl. "NYIT parancs megkapva").
// Visszatérési érték: megérkezett-e a nyugta az időkorláton belül.
export async function sendCommandWithAck(
  client: MqttClient,
  prefix: string,
  action: string,
  ackTimeoutMs = 3000
): Promise<boolean> {
  const topics = deviceTopics(prefix);
  await client.subscribeAsync(topics.status, { qos: 1 });

  let onMessage: (topic: string, payload: Buffer) => void = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ack = new Promise<boolean>((resolve) => {
    onMessage = (topic, payload) => {
      if (topic === topics.status && payload.toString().startsWith(action)) {
        resolve(true);
      }
    };
    timer = setTimeout(() => resolve(false), ackTimeoutMs);
    client.on('message', onMessage);
  });

  try {
    await client.publishAsync(topics.command, action, { qos: 1 });
    return await ack;
  } finally {
    clearTimeout(timer);
    client.off('message', onMessage);
  }
}
