import { NextResponse } from 'next/server';
import {
  connectBroker,
  getBrokerSettings,
  getUserFromRequest,
  readOnlineStates,
  sendCommandWithAck,
  supabaseAdmin,
  writeAuditLog,
} from '../../../lib/mqttServer';
import { deviceTopics } from '../../../lib/topics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Engedélyezett parancsok listája — a kliens nem küldhet tetszőleges szöveget
const ALLOWED_ACTIONS = ['NYIT', 'ZAR'];

// --------------------------------------------------
// GET: a Mosquitto broker elérhetőségének ellenőrzése
// --------------------------------------------------

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });
  }

  const settings = await getBrokerSettings();
  if (!settings) {
    return NextResponse.json({
      mosquittoOnline: false,
      checkedAt: new Date().toISOString(),
      reason: 'Nincs beállítva MQTT broker (Admin Panel vagy MQTT_URL).',
    });
  }

  const broker = `${settings.host}:${settings.port}`;

  try {
    const client = await connectBroker(settings);
    client.end(true);

    return NextResponse.json({ mosquittoOnline: true, broker, checkedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({
      mosquittoOnline: false,
      broker,
      reason: error?.message || 'Ismeretlen hiba',
      checkedAt: new Date().toISOString(),
    });
  }
}

// --------------------------------------------------
// POST: NYIT / ZAR parancs küldése egy eszköznek
// Body: { deviceId: string, action: 'NYIT' | 'ZAR' }
// --------------------------------------------------

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Bejelentkezés szükséges.' }, { status: 401 });
  }

  const { deviceId, action } = await request.json().catch(() => ({}));

  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Érvénytelen parancs. Engedélyezett: ${ALLOWED_ACTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  if (!deviceId) {
    return NextResponse.json({ error: 'Hiányzó eszközazonosító.' }, { status: 400 });
  }

  // 1. Eszköz és topic lekérése
  const { data: device, error: deviceError } = await supabaseAdmin
    .from('devices')
    .select('id, name, topic_prefix')
    .eq('id', deviceId)
    .maybeSingle();

  if (deviceError || !device) {
    return NextResponse.json({ error: 'Az eszköz nem található.' }, { status: 404 });
  }

  if (!device.topic_prefix) {
    return NextResponse.json(
      { error: `A(z) "${device.name}" eszközhöz nincs MQTT topic beállítva.` },
      { status: 400 }
    );
  }

  const topics = deviceTopics(device.topic_prefix);

  // 2. Kapcsolódás a brokerhez
  const settings = await getBrokerSettings();
  if (!settings) {
    return NextResponse.json(
      { error: 'Nincs beállítva MQTT broker. Állítsd be az Admin Panelen!' },
      { status: 503 }
    );
  }

  let client;
  try {
    client = await connectBroker(settings);
  } catch (error: any) {
    await writeAuditLog(user, action, 'HIBA', `Broker nem érhető el (${settings.host}:${settings.port}): ${error?.message}`);
    return NextResponse.json(
      { error: `Az MQTT broker nem érhető el (${settings.host}:${settings.port}).` },
      { status: 503 }
    );
  }

  try {
    // 3. Online-e az eszköz? (retained ONLINE/OFFLINE üzenet alapján)
    const states = await readOnlineStates(client, [device.topic_prefix]);

    if (states.get(device.topic_prefix) !== true) {
      await writeAuditLog(user, action, 'HIBA', `${device.name}: az eszköz offline, a parancs nem lett elküldve`);
      return NextResponse.json(
        { error: `A(z) "${device.name}" eszköz offline, a parancs nem lett elküldve.` },
        { status: 409 }
      );
    }

    // 4. Parancs küldése és várakozás a nyugtára
    const acknowledged = await sendCommandWithAck(client, device.topic_prefix, action);

    await writeAuditLog(
      user,
      action,
      'SIKERES',
      `${device.name}: parancs elküldve (${topics.command})` +
        (acknowledged ? ', ESP32 nyugtázta' : ', nyugta nem érkezett')
    );

    return NextResponse.json({
      success: true,
      acknowledged,
      message: acknowledged
        ? `A(z) "${device.name}" megkapta a(z) ${action} parancsot.`
        : `A(z) ${action} parancs elküldve, de a(z) "${device.name}" nem nyugtázta 3 mp-en belül.`,
    });
  } catch (error: any) {
    console.error('Parancsküldési hiba:', error);
    await writeAuditLog(user, action, 'HIBA', `${device.name}: ${error?.message || 'ismeretlen hiba'}`);

    return NextResponse.json(
      { error: 'Hiba történt a parancs küldésekor.' },
      { status: 500 }
    );
  } finally {
    client.end(true);
  }
}
