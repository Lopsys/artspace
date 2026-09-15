# Artspace Barbearia — Design do sistema

Status: validado com o produto. Dashboards internas no ar. Landing/GSAP e agendamento público na story 1.2.

---

## 1. Resumo do entendimento

- Sistema interno da **Artspace Barbearia** (tatuagem, barbearia, piercing), identidade preto + ouro da logo (leão, `ARTSPACE` creme, `Barbearia` dourada).
- Objetivo: cada profissional opera a própria agenda, status de atendimento e catálogo; o admin vê financeiro, pessoas e todas as agendas.
- Usuários desta fatia: profissionais e o admin (Maycom Michel). Cliente final só entra depois, na landing.
- Primeira entrega: login real, dashboards (profissional + admin), banco Supabase. Encaixe manual de horários.
- Fora desta fatia original: Evolution API / WhatsApp, pagamento pelo sistema. Landing e booking público: story 1.2.

## 2. Premissas

- Uma agenda por pessoa; dois cargos não geram dois calendários.
- Status só na dashboard: confirmado, presente, faltou, remarcou.
- Admin e profissional montam a grade; fechar um dia é isolado por profissional.
- Procedimento nasce com **duração** e **preço**. Appointment congela o preço.
- Faturamento = soma dos appointments `present` no mês.
- Maycom: `is_admin` + ramos tattoo e barbearia; vê e edita qualquer agenda.
- Pagamento no estúdio. Sem comissão, produto ou checkout.
- Profissionais iniciais: Maycom (admin, tattoo, barbearia), Jhonatas (tattoo), Jonh Lenno e Lucas Souza (barbearia), Larisse Ribeiro (piercing).
- Dashboard usável no desktop/tablet e aceitável no celular.
- Fuso `America/Sao_Paulo`, pt-BR, BRL.
- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth, Postgres, RLS) + Vercel.
- Escala: 1 unidade, até ~10 profissionais. Manutenção do código: dono do repositório.

## 3. Não-objetivos (dashboards 1.1)

- Evolution API / WhatsApp
- Pagamento online (gancho futuro: `payments.appointment_id`)
- Multi-unidade, estoque, comissão, 2FA

Landing cinematográfica / GSAP e agendamento público: ver `docs/stories/1.2.landing-agendamento-publico.md`.

## 4. Arquitetura

Um único app Next.js.

| Área | Rotas | Quem entra |
| --- | --- | --- |
| Auth | `/login` | Qualquer usuário Auth |
| Profissional | `/app` (agenda, procedimentos, grade, clientes atendidos) | `role = professional` |
| Admin | `/app/admin` (financeiro, profissionais, clientes, agendas) | `is_admin = true` |

Seletor **Agenda | Admin** no topo para o Maycom. Sem flag admin, `/app/admin` redireciona para `/app`. Cliente (quando existir) nunca entra em `/app`.

RLS é a fronteira de segurança. Middleware só reforça sessão e papel. `service_role` do Supabase só no servidor, só para o admin criar conta de profissional.

## 5. Papéis e pessoas

- `professional` — sempre tem dashboard de agenda.
- `is_admin` — flag no mesmo `profile`; não é conta separada.
- `client` — reservado; nesta fatia o cliente é criado no encaixe (profile + appointment).
- Ramos (`tattoo`, `barber`, `piercing`) em tabela N:N `professional_branches`.

## 6. Modelo de dados

- **`profiles`** — Auth user: nome, telefone, CPF (único), e-mail, `role`, `is_admin`.
- **`professional_branches`** — profissional × ramo.
- **`procedures`** — `professional_id`, ramo, nome, duração, preço. Soft-archive se houver horário futuro.
- **`availability_rules`** — grade semanal (dia, início, fim, intervalo).
- **`availability_blocks`** — folga / fechar o dia.
- **`appointments`** — cliente, profissional, procedimento, `starts_at`, `ends_at`, `price_snapshot`, status: `scheduled` | `confirmed` | `present` | `no_show` | `rescheduled`.

Conflito = **sobreposição de intervalo** no mesmo profissional (`starts_at`/`ends_at`), não igualdade de horário de início. Constraint/exclusão no banco + checagem na app.

Ocupam slot: `scheduled`, `confirmed`, `present`. Liberam: `no_show`, `rescheduled`.

## 7. Fluxos desta fatia

1. Login → `/app` (ou `/app/admin` se o Maycom escolher).
2. Encaixe manual: cliente (CPF existente reutiliza e avisa; novo cria profile), procedimento, início; fim = início + duração; preço copiado.
3. Status: confirmado / presente / faltou / remarcar. Remarcar exige novo `starts_at` no ato (antigo vira `rescheduled`, nasce um appointment novo).
4. Procedimentos: CRUD dos ramos do profissional; preço/duração obrigatórios e > 0; editar não reescreve appointments velhos.
5. Grade: semana padrão + fechar dia.
6. Admin: CRUD profissional (Auth + ramos; falha de Auth não deixa profile órfão), todas as agendas (banner persistente “editando agenda de [nome]”), todos os clientes, gráfico mês vs mês só com `present`. Trocar `present` ↔ `no_show` recalcula o mês.

## 8. Telas

Shell escuro, ouro só em acento. Sidebar: Agenda, Procedimentos, Grade, Clientes. Admin acrescenta Financeiro, Profissionais, Clientes (global), Agendas.

Agenda: calendário semana/dia, card com cliente, procedimento, duração, valor, status atual em destaque. Estados vazios explícitos.

Landing `/` nesta fatia: placeholder mínimo ou redirect para `/login` — a página real fica para depois.

## 9. Erros

Mensagem específica, nunca sucesso mentiroso.

- Intervalo ocupado ou dia fechado → “Esse intervalo não está livre.”
- CPF já existente no encaixe → reutiliza e avisa.
- Sessão expirada → `/login` e retorno à origem.
- Sem permissão → redirect sem vazar dados.
- Rede/Supabase → banner “não foi possível salvar; tente de novo”.

## 10. Testes

- RLS: isolamento profissional / cliente; admin all.
- Sobreposição de intervalos; remarcar libera o antigo; fechar dia isolado.
- Financeiro só `present`; `no_show` reduz o mês.
- Procedimento inválido não salva; edição não altera snapshot.
- Maycom nos dois modos; demais bloqueados em admin.

Verificação manual no browser: login dos 5, encaixe, quatro status, gráfico, CRUD de profissional.

## 11. Riscos

| Risco | Mitigação |
| --- | --- |
| Dois encaixes no mesmo intervalo | Exclusion/constraint no Postgres + erro visível |
| Admin editar a agenda errada | Banner com o nome do profissional ativo |
| Service role no cliente | Apenas server action / route handler |
| CPF/LGPD | RLS; acesso a CPF só admin e profissional do atendimento |
| Contas seed sem e-mail definido | Pedir e-mails na implementação ou usar placeholders documentados |
| Agenda vazia no go-live | Esperado até o primeiro encaixe manual |

## 12. Revisão multi-agente (síntese)

- **Cético:** falha principal seria overlap só por horário de início (tattoo 3h vs corte 45min). Resolvido: overlap de intervalo no banco.
- **Guardian:** `service_role` nunca no browser; escala 1 estúdio cabe no pacote Vercel + Supabase; encrypt de CPF adiado (YAGNI).
- **Advogado do usuário:** seletor admin sem contexto é perigoso — banner obrigatório; status atual precisa estar evidente no card.
- **Árbitro:** design aceitável com as clarificações acima. Remarcação órfã rejeitada (decisão de produto travada).

Disposição: **APPROVED**.

## 13. Decision log

| Decisão | Alternativas | Por quê |
| --- | --- | --- |
| Primeira fatia = dashboards + auth + Supabase | Visual-only; landing junto | Produto pediu dashboards agora; landing com mais calma |
| Login real agora | Seletor fake / seed sem Auth | Cada um já entra no próprio perfil |
| Admin = flag no profissional (Maycom) | Conta só de gestão; qualquer um vira admin | Maycom atende e gestiona no mesmo login |
| Status só na dashboard | Cliente confirma; híbrido | Evolution/WhatsApp é futuro |
| Encaixe manual nesta fatia | Booking público junto | Landing adiada |
| Uma agenda por pessoa | Agenda por ramo | Evita double-book do Maycom |
| Duração + preço no cadastro do procedimento | Grade fixa; preço só no appointment | Profissional define o “produto” completo |
| Preço congelado no appointment | Sempre ler preço atual | Histórico e gráfico estáveis |
| Faturamento = `present` | Status “pago”; comissão | Sem caixa nesta fase |
| Maycom vê e edita todas as agendas | Só leitura; sem agenda alheia | Dono opera o estúdio |
| Monolito Next.js | Dois apps; API própria | YAGNI, um deploy |
| Remarcar = novo appointment no ato | Status órfão “remarcado” | Slot antigo libera; não fica limbo |
| Pagamento online e Evolution | Implementar já | Roadmap explícito, sem código agora |
| Conflito = overlap de intervalo | Só mesmo `starts_at` | Durações diferentes no mesmo dia |
| Banner ao editar agenda alheia | Confiar no seletor | Evita gravar no profissional errado |

## 14. Perguntas em aberto (não bloqueiam o código)

- E-mails reais para o Auth dos 5 profissionais (senão placeholders `@artspace.local` na seed).
- Horário comercial padrão da primeira grade.
- Endereço, telefone e Instagram (só quando a landing voltar).
