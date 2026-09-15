# Artspace Barbearia — TODO

Sistema interno (tatuagem, barbearia, piercing) + landing de agendamento.

---

## Feito

### Produto e design

- [x] Briefing (ramos, profissionais, admin Maycom, uma agenda por pessoa)
- [x] Identidade visual da logo (preto, ouro, creme, leão)
- [x] Design validado (`docs/design/sistema-artspace.md`)
- [x] Stack: Next.js + TypeScript + Tailwind + Supabase + Vercel
- [x] Landing/GSAP e booking público adiados de propósito
- [x] Evolution API e pagamento online no roadmap (não nesta fatia)

### App interno

- [x] Scaffold Next.js (App Router)
- [x] Login `/login` com identidade Artspace
- [x] Dashboard profissional `/app` (agenda, procedimentos, grade, clientes)
- [x] Dashboard admin `/app/admin` (financeiro, profissionais, clientes, agendas)
- [x] Seletor Agenda | Admin para o Maycom
- [x] Encaixe manual (nome, CPF, telefone, e-mail, procedimento, horário)
- [x] Status: agendado, confirmado, presente, faltou, remarcou
- [x] Remarcar libera o horário antigo e cria um appointment novo
- [x] Excluir agendamento (libera o horário; com confirmação)
- [x] Procedimento com duração + preço; valor congelado no atendimento
- [x] Grade semanal + fechar dia (isolado por profissional)
- [x] Conflito por sobreposição de intervalo (não só o mesmo horário de início)
- [x] Banner “editando agenda de [nome]” no admin
- [x] Gráfico de faturamento (soma dos `present`, mês vs mês)
- [x] CPF duplicado no encaixe reutiliza o cliente e avisa
- [x] Profissional sem admin não entra em `/app/admin`
- [x] `/` é a landing pública; equipe entra em `/login`

### Dados e Auth

- [x] Schema SQL + RLS (`supabase/schema.sql`)
- [x] Tabela `clients` (cliente sem login no Auth)
- [x] Constraint de overlap no Postgres
- [x] Projeto Supabase ligado (`.env.local` com URL + publishable key)
- [x] Login/cadastro da equipe via Supabase Auth
- [x] E-mails da equipe em `@artspace.com.br` (`.local` o Auth recusa)
- [x] Confirm email desligado no dashboard
- [x] SQL para confirmar usuários (`supabase/confirm-users.sql`)
- [x] Schema aplicado no SQL Editor
- [x] Usuários confirmados (`email_confirmed_at`)
- [x] Primeiro login real do Maycom (`maycom@artspace.com.br`)
- [x] API server-side para criar profissional (precisa da service role)
- [x] Testes de regras (overlap, folga isolada, faturamento só `present`)
- [x] Lint e typecheck passando

---

## Em andamento / go-live interno

- [x] Primeiro login dos outros 4 profissionais
- [x] Colar `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` (criar profissional pelo admin)
- [x] Teste manual: encaixe, os 4 status, remarcar, fechar dia, gráfico, CRUD de procedimento

---

## Feito nesta fatia — landing e agendamento público

- [x] Landing `/` (IDV da logo, mobile-first)
- [x] Animações GSAP + scroll
- [x] Fluxo: procedimento → profissional → horários livres → nome/CPF/telefone
- [x] Slots gerados pela grade − bloqueios − appointments ocupados
- [x] Agendamento público sem login (nome, telefone, CPF)
- [x] Login do cliente (não entra em `/app`)
- [x] Área simples “meus horários” para o cliente
- [x] Endereço, telefone e Instagram da Artspace na landing
- [x] Horário comercial padrão documentado na grade inicial

---

## Depois — automação e dinheiro

- [ ] Evolution API / WhatsApp (confirmação e lembrete)
- [ ] Cliente confirma pelo link/mensagem (hoje só a dash marca status)
- [ ] Pagamento pelo sistema (tabela `payments` ligada ao appointment)
- [ ] Sinal/depósito online (se o estúdio quiser)

---

## Qualidade, deploy e extra

- [ ] Testes RLS no banco (profissional não edita agenda alheia; admin sim)
- [ ] Middleware Next reforçando sessão (hoje o guard é no client)
- [ ] Deploy na Vercel
- [ ] E-mails reais da equipe no Auth (hoje placeholders `@artspace.com.br`)
- [ ] Trocar senha padrão `artspace123`
- [ ] 2FA, multi-unidade, estoque, comissão (fora do escopo atual)

---

## Equipe (referência)

| Pessoa | Ramos | Admin |
| --- | --- | --- |
| Maycom Michel | Tatuagem + barbearia | Sim |
| Jhonatas | Tatuagem | Não |
| Jonh Lenno | Barbearia | Não |
| Lucas Souza | Barbearia | Não |
| Larisse Ribeiro | Piercing | Não |

**Próximo desenvolvimento:** Evolution API / WhatsApp, depois pagamento.
