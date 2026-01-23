-- Create enum for access type
CREATE TYPE public.tipo_acesso AS ENUM ('visitante', 'prestador');

-- Create enum for status
CREATE TYPE public.status_liberacao AS ENUM ('ativo', 'expirado');

-- Create admins table (linked to auth.users)
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create liberacoes table
CREATE TABLE public.liberacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_pessoa TEXT NOT NULL,
  cpf TEXT NOT NULL,
  tipo_acesso tipo_acesso NOT NULL,
  quadra TEXT NOT NULL,
  lote TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status status_liberacao NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

-- Enable RLS on both tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
CREATE POLICY "Admins can view own profile"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update own profile"
  ON public.admins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for liberacoes table
CREATE POLICY "Authenticated admins can view all liberacoes"
  ON public.liberacoes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can insert liberacoes"
  ON public.liberacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update liberacoes"
  ON public.liberacoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create function to auto-update expired status
CREATE OR REPLACE FUNCTION public.update_expired_liberacoes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.liberacoes
  SET status = 'expirado'
  WHERE data_fim < CURRENT_DATE AND status = 'ativo';
$$;

-- Create index for faster queries
CREATE INDEX idx_liberacoes_status ON public.liberacoes(status);
CREATE INDEX idx_liberacoes_cpf ON public.liberacoes(cpf);
CREATE INDEX idx_liberacoes_quadra_lote ON public.liberacoes(quadra, lote);
CREATE INDEX idx_liberacoes_data_fim ON public.liberacoes(data_fim);