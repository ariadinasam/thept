
-- Storage bucket para documentos de vagas especiais
INSERT INTO storage.buckets (id, name, public) VALUES ('permission-docs', 'permission-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own permission docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'permission-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own permission docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'permission-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own permission docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'permission-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Coluna para guardar paths de documentos por permissão
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS permission_documents jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Aplicações de parceiros
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  category text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit partner application"
ON public.partner_applications FOR INSERT
WITH CHECK (true);

-- Mensagens de contato
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact message"
ON public.contact_messages FOR INSERT
WITH CHECK (true);
