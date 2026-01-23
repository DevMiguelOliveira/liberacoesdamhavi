CREATE OR REPLACE FUNCTION public.update_expired_liberacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Compara com a data atual no fuso horário de São Paulo para evitar expiração prematura
  UPDATE public.liberacoes
  SET status = 'expirado'
  WHERE data_fim < (current_timestamp AT TIME ZONE 'America/Sao_Paulo')::date 
  AND status = 'ativo';
END;
$$;
