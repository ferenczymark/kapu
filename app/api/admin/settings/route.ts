import { NextResponse } from 'next/server';
import {
  getBrokerSettings,
  getUserFromRequest,
  isAdminUser,
  supabaseAdmin,
  writeAuditLog,
} from '../../../../lib/mqttServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// IP-cím vagy hosztnév (séma és port nélkül), pl. 192.168.1.100 vagy ubuntu.local
const HOST_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

// 1. Jelenlegi broker beállítás lekérése
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
  }

  const settings = await getBrokerSettings();

  return NextResponse.json({
    mqttHost: settings?.host ?? '',
    mqttPort: settings?.port ?? 1883,
    source: settings?.source ?? null,
  });
}

// 2. Broker cím mentése
export async function PUT(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Hozzáférés megtagadva' }, { status: 403 });
  }

  const { mqttHost, mqttPort } = await req.json().catch(() => ({}));
  const host = typeof mqttHost === 'string' ? mqttHost.trim() : '';
  const port = Number(mqttPort);

  if (!HOST_PATTERN.test(host)) {
    return NextResponse.json(
      { error: 'Érvénytelen broker cím. Csak IP-címet vagy hosztnevet adj meg (pl. 192.168.1.100), mqtt:// és port nélkül.' },
      { status: 400 }
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return NextResponse.json({ error: 'Érvénytelen port (1–65535).' }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from('app_settings').upsert([
    { key: 'mqtt_host', value: host, updated_at: updatedAt },
    { key: 'mqtt_port', value: String(port), updated_at: updatedAt },
  ]);

  if (error) {
    return NextResponse.json(
      { error: `Mentési hiba: ${error.message} (lefutott a supabase_mqtt_migration.sql?)` },
      { status: 500 }
    );
  }

  await writeAuditLog(user, 'BEALLITAS', 'SIKERES', `MQTT broker módosítva: ${host}:${port}`);

  return NextResponse.json({ success: true, mqttHost: host, mqttPort: port });
}
