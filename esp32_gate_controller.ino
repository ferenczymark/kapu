/*
 * ESP32 KAPUVEZÉRLŐ
 * =========================================================================
 * 1. Csatlakozás a Wi-Fi hálózathoz
 * 2. Csatlakozás az Ubuntu szerveren futó Mosquitto brokerhez
 *    - LWT (Last Will): ha az ESP32 váratlanul leszakad, a broker magától
 *      kiküldi az "OFFLINE" üzenetet az <előtag>/online topicra
 *    - Sikeres csatlakozáskor "ONLINE" (retained) üzenet ugyanoda
 *      -> a webes felület ebből tudja, hogy az eszköz online-e
 * 3. Feliratkozás az <előtag>/parancs topicra (NYIT / ZAR)
 * 4. Nyugta küldése az <előtag>/statusz topicra
 *
 * A TOPIC_PREFIX értéke egyezzen meg a webes felületen az eszközhöz
 * megadott "MQTT topic-előtag" mezővel!
 * =========================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>

// Wi-Fi beállítások
const char* wifi_ssid = "WIFI_NEV";
const char* wifi_password = "WIFI_JELSZO";

// Ubuntu MQTT szerver (ugyanaz, mint az Admin Panelen beállított broker cím)
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;
const char* mqtt_user = "esp32";
const char* mqtt_password = "Jonas2022";

// Eszköz topic-előtagja (webes felületen: "MQTT topic-előtag")
const String TOPIC_PREFIX = "otthon/kapu";

// MQTT témák
const String topic_command = TOPIC_PREFIX + "/parancs";  // NYIT / ZAR
const String topic_status  = TOPIC_PREFIX + "/statusz";  // nyugták
const String topic_online  = TOPIC_PREFIX + "/online";   // ONLINE / OFFLINE (retained)

// Relé: tesztelés alatt maradjon false, ilyenkor csak a soros portra ír
const bool RELAY_ENABLED = false;
const int RELAY_PIN = 26;
const int PULSE_MS = 500;  // gombnyomás szimulálása (ms)

WiFiClient espClient;
PubSubClient client(espClient);

// Relé rövid meghúzása (a távirányító gombjának megnyomása)
void pulseRelay() {
  if (!RELAY_ENABLED) return;

  digitalWrite(RELAY_PIN, HIGH);
  delay(PULSE_MS);
  digitalWrite(RELAY_PIN, LOW);
}

// Beérkező MQTT üzenet feldolgozása
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.print("Kapott MQTT uzenet: ");
  Serial.println(message);

  // A webes felület az üzenet elejét figyeli ("NYIT..." / "ZAR..."),
  // ebből tudja, hogy a parancs megérkezett.
  if (message == "NYIT") {
    Serial.println("KAPU NYITASA");
    pulseRelay();
    client.publish(topic_status.c_str(), "NYIT parancs megkapva");
  }
  else if (message == "ZAR") {
    Serial.println("KAPU ZARASA");
    pulseRelay();
    client.publish(topic_status.c_str(), "ZAR parancs megkapva");
  }
  else {
    Serial.println("Ismeretlen parancs");
    client.publish(topic_status.c_str(), "Ismeretlen parancs");
  }
}

// Wi-Fi csatlakozás
void setup_wifi() {
  Serial.print("Csatlakozas a Wi-Fi halozathoz");

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi csatlakoztatva!");
  Serial.print("ESP32 IP-cime: ");
  Serial.println(WiFi.localIP());
}

// MQTT csatlakozás
void reconnect() {
  while (!client.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
      setup_wifi();
    }

    Serial.print("Csatlakozas az MQTT szerverhez... ");

    // Egyedi kliensazonosító a MAC-címből, hogy több ESP32 ne lökje le egymást
    String clientId = "ESP32_" + WiFi.macAddress();
    clientId.replace(":", "");

    // Utolsó paraméterek: LWT topic, QoS 1, retained, "OFFLINE" üzenet
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password,
                       topic_online.c_str(), 1, true, "OFFLINE")) {
      Serial.println("SIKERES!");

      // Retained: a broker megjegyzi, a webes felület bármikor kiolvashatja
      client.publish(topic_online.c_str(), "ONLINE", true);

      client.subscribe(topic_command.c_str(), 1);
      Serial.print("Feliratkozva: ");
      Serial.println(topic_command);
    }
    else {
      Serial.print("Hiba, kod: ");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  setup_wifi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  // Gyorsabb offline-észlelés: a broker ~1,5 × 15 mp után küldi ki az LWT-t
  client.setKeepAlive(15);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }

  client.loop();
}
