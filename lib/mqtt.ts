import mqtt, { MqttClient } from 'mqtt';

// Globális kliens változó, hogy ne hozzunk létre feleslegesen több kapcsolatot
let client: MqttClient | null = null;

/**
 * 1. KAPCSOLÓDÁS (`connectToMqtt`)
 * Felépíti a folyamatos WebSocket kapcsolatot a HiveMQ Cloud szerverrel.
 */
export function connectToMqtt(): MqttClient {
  if (client && client.connected) {
    return client;
  }

  // A környezeti változók beolvasása (.env.local)
  // FONTOS: Jelszavak és hitelesítő adatok kizárólag a .env.local fájlban szerepelhetnek!
  const host = process.env.NEXT_PUBLIC_MQTT_HOST || '';
  const port = process.env.NEXT_PUBLIC_MQTT_PORT || '1883';
  const username = process.env.NEXT_PUBLIC_MQTT_USERNAME || '';
  const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD || '';

  // WebSocket URL felépítése (wss:// a biztonságos vállalati kapcsolathoz)
  const connectUrl = `wss://${host}:${port}/mqtt`;

  client = mqtt.connect(connectUrl, {
    clientId: `nextjs_${Math.random().toString(16).substring(2, 10)}`,
    username,
    password,
    clean: true,
    reconnectPeriod: 1000, // Automatikus újracsatlakozás 1 mp után, ha megszakad
    connectTimeout: 30 * 1000,
  });

  client.on('connect', () => {
    console.log('📡 Sikeresen csatlakozva a HiveMQ Cloud brókerhez!');
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Kapcsolódási hiba:', err);
  });

  return client;
}

/**
 * 2. ÜZENET KÜLDÉSE (`publishMessage`)
 * Parancs küldése egy adott csatornára (pl. "haz/kapu" -> "OPEN")
 */
export function publishMessage(topic: string, message: string): void {
  const mqttClient = connectToMqtt();

  if (mqttClient) {
    mqttClient.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        console.error(` Hiba az üzenet küldésekor a(z) "${topic}" csatornára:`, error);
      } else {
        console.log(`📤 Üzenet elküldve -> Csatorna: [${topic}] | Üzenet: "${message}"`);
      }
    });
  }
}

/**
 * 3. ÜZENET FOGADÁSA / FELIRATKOZÁS (`subscribeToTopic`)
 * Feliratkozik egy csatornára (pl. "haz/kapu/statusz") és értesít, ha üzenet érkezik.
 */
export function subscribeToTopic(
  topic: string,
  onMessageReceived: (topic: string, message: string) => void
): void {
  const mqttClient = connectToMqtt();

  mqttClient.subscribe(topic, { qos: 1 }, (err) => {
    if (!err) {
      console.log(`📥 Sikeres feliratkozás a csatornára: [${topic}]`);
    } else {
      console.error(` Hiba a feliratkozáskor a(z) "${topic}" csatornára:`, err);
    }
  });

  // Amikor bármilyen üzenet érkezik a brókertől
  mqttClient.on('message', (receivedTopic, payload) => {
    if (receivedTopic === topic) {
      const message = payload.toString();
      console.log(`📩 Új üzenet érkezett [${receivedTopic}]: ${message}`);
      onMessageReceived(receivedTopic, message);
    }
  });
}