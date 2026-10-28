-- =========================================================================
-- SUPABASE ADATBÁZIS SÉMA: audit_logs TÁBLA LÉTREHOZÁSA
-- =========================================================================
-- Ezt a szkriptet másold be a Supabase felületén az "SQL Editor" menüpontba,
-- majd kattints a "Run" gombra.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index a gyors időrendi lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS (Row Level Security) engedélyezése
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Csak olvasási szabály az autentikált felhasználóknak
CREATE POLICY "Autentikált felhasználók olvashatják az audit logot"
ON public.audit_logs FOR SELECT
TO authenticated
USING (true);

-- Beszúrás engedélyezése a szolgáltatás (service role) számára
CREATE POLICY "Szerveroldali beszúrás engedélyezése"
ON public.audit_logs FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (true);
