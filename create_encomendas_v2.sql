-- ATENÇÃO: Este script irá recriar a tabela. Dados existentes serão perdidos se não for feito backup.
-- O objetivo é alinhar o banco de dados com a nova estrutura do front-end (sem código e sem status).

-- 1. Remover tabela antiga se existir
DROP TABLE IF EXISTS public.encomendas CASCADE;

-- 2. Criar a tabela de encomendas atualizada
CREATE TABLE public.encomendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_entregador TEXT NOT NULL,
  empresa TEXT NOT NULL,
  destino TEXT NOT NULL DEFAULT 'CON999', -- Substitui quadra e lote
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

-- 3. Habilitar Segurança (RLS)
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas de Acesso (Policies)

-- Permitir visualizar (SELECT)
CREATE POLICY "Admins podem visualizar encomendas"
  ON public.encomendas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Permitir inserir (INSERT)
CREATE POLICY "Admins podem criar encomendas"
  ON public.encomendas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Permitir atualizar (UPDATE)
CREATE POLICY "Admins podem atualizar encomendas"
  ON public.encomendas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Permitir excluir (DELETE)
CREATE POLICY "Admins podem excluir encomendas"
  ON public.encomendas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- 5. Criar Índices para Performance
-- Índice para filtros de data (usado no Dashboard 'Hoje' e no Histórico ordenado)
CREATE INDEX idx_encomendas_criado_em ON public.encomendas(criado_em);

-- Índice para busca rápida por texto (se necessário no futuro ou para buscas combinadas)
CREATE INDEX idx_encomendas_entregador ON public.encomendas(nome_entregador);
