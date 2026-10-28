require('dotenv').config({ path: '.env.local' });
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// Supabase kapcsolat inicializálása a .env.local fájrból
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Hiba: Hiányzanak a Supabase környezeti változók a .env.local fájlból!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);



// Csatlakozás a helyi Mosquitto brókerhez hitelesítéssel
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'esp32',
  password: 'Jonas2022'
});

client.on('connect', () => {
  console.log('✅ Sikeresen kapcsolódva a helyi Mosquitto brókerhez!');
  
  // Feliratkozás az ESP32 státusz topikjára (ahova a hardver küldi a JSON státuszt)
  client.subscribe('otthon/kapu/statusz', (err) => {
    if (!err) {
      console.log('📥 Sikeresen feliratkozva az "otthon/kapu/statusz" topikra.');
    } else {
      console.error('❌ Hiba a feliratkozás során:', err);
    }
  });
});

client.on('message', async (topic, message) => {
  const msgString = message.toString();
  console.log(`\n📨 Új MQTT üzenet érkezett [${topic}]: ${msgString}`);

  if (topic === 'otthon/kapu/statusz') {
    try {
      const data = JSON.parse(msgString); // Pl. {"connection":"ONLINE"} vagy {"connection":"OFFLINE"}
      const connectionState = data.connection; 

      // Átalakítás a Supabase 'devices' tábla státusz formátumára ('Online' vagy 'Offline')
      const dbStatus = connectionState === 'ONLINE' ? 'Online' : 'Offline';

      // Frissítés a Supabase adatbázisban az 'esp32' nevű eszközre
      const { error } = await supabase
        .from('devices')
        .update({ status: dbStatus })
        .eq('name', 'esp32');

      if (error) {
        console.error('❌ Hiba a Supabase adatbázis frissítésekor:', error.message);
      } else {
        console.log(`🔄 Supabase sikeresen frissítve! Az ESP32 státusza mostantól: ${dbStatus}`);
      }
    } catch (e) {
      console.error('❌ Hiba a JSON üzenet feldolgozása közben:', e.message);
    }
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT hiba történt:', err);
});