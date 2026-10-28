-- =========================================================================
-- SUPABASE MIGRÁCIÓ: MQTT broker beállítások + eszközönkénti topic
-- =========================================================================
-- Ezt a szkriptet másold be a Supabase felületén az "SQL Editor" menüpontba,
-- majd kattints a "Run" gombra. Többször is lefuttatható.

-- 1. Rendszerbeállítások (kulcs-érték párok, pl. mqtt_host, mqtt_port)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS bekapcsolva, szabály nélkül: csak a szerver (service role) érheti el,
-- a böngészőből közvetlenül nem olvasható és nem írható.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Eszközönkénti MQTT topic-előtag
-- Pl. "otthon/kapu" esetén a topicok:
--   otthon/kapu/parancs  -> NYIT / ZAR parancsok
--   otthon/kapu/statusz  -> nyugták az ESP32-től
--   otthon/kapu/online   -> ONLINE / OFFLINE (retained + LWT)
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS topic_prefix TEXT;
