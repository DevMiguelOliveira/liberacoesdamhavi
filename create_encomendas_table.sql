-- Criar tabela de encomendas
CREATE TABLE IF NOT EXISTS public.encomendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_entregador TEXT NOT NULL,
  empresa TEXT NOT NULL,
  codigo TEXT NOT NULL,
  quadra TEXT NOT NULL,
  lote TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated admins can view all encomendas"
  ON public.encomendas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can insert encomendas"
  ON public.encomendas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update encomendas"
  ON public.encomendas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can delete encomendas"
  ON public.encomendas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_encomendas_status ON public.encomendas(status);
CREATE INDEX idx_encomendas_quadra_lote ON public.encomendas(quadra, lote);
CREATE INDEX idx_encomendas_criado_em ON public.encomendas(criado_em);
