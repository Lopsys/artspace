-- Cole no SQL Editor do Supabase (role postgres) e rode.
-- Confirma os e-mails da equipe para o login passar a funcionar.

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email in (
  'maycom@artspace.com.br',
  'jhonatas@artspace.com.br',
  'jonh@artspace.com.br',
  'lucas@artspace.com.br',
  'larisse@artspace.com.br'
);

update auth.identities
set
  identity_data = jsonb_set(
    coalesce(identity_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  ),
  updated_at = now()
where user_id in (
  select id
  from auth.users
  where email in (
    'maycom@artspace.com.br',
    'jhonatas@artspace.com.br',
    'jonh@artspace.com.br',
    'lucas@artspace.com.br',
    'larisse@artspace.com.br'
  )
);

select id, email, email_confirmed_at
from auth.users
where email like '%@artspace.com.br'
order by email;
