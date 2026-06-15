-- Criar a tabela de ocorrências e notificações
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('finalizada', 'pendente', 'recusada')) DEFAULT 'pendente',
  autor TEXT NOT NULL,
  motivo_recusa TEXT, -- Campo opcional para justificar recusadas
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

-- Habilitar Segurança Row Level Security (RLS)
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Admins podem visualizar ocorrencias"
  ON public.ocorrencias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem criar ocorrencias"
  ON public.ocorrencias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem atualizar ocorrencias"
  ON public.ocorrencias
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem excluir ocorrencias"
  ON public.ocorrencias
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Habilitar o Realtime para a tabela ocorrencias (para atualização automática em tempo real)
-- Nota: Caso a publicação supabase_realtime não exista ou a tabela já esteja nela, ignorar erros.
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocorrencias;
