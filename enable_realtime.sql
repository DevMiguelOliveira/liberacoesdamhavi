-- =====================================================
-- HABILITAR REALTIME PARA AS TABELAS DO SISTEMA
-- =====================================================
-- Execute este script no SQL Editor do Supabase para
-- habilitar a atualização em tempo real entre usuários.
-- =====================================================

-- Habilitar Realtime para a tabela 'liberacoes'
ALTER PUBLICATION supabase_realtime ADD TABLE liberacoes;

-- Habilitar Realtime para a tabela 'encomendas'
ALTER PUBLICATION supabase_realtime ADD TABLE encomendas;

-- =====================================================
-- OPCIONAL: Verificar se as tabelas foram adicionadas
-- =====================================================
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- =====================================================
-- NOTA: Após executar este script, as mudanças nas
-- tabelas serão propagadas automaticamente para todos
-- os usuários conectados ao sistema.
-- =====================================================
