-- Add 'observacoes' column to 'liberacoes' table
ALTER TABLE public.liberacoes
ADD COLUMN IF NOT EXISTS observacoes text null;
