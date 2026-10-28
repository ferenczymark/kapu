import { NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';

// Supabase admin kliens a JWT token ellenőrzéséhez
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Engedélyezett parancsok listája — a kliens nem küldhet tetszőleges szöveget
const ALLOWED_ACTIONS = ['NYIT', 'ZAR'];

export async function POST(request: Request) {
  try {
    // 1. JOGOSULTSÁG-ELLENŐRZÉS: Supabase JWT token validálása
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Nincs jogosultság. Jelentkezz be!' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Érvénytelen vagy lejárt token. Jelentkezz be újra!' },
        { status: 403 }
      );
    }

    // 2. Mit kér a felhasználó? (pl. action: "NYIT" vagy "ZAR")
    const body = await request.json();
    const { action } = body;

    // Csak engedélyezett parancsok mehetnek át
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Érvénytelen parancs. Engedélyezett: ${ALLOWED_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 3. Kapcsolódás a Mosquitto brókerhez (sima MQTT, 1883-as port, titkosítás nélkül)
    const topic = process.env.MQTT_GATE_TOPIC!;

    await new Promise<void>((resolve, reject) => {
      const mqttClient = mqtt.connect(process.env.MQTT_URL!, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      });

      mqttClient.on('connect', () => {
        console.log('✅ Sikeresen csatlakozva a Mosquitto brókerhez.');

        // Üzenet publikálása a hardvernek
        // A QoS: 1 garantálja, hogy a parancs legalább egyszer célba érjen.
        mqttClient.publish(topic, action, { qos: 1 }, (error) => {
          if (error) {
            console.error('❌ Hiba az MQTT küldés során:', error);
            mqttClient.end();
            reject(error);
          } else {
            console.log(`📤 Parancs elküldve: [${topic}] -> "${action}" (felhasználó: ${user.email})`);
            mqttClient.end();
            resolve();
          }
        });
      });

      mqttClient.on('error', (err) => {
        console.error('❌ MQTT Kapcsolati hiba:', err);
        mqttClient.end();
        reject(err);
      });
    });

    // --- AUDIT LOGOLÁS (Supabase audit_logs tábla) ---
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          user_id: user.id,
          user_email: user.email,
          action: action,
          status: 'SIKERES',
          details: `Parancs kiküldve a(z) ${topic} csatornára`,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      console.error('Audit log mentési hiba:', logErr);
    }
    // --------------------------------------------------

    // 4. Sikeres válasz küldése a frontendnek
    return NextResponse.json({
      success: true,
      message: `A(z) ${action} parancs sikeresen továbbítva a kapunak.`,
    });

  } catch (error: any) {
    console.error('API Végpont hiba:', error);

    // Hiba auditálása
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          action: 'ISMERETLEN',
          status: 'HIBA',
          details: error?.message || 'Belső szerverhiba',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (_) {}

    return NextResponse.json(
      { error: 'Belső szerverhiba történt a hardverrel való kommunikáció során.' },
      { status: 500 }
    );
  }
}