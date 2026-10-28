import { NextResponse } from 'next/server';
import {
  connectBroker,
  getBrokerSettings,
  getUserFromRequest,
  readOnlineStates,
  supabaseAdmin,
} from '../../../../lib/mqttServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --------------------------------------------------
// GET: a broker és az összes eszköz tényleges online állapota
// Az eredményt a devices.status mezőbe is visszaírjuk,
// így a csak adatbázist olvasó oldalak is friss állapotot látnak.
// --------------------------------------------------

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });
  }

  const { data: devices, error: devicesError } = await supabaseAdmin
    .from('devices')
    .select('id, status, topic_prefix');

  if (devicesError) {
    return NextResponse.json({ error: devicesError.message }, { status: 500 });
  }

  const settings = await getBrokerSettings();
  const broker = settings ? `${settings.host}:${settings.port}` : null;

  let brokerOnline = false;
  let reason: string | undefined;
  let states = new Map<string, boolean>();

  if (!settings) {
    reason = 'Nincs beállítva MQTT broker.';
  } else {
    try {
      const client = await connectBroker(settings);
      brokerOnline = true;

      try {
        const prefixes = devices
          .map((device) => device.topic_prefix as string | null)
          .filter((prefix): prefix is string => !!prefix);

        states = await readOnlineStates(client, [...new Set(prefixes)]);
      } finally {
        client.end(true);
      }
    } catch (error: any) {
      reason = error?.message || 'A broker nem érhető el.';
    }
  }

  const statuses: Record<string, 'Online' | 'Offline'> = {};

  for (const device of devices) {
    const online = !!device.topic_prefix && states.get(device.topic_prefix) === true;
    statuses[device.id] = online ? 'Online' : 'Offline';
  }

  // Csak a ténylegesen megváltozott sorokat írjuk vissza
  const changed = devices.filter((device) => device.status !== statuses[device.id]);

  await Promise.all(
    changed.map((device) =>
      supabaseAdmin.from('devices').update({ status: statuses[device.id] }).eq('id', device.id)
    )
  );

  return NextResponse.json({
    brokerOnline,
    broker,
    reason,
    statuses,
    checkedAt: new Date().toISOString(),
  });
}
