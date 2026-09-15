# Artspace Barbearia

Sistema de agenda da Artspace: landing pública, agendamento do cliente e dashboards internas. Identidade: preto, ouro e creme.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — a landing é a home. Equipe entra em `/login`.

No Supabase, SQL Editor:

1. `supabase/schema.sql` (projeto novo) **ou**, se o schema interno já rodou, só `supabase/public-booking.sql`.
2. Authentication → Providers → Email → **Confirm email** desligado.

Para o admin criar profissionais e o cliente gravar horário, precisa de `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.

### Equipe

Senha: `artspace123`

| Pessoa | E-mail | Acesso |
| --- | --- | --- |
| Maycom Michel | maycom@artspace.com.br | Agenda + Admin |
| Jhonatas | jhonatas@artspace.com.br | Tatuagem |
| Jonh Lenno | jonh@artspace.com.br | Barbearia |
| Lucas Souza | lucas@artspace.com.br | Barbearia |
| Larisse Ribeiro | larisse@artspace.com.br | Piercing |

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

## Fora desta fatia

- Evolution API / WhatsApp
- Pagamento pelo sistema
