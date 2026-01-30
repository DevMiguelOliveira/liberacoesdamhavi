-- Criar tabela de entregas/encomendas
CREATE TABLE IF NOT EXISTS public.entregas (
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
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated admins can view all entregas"
  ON public.entregas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can insert entregas"
  ON public.entregas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update entregas"
  ON public.entregas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can delete entregas"
  ON public.entregas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_entregas_status ON public.entregas(status);
CREATE INDEX idx_entregas_quadra_lote ON public.entregas(quadra, lote);
CREATE INDEX idx_entregas_criado_em ON public.entregas(criado_em);
