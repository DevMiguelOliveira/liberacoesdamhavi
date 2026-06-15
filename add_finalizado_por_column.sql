-- Adicionar a coluna finalizado_por na tabela de ocorrencias
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS finalizado_por TEXT;
