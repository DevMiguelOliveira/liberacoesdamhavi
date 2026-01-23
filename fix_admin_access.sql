-- Comandos para corrigir manualmente o acesso de administrador
-- Copie e cole no SQL Editor do Supabase para corrigir o erro "Acesso Negado"

-- 1. Inserir um registro na tabela 'admins' para o usuário 'admin@damhavi.com', se ainda não existir.
-- Isso é necessário porque a trigger 'handle_new_user' só funciona para NOVOS usuários.
-- Se o usuário já foi criado antes, ele precisa ser inserido manualmente.

INSERT INTO public.admins (user_id, login, nome)
SELECT id, 'admin', 'Administrador Global'
FROM auth.users
WHERE email = 'admin@damhavi.com' -- O email DEVE bater exatamente com o que está no Authentication
ON CONFLICT (user_id) DO UPDATE
SET login = 'admin', nome = 'Administrador Global';

-- 2. Verificar se a inserção funcionou
-- O comando abaixo deve retornar pelo menos uma linha
-- SELECT * FROM public.admins;
