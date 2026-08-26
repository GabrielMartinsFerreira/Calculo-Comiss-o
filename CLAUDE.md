# Sistema de Controle de Comissionamento Comercial

## Visão Geral

Aplicação web para controle e cálculo de comissões comerciais mensais, com módulo de gestão financeira pessoal integrado.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Shadcn UI · Recharts · Framer Motion · Supabase · @supabase/ssr · @ducanh2912/next-pwa · Capacitor (Android APK)

**Deploy:** Vercel (auto-deploy a cada push em `master`). URL: `https://calculo-comiss-o.vercel.app`

**APK Android:** Capacitor em server-mode — a WebView carrega a URL Vercel em tempo real. Cada deploy Vercel atualiza o app automaticamente sem rebuildar o APK.

---

## Autenticação e Segurança

### Pacotes
- `@supabase/ssr`: cliente SSR com suporte a cookies — `createBrowserClient` (client) e `createServerClient` (middleware/server).

### Arquitetura de Auth
| Arquivo | Papel |
|---------|-------|
| `middleware.ts` | Protege todas as rotas; `/login` se não autenticado; gate de assinatura → `/checkout` |
| `lib/supabase-server.ts` | `createSupabaseServer()` — cliente servidor com cookies do Next.js 15 |
| `lib/supabase-middleware.ts` | `createMiddlewareClient()` — cliente Supabase ligado a request/response no Edge |
| `lib/supabase.ts` | `createBrowserClient` + funções `signIn`, `signOut`, `getUser` |
| `lib/subscription.ts` | **PURO (edge-safe)** — `isSubscriptionActive`, `isProtectedPath`, `describeSubscription` |
| `lib/subscription-db.ts` | `getMySubscription()` — acesso à tabela (importa o cliente; **não** usar no middleware) |
| `components/auth/LoginForm.tsx` | Login **e cadastro** (alterna Entrar/Criar conta) com "Lembrar-me" |
| `app/login/page.tsx` | Página pública sem sidebar |
| `app/checkout/page.tsx` | Página de cobrança — destino do gate de assinatura |
| `app/configuracoes/page.tsx` | Configurações de Módulos (toggles do menu) |
| `components/layout/ConditionalLayout.tsx` | Renderiza Sidebar/BottomNav só fora de `/login`; verifica `remember_me` no mount |
| `app/layout.tsx` | Server Component async — obtém `initialUser` via `createSupabaseServer()` |

### Gate de Assinatura (Multi-Tenant SaaS)
O `middleware.ts` faz dois níveis de verificação:
1. **Sessão** (rápido, sem rede): presença do cookie `sb-*-auth-token` → redireciona `/login`.
2. **Assinatura** (em `/financas`, `/lancamentos`, `/relatorios`, `/assinaturas`): consulta `subscriptions` via
   `createMiddlewareClient`. Se não estiver `active`/`trial` (ou o período expirou), redireciona `/checkout`.

- A decisão é uma função **pura** `isSubscriptionActive()` (reutilizada no cliente e no edge).
- **Fail-open**: se a tabela ainda não existe (migração 007 não rodada) ou há erro de rede, **não** bloqueia.
- O Dashboard (`/`) fica fora do gate de propósito (funciona como vitrine).
- ⚠️ `lib/subscription.ts` é importado pelo middleware (Edge) — manter **sem** importar o cliente Supabase.

### Cadastro (Sign Up)
- `LoginForm` alterna entre **Entrar** e **Criar conta** (estado `mode`). No cadastro pede **Nome Completo, E-mail e Senha**.
- `signUp()` em `lib/supabase.ts` chama `supabase.auth.signUp` com `options.data.full_name` → grava o nome em **`user_metadata`** (sem tabela de perfil).
- A migração `007` tem o trigger `handle_new_user_subscription()` que dá **14 dias de trial** a cada novo cadastro.
- Se a confirmação de e-mail estiver ativa no Supabase, `signUp` devolve `needsConfirmation = true` (não há sessão imediata) → a UI pede para confirmar o e-mail. Caso contrário, entra direto.

### "Lembrar-me"
- `rememberMe = true` → `localStorage.setItem("remember_me", "true")`
- `rememberMe = false` → `sessionStorage.setItem("session_only", "active")`
- `ConditionalLayout` no mount: se nenhuma flag existir, faz signOut (nova janela de browser sem "lembrar").
- O **nome no topo da Sidebar é dinâmico**: `user.user_metadata.full_name` → username do e-mail → "Utilizador" (sem nome/ano fixos).

### Row Level Security (RLS)
**REGRA CRÍTICA: Nunca desativar o RLS. Todas as tabelas DEVEM ter políticas RLS ativas.**

Modelo usado em todas as tabelas (`service_orders`, `income_entries`, `expense_entries`, `budget_settings`, `personal_loans`):
```sql
-- Trigger auto-preenche user_id no INSERT
CREATE POLICY "user_own" ON public.<tabela>
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
A função `set_user_id()` (SECURITY DEFINER) preenche `user_id = auth.uid()` automaticamente em todos os INSERTs.

### SQL a executar no Supabase (ordem)
1. `001_initial.sql` — tabela `service_orders`, índices, trigger `updated_at`, view `monthly_summary`
2. `002_finance.sql` — tabelas `income_entries`, `expense_entries`, `budget_settings`, seeds recorrentes
3. `003_loans.sql` — tabela `personal_loans`, coluna `loan_id` em `income_entries`
4. `004_auth_rls.sql` — adiciona `user_id` em todas as tabelas, cria trigger `set_user_id()` e políticas RLS
5. `005_expense_payment.sql` — adiciona `payment_method` em `expense_entries`
6. `006_fix_rls_backfill.sql` — corrige linhas com `user_id = NULL` (executar uma única vez após criar conta)
7. `007_saas_evolutions.sql` — assinaturas, cartões de crédito, orçamentos por categoria, `external_id` (OFX)
8. `008_security_invoker_views.sql` — views `monthly_summary`/`monthly_finance_summary` com `security_invoker` (respeitam o RLS de quem consulta)
9. `009_fix_service_orders_rls.sql` — **reativa o RLS em `service_orders`** (estava desligado → global) + índices `(user_id, competencia)`
10. `010_force_service_orders_isolation.sql` — apaga **todas** as políticas de `service_orders` (qualquer nome) e recria só `user_own` — a 009 não pegou uma política permissiva remanescente
11. `011_user_preferences.sql` — tabela `user_preferences` (JSONB) para flags de comportamento por conta (RLS `user_own`)
12. `012_recurring_services.sql` — tabela `recurring_services` (assinaturas pessoais: Netflix, Spotify, etc.) + coluna `expense_entries.recurring_service_id` (FK) — RLS `user_own`
13. Criar conta em Authentication → Users
14. Executar os UPDATE comentados em `004_auth_rls.sql` para migrar dados existentes para o `user_id`

> ⚠️ **Lição (009):** RLS pode ficar **desativado** numa tabela mesmo com a política `user_own` existindo — a política só vale se `relrowsecurity = true`. Verifique com:
> `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'service_orders';`

> A migração 007 é idempotente, cria o trigger de trial (14 dias) para novos utilizadores e
> faz backfill de uma assinatura `active` para os utilizadores existentes (não bloqueia o dono).

---

## Design System — Dark Sci-Fi Sleek

> **REGRA:** Toda nova feature DEVE seguir este design system estritamente.

### Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| Background | `#09090b` (zinc-950) | Fundo da aplicação |
| Card | `rgba(22,27,38,0.8)` | Cards e modais |
| Neon Cyan | `#06b6d4` | Destaque principal, métricas, bordas ativas |
| Neon Green | `#10b981` | Valores pagos, metas atingidas, sucesso |
| Neon Purple | `#8b5cf6` | Alertas, OS pendentes |
| Neon Orange | `#f97316` | Avisos secundários, empréstimos |
| Neon Gold | `#f59e0b` | Mega Meta |

### Tipografia

- **Interface geral:** Inter (`var(--font-inter)`)
- **Valores monetários e códigos de OS:** JetBrains Mono (`var(--font-mono)`, classe `font-mono`)
- Textos secundários usam `text-zinc-500` ou `text-zinc-600`
- Labels de seção usam padrão: `text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest`

### Efeitos Visuais

- **Glassmorphism:** `bg-[rgba(22,27,38,0.8)] backdrop-blur-sm border border-zinc-800/60`
- **Glow neon:** `shadow-neon-cyan` / `shadow-neon-green` (definidos em `tailwind.config.ts`)
- **Hover em cards:** `hover:border-zinc-700 hover:scale-[1.01]`
- **Hover em linhas de tabela:** `hover:bg-zinc-800/30 hover:border-zinc-700/40`
- **Focus em inputs:** `focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40`

### Badges de Status

Sempre usar o componente `Badge` com `pulse={true}` para status **Pendente**:
```tsx
<Badge variant="warning" pulse>Pendente</Badge>   // roxo + pulsante
<Badge variant="success">Pago</Badge>              // verde
```

### Animações (Framer Motion)

- Entrada de elementos: `motion.div` com `initial={{ opacity:0, y:8 }}` e `animate={{ opacity:1, y:0 }}`
- Barras de progresso: `motion.div` com `initial={{ width:"0%" }}` e `transition={{ duration:1.2, ease:[0.34,1.56,0.64,1] }}`
- Página inteira: classe `animate-slide-in` (definida em Tailwind config)

### Padrão de Cabeçalho de Página

```tsx
<div>
  <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// nome-da-secao</p>
  <h1 className="text-2xl font-bold text-zinc-100 leading-none">Título</h1>
  <p className="mt-1 text-sm text-zinc-600">Subtítulo</p>
</div>
```

### Botões

| Variante | Uso |
|----------|-----|
| `default` | Ação primária — fundo cyan sólido |
| `neon` | Ação secundária — borda cyan, fundo transparente |
| `outline` | Ação terciária — borda zinc |
| `ghost` | Ações em tabela / ícones |
| `destructive` | Exclusão — borda vermelha |

---

## Layout Responsivo Mobile

### Arquitetura
- **Desktop (≥768px):** Sidebar lateral fixa com 256px de largura (`w-64`).
- **Mobile (<768px):** Sidebar oculta (`hidden md:flex`); BottomNav fixo no rodapé (`md:hidden`).

### ConditionalLayout (`components/layout/ConditionalLayout.tsx`)
```tsx
<div className="flex min-h-screen w-full overflow-x-hidden">
  <div className="hidden md:flex"><Sidebar /></div>
  <main className="flex-1 pl-0 md:pl-64 min-h-screen pb-20 md:pb-0 overflow-x-hidden">
    <div className="p-4 md:p-8 w-full min-w-0">{children}</div>
  </main>
  <BottomNav />
</div>
```
**Nota crítica:** `overflow-x: hidden` deve estar no wrapper `<div>` — nunca em `html` ou `body`, pois isso bloqueia o `overflow-x: auto` de containers filhos no WebKit/Android WebView.

### BottomNav (`components/layout/BottomNav.tsx`)
Barra de navegação inferior, visível apenas em mobile (`md:hidden`):
- Links de navegação **filtrados pelos módulos ativos** (ver Configurações de Módulos) + botão de logout
- `flex-1` + `min-w-0` + `truncate` em cada item → nunca há scroll horizontal, mesmo com 6 itens
- Ícone ativo: `text-cyan-400` + indicador `h-0.5 w-8 bg-cyan-400` no topo

### Configurações de Módulos (`/configuracoes`)
Permite ao utilizador escolher quais módulos aparecem no menu (experiência modular por cliente).
| Peça | Papel |
|------|-------|
| `lib/modules.ts` | Fonte única dos módulos (`MODULES`) **e flags de comportamento** (`FEATURES`, ex.: `FEATURE_AUTO_COMMISSION`) |
| `components/layout/ModulePrefsContext.tsx` | `ModulePrefsProvider` + `useModulePrefs()` — **módulos** em `localStorage` (dispositivo); **flags de comportamento** no banco (`user_preferences`, sincroniza entre aparelhos) |
| `lib/preferences-db.ts` | `getUserPreferences()` / `saveUserPreferences()` — JSONB em `user_preferences` |
| `app/configuracoes/page.tsx` | Switches por módulo + seção **Comportamento** (flags) |
| `Sidebar` / `BottomNav` | Consomem `isEnabled(key)` e ocultam módulos desativados em tempo real |

Duas naturezas de preferência:
- **Módulos visíveis** = LAYOUT → `localStorage` por dispositivo (instantâneo, sem round-trip).
- **Flags de comportamento** = CONTA → tabela `user_preferences` (JSONB), sincronizadas entre aparelhos. `ready` do contexto só fica `true` após carregar as flags do banco; a página de Finanças espera `ready` antes do 1º load.

Flag atual: **Comissão automática** (`FEATURE_AUTO_COMMISSION`, default ligado) — ver Sincronização de Comissão.

- Apenas **Configurações** tem `toggleable: false` (sempre visível, para o utilizador conseguir reativar módulos). **Dashboard**, Lançamentos, Relatórios, Finanças, **Assinaturas** e **Tutorial** são todos ativáveis.

### Página de Assinaturas (`/assinaturas`)
CRUD de serviços recorrentes no cartão de crédito (Netflix, Spotify, planos de saúde, etc.), registrado em `MODULES` como `assinaturas` (ícone `Repeat2`).
- `app/assinaturas/page.tsx` — client component com grid responsivo de cards; 3 KPIs (total mensal, ativos, total de serviços).
- Cada card exibe: nome, valor, categoria, dia de cobrança, cartão vinculado e status (Ativo/Pausado).
- **Botão "Aplicar ao mês"**: chama `syncRecurringServicesToMonth(competencia)` que gera despesas em `expense_entries` para o mês atual — idempotente, pode ser chamado mais de uma vez com segurança.
- **Automação**: `initializeMonth` também chama `syncRecurringServicesToMonth` internamente (fail-open), portanto ao inicializar um novo mês em `/financas`, as despesas de assinatura são criadas automaticamente.
- Toggle Pausar/Reativar inline nos cards (sem abrir modal).
- Modal de edição usa `useEffect` para hidratar os campos ao abrir (`open` + `editing?.id` como deps).
- Protegida pelo gate de assinatura (`/assinaturas` em `PROTECTED_PREFIXES` de `lib/subscription.ts`).

### Correção de Hidratação de Formulários (bug fix)
**Problema:** `OSForm` e `EntryFormModal` são montados fora do `DialogContent` (uma vez ao nível da página) — `useState` lazy initializer só corre no primeiro mount. Ao clicar "Editar" num registro diferente sem fechar o diálogo, o formulário mostrava valores do registro anterior ou valores vazios.

**Solução aplicada:** `useEffect` que chama `setForm(...)` sempre que `open` ou `editing?.id` muda, garantindo hidratação completa ao abrir o diálogo:
```ts
useEffect(() => {
  if (!open) return;
  setForm(editing ? { /* campos do registro */ } : /* valores padrão */);
}, [open, editing?.id]);
```
Padrão aplicado em: `OSForm.tsx`, `EntryFormModal.tsx`, `RecurringServiceModal` (assinaturas).

### Página de Tutorial (`/tutorial`)
Onboarding/documentação para o utilizador final, registrado em `MODULES` (`lib/modules.ts`).
- `app/tutorial/page.tsx` — client component puro (sem deps novas): abas responsivas (`grid-cols-2 sm:grid-cols-4`, sem scroll horizontal) que alternam entre **Comissões, Finanças, Cartões e Empréstimos**.
- Cada módulo tem passos em **acordeão** (animação de altura via Framer Motion), uma **Dica** e ícones Lucide com os acentos neon. Cards de CTA no fim usam `whileInView` (fade-in ao rolar) + hover.
- Fora do gate de assinatura (educacional) e do padrão de design Dark Sci-Fi.
- Preferência de **UI** (não dado de negócio): fica no dispositivo via `localStorage` (`module_prefs_<userId>`), evitando flicker e round-trip ao banco. O `ModulePrefsProvider` envolve a árvore em `ConditionalLayout`.

### Desempenho / Otimizações
- **Finanças:** `syncCommission()` roda **em paralelo** com as buscas independentes (`Promise.all`); só `getIncomes()` espera, pois reflete a comissão sincronizada.
- **Índices compostos** `(user_id, competencia DESC)` em `service_orders`, `income_entries` e `expense_entries` (migração 009) — o filtro mensal é sempre combinado com `user_id` (RLS), então o índice composto evita varredura.
- Dashboard/Lançamentos/Relatórios já carregam dados em `Promise.all`.

### Padrões de responsividade adotados
| Padrão | Uso |
|--------|-----|
| `hidden sm:inline` / `hidden sm:inline-flex` | Oculta elemento secundário no mobile (ex: badge de status, categoria) |
| `hidden sm:block` / `sm:hidden` | Alterna entre layout card (mobile) e tabela (desktop) |
| `w-full sm:w-48` | Selects ocupam largura total em mobile |
| `flex flex-col sm:flex-row` | Headers de página empilham em mobile |
| `grid-cols-1 sm:grid-cols-2` | Grids de formulário colapsam em mobile |
| `sm:opacity-0 sm:group-hover:opacity-100` | Botões de ação visíveis sempre em mobile, hover-only em desktop |

### OSTable — card layout em mobile
`components/lancamentos/OSTable.tsx` usa dois layouts:
- `sm:hidden` → lista de cards (mobile): 3 sub-linhas por OS (OS+Valor / Cliente+Status / Data+Ações)
- `hidden sm:block` → tabela original (desktop) com 7 colunas

---

## PWA e Capacitor (Android APK)

### PWA
Configurado via `@ducanh2912/next-pwa` em `next.config.ts`:
```ts
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});
```
- Manifesto: `public/manifest.json` — nome "GG Tech | Controle Financeiro", theme `#06b6d4`, background `#09090b`
- Ícones: `public/icons/icon-192.png` e `public/icons/icon-512.png`
- Meta tags PWA em `app/layout.tsx`: `manifest`, `appleWebApp`, `themeColor`

### Capacitor (`capacitor.config.ts`)
```ts
{
  appId: "com.ggtech.controle",
  appName: "GG Tech",
  webDir: "out",
  server: {
    url: "https://calculo-comiss-o.vercel.app",  // URL Vercel do projeto
    cleartext: false,
  },
  android: { backgroundColor: "#09090b" },
}
```
O APK é um shell WebView que carrega a URL Vercel. Novos deploys atualizam o app sem redistribuir o APK.

Scripts de build (em `package.json`):
```
npm run cap:add    # cria pasta android/
npm run cap:sync   # sincroniza com o código
npm run cap:open   # abre Android Studio
```

---

## Configuração do Ambiente

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de ambiente
Crie um arquivo `.env.local` na raiz:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica_aqui
```

### 3. Banco de dados
Execute as migrações em ordem no SQL Editor do Supabase (ver seção de Auth acima).

### 4. Iniciar desenvolvimento
```bash
npm run dev
```
Acesse: http://localhost:3000

---

## Modelagem do Banco de Dados

### Tabela: `service_orders`

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Identificador único |
| `os_number` | text | NOT NULL | Número da OS (ex: "OS3994") |
| `client_name` | text | NOT NULL | Nome do cliente |
| `order_date` | date | NOT NULL | Data da OS |
| `order_value` | numeric(12,2) | NOT NULL, CHECK > 0 | Valor do pedido em R$ |
| `payment_method` | text | CHECK IN ('Pix','Boleto','Cartão') | Método de pagamento |
| `status` | text | DEFAULT 'Pendente', CHECK IN (...) | 'Pendente' ou 'Pago' |
| `competencia` | date | NOT NULL | Primeiro dia do mês de competência |
| `user_id` | uuid | REFERENCES auth.users | Preenchido automaticamente pelo trigger |
| `created_at` | timestamptz | DEFAULT now() | Data de criação |
| `updated_at` | timestamptz | DEFAULT now(), trigger | Atualizado automaticamente |

**Índices:** `competencia DESC`, `status`, `os_number`

**View `monthly_summary`:** agrega por competência — total de OS, totais financeiros e comissão calculada.

---

### Tabela: `income_entries`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `competencia` | date NOT NULL | Mês de referência |
| `description` | text NOT NULL | Ex: "60% Salário", "Comissão do Mês" |
| `category` | text | 'Salário' \| 'Benefício' \| 'Transporte' \| 'Comissão' \| 'Empréstimo' \| 'Outro' |
| `type` | text | 'Fixo' \| 'Variável' |
| `amount` | numeric(12,2) | Valor em R$ |
| `due_description` | text | Ex: "5º Dia Útil", "Dia 20 a 23" |
| `is_commission` | boolean | Se `true`, valor é sincronizado automaticamente com as OS pagas |
| `is_recurring` | boolean | Se `true`, é copiado ao inicializar novo mês |
| `loan_id` | uuid | FK para `personal_loans` (parcelas de empréstimo) |
| `status` | text | 'Pendente' \| 'Recebido' |
| `user_id` | uuid | Preenchido pelo trigger RLS |

---

### Tabela: `expense_entries`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `competencia` | date NOT NULL | Mês de referência |
| `description` | text NOT NULL | Ex: "Academia", "Convênio Médico" |
| `category` | text | 'Assinatura' \| 'Saúde' \| 'Cartão' \| 'Alimentação' \| 'Transporte' \| 'Lazer' \| 'Parcela' \| 'Outro' |
| `type` | text | 'Fixo' \| 'Variável' |
| `amount` | numeric(12,2) | Valor em R$ |
| `due_day` | integer | Dia do mês de vencimento (1–31) |
| `is_recurring` | boolean | Copiado ao inicializar novo mês |
| `payment_method` | text | 'Dinheiro' \| 'Pix' \| 'Débito' \| 'Cartão de Crédito' |
| `status` | text | 'Pendente' \| 'Pago' \| 'Aguardando' |
| `user_id` | uuid | Preenchido pelo trigger RLS |

**Lógica de Cartão de Crédito em `computeFinanceSummary`:**
- `totalCreditCardBill` = CC com `status = 'Pago'` (fatura confirmada)
- `totalCreditCardPending` = CC com outro status (em aberto)
- `totalExpenseGeneral` = todas as despesas **excluindo** CC (para não double-contar)
- `totalExpense` inclui tudo (para projeção de saldo)

O `ExpensePanel` separa visualmente despesas CC na seção "Fatura do Cartão".

---

### Tabela: `budget_settings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `competencia` | date UNIQUE NOT NULL | Mês de referência (unique — upsert por mês) |
| `variable_expense_limit` | numeric(12,2) | Limite mensal de despesas variáveis (opcional) |
| `notes` | text | Notas livres |
| `user_id` | uuid | Preenchido pelo trigger RLS |

---

### Tabela: `personal_loans`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `debtor_name` | text NOT NULL | Nome do devedor |
| `description` | text | Observação opcional |
| `installment_amount` | numeric(12,2) | Valor da parcela mensal |
| `total_installments` | integer | Total de parcelas |
| `remaining_installments` | integer | Parcelas restantes |
| `due_day` | integer | Dia de vencimento (1–31) |
| `status` | text | 'Ativo' \| 'Quitado' |
| `start_competencia` | date | Mês em que o empréstimo foi criado |
| `user_id` | uuid | Preenchido pelo trigger RLS |

**Lógica de parcelas (`receiveInstallment` em `lib/finance-db.ts`):**
1. Marca parcela atual (`income_entries`) como `Recebido`
2. Decrementa `remaining_installments` no empréstimo
3. Se `remaining_installments = 0`, marca empréstimo como `Quitado`
4. Caso contrário, cria automaticamente a entrada do próximo mês (evita duplicata via `.maybeSingle()`)

---

### Tabela: `recurring_services` (Migração 012)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `user_id` | uuid | Preenchido pelo trigger RLS |
| `service_name` | text NOT NULL | Nome do serviço (ex: "Netflix", "Spotify") |
| `amount` | numeric(12,2) | Valor da cobrança mensal |
| `billing_day` | integer 1–31 | Dia do mês em que a cobrança ocorre |
| `credit_card_id` | uuid | FK opcional para `credit_cards` |
| `category` | text | Mesmas categorias de `expense_entries` (default: 'Assinatura') |
| `status` | text | 'Ativo' \| 'Pausado' — só os Ativos geram lançamentos |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Atualizado automaticamente pelo trigger |

**Coluna adicionada em `expense_entries`:** `recurring_service_id uuid` — FK para `recurring_services` (ON DELETE SET NULL). Permite dedup por `(recurring_service_id, competencia)` e rastrear a origem de cada despesa gerada.

**Automação:** `syncRecurringServicesToMonth(competencia)` em `lib/finance-db.ts` gera despesas de todos os serviços Ativos no mês informado (idempotente). É chamado automaticamente por `initializeMonth` (fail-open) e manualmente pelo botão "Aplicar ao mês" em `/assinaturas`.

**⚠️ Naming:** a tabela `subscriptions` já existe para gestão SaaS (migração 007). Este módulo usa `recurring_services` para não colidir.

---

### Tabela: `subscriptions` (Evolução A / SaaS)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `user_id` | uuid UNIQUE | FK `auth.users` (uma assinatura por utilizador) |
| `status` | text | 'trial' \| 'active' \| 'past_due' \| 'canceled' |
| `stripe_customer_id` | text | ID do cliente no Stripe |
| `stripe_subscription_id` | text | ID da assinatura no Stripe |
| `current_period_end` | timestamptz | Fim do período/trial — usado pelo gate |

- Trigger `handle_new_user_subscription()` (em `auth.users`): cada novo utilizador ganha 14 dias de `trial`.
- A escrita real é feita pelo **webhook Stripe** com a `service_role` key (ignora RLS). O cliente só lê a própria.

### Tabela: `credit_cards` (Evolução B)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `user_id` | uuid | Preenchido pelo trigger RLS |
| `name` | text NOT NULL | Nome do cartão (ex: "Nubank") |
| `limit_amount` | numeric(12,2) | Limite total |
| `closing_day` | integer | Dia de fechamento da fatura (1–31) |
| `due_day` | integer | Dia de vencimento (1–31) |

- `expense_entries.credit_card_id` (FK opcional) liga uma despesa a um cartão.
- A fatura é **calculada em runtime** por `computeCardInvoices(cards, expenses, competencia)` em `lib/finance.ts`
  (não há view): agrupa as despesas `credit_card_id` por mês, diferencia "Aberta" (com saldo pendente) de "Paga",
  calcula `% do limite` e estima `closingDate`/`dueDate`.

### Tabela: `budget_categories` (Evolução C)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Identificador |
| `budget_setting_id` | uuid | FK `budget_settings` (ON DELETE CASCADE) |
| `user_id` | uuid | Preenchido pelo trigger RLS |
| `category_name` | text | Nome da categoria de despesa |
| `allocated_amount` | numeric(12,2) | Limite alocado para a categoria |

- UNIQUE `(budget_setting_id, category_name)`.
- A migração 007 também corrige `budget_settings`: o UNIQUE passou de `competencia` (global) para
  `(user_id, competencia)` — necessário para multi-tenant.
- `computeBudgetEnvelopes(categories, expenses)` cruza alocação × gasto real e devolve o status de cor.

### Colunas `external_id` (Evolução D — OFX)
`expense_entries.external_id` e `income_entries.external_id` guardam o `<FITID>` do extrato.
Índices únicos parciais `(user_id, external_id)` impedem importar a mesma transação duas vezes.

---

## Módulo de Finanças Pessoais (`app/financas/`)

### Página principal (`app/financas/page.tsx`)
- Seleciona mês/competência (sincroniza lista com `income_entries` + `expense_entries`)
- Ao carregar, executa `syncCommission()` automaticamente (atualiza comissão com as OS pagas)
- Botão "Inicializar Mês": copia entradas recorrentes de meses anteriores para o mês atual
- Botão de configurações: define `variable_expense_limit` por mês em `budget_settings`
- Layout: `HealthDashboard` + grid 2 colunas (`IncomePanel` | `ExpensePanel`)

### Componentes
| Componente | Descrição |
|-----------|-----------|
| `HealthDashboard` | KPIs financeiros: saldo projetado/realizado, % saúde, barra de despesas variáveis vs limite |
| `IncomePanel` | Lista receitas; toggle status Pendente↔Recebido; lógica especial para empréstimos |
| `ExpensePanel` | Lista despesas gerais + seção CC separada; ciclo Pendente→Pago→Aguardando via clique |
| `EntryFormModal` | Modal unificado para criar/editar receitas e despesas (prop `mode="income"|"expense"`) |

### Sincronização de Comissão (`syncCommission`)
- Busca OS com `status='Pago'` do mês, calcula comissão via `calculateCommission()`
- Se já existe entrada `is_commission=true` no mês: faz UPDATE do valor
- Se não existe: INSERT de nova entrada "Comissão do Mês" na categoria "Comissão"

**Flag "Comissão automática" (`FEATURE_AUTO_COMMISSION`, Configurações → Comportamento):**
- **Ligado** (default): `syncCommission` roda no load de `/financas` e o "Inicializar Mês" recria a comissão.
- **Desligado**: `syncCommission` **não** roda no load; `initializeMonth(competencia, true)` passa `skipCommission` e **não** copia a `is_commission`. A entrada existente permanece e **pode ser apagada** — só volta a ser criada ao reativar o flag.
- É preferência de **conta** (tabela `user_preferences`, JSONB) — **sincroniza entre aparelhos** (migração 011).

### Status de Saúde Financeira
| Cor | Condição |
|-----|----------|
| `green` | Saldo projetado positivo e ≥ 20% da receita total |
| `yellow` | Saldo positivo mas < 20% da receita |
| `red` | Saldo projetado negativo |

---

## Regras de Negócio e Cálculo de Comissão

### Faixas de Comissão (sobre o Total Pago do mês)

| Faixa | Total Pago Acumulado | Taxa |
|-------|---------------------|------|
| Mini Meta | R$ 0 até R$ 50.000,00 | 1,5% |
| Meta | R$ 50.000,01 até R$ 70.000 | 2,0% |
| Mega Meta | Acima de R$ 70.000,00 | 2,5% |

**Fórmula (flat rate):** A taxa da faixa em que o total se enquadra é aplicada sobre o TOTAL inteiro.
Replica a lógica: `IF(total<=50000, total*1.5%, IF(total<=70000, total*2%, total*2.5%))`.

**Exemplo:** R$ 59.334 pago → faixa Meta (2%) → comissão = R$ 1.186,68.

### Status das OS
- **Pendente:** OS cadastrada mas pagamento não confirmado. Entra na previsão, não no real.
- **Pago:** Pagamento confirmado. Computa a comissão real do mês.

A comissão "prevista" considera todas as OS. A "real" considera apenas as `status='Pago'`.

---

## Estrutura de Arquivos

```
├── app/
│   ├── layout.tsx                    # Layout raiz — Server Component, obtém initialUser
│   ├── globals.css                   # CSS global com variáveis de tema
│   ├── page.tsx                      # Dashboard principal (KPIs, MetaProgress, RecentOrders)
│   ├── lancamentos/page.tsx          # CRUD de Ordens de Serviço
│   ├── relatorios/page.tsx           # Gráficos e histórico mensal
│   ├── financas/page.tsx             # Gestão financeira pessoal
│   ├── assinaturas/page.tsx          # CRUD de serviços recorrentes no cartão (Netflix, Spotify…) — sync mensal
│   ├── tutorial/page.tsx             # Onboarding/guia — passo a passo de cada módulo (tabs + acordeões)
│   ├── configuracoes/page.tsx        # Configurações de Módulos (toggles do menu)
│   ├── checkout/page.tsx             # Gestão de plano / assinatura (Stripe)
│   ├── api/                          # Rotas server: checkout, webhooks/stripe, portal
│   └── login/page.tsx                # Página pública (login + cadastro)
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx             # Formulário Email/Password + "Lembrar-me"
│   ├── layout/
│   │   ├── Sidebar.tsx               # Menu lateral (desktop md+) — nome dinâmico + filtra módulos
│   │   ├── BottomNav.tsx             # Navegação inferior (mobile <md) — filtra módulos
│   │   ├── ModulePrefsContext.tsx    # ModulePrefsProvider/useModulePrefs (localStorage por user)
│   │   └── ConditionalLayout.tsx     # Orquestra Sidebar/BottomNav + ModulePrefsProvider
│   ├── dashboard/
│   │   ├── KPICards.tsx              # 4 cards de indicadores
│   │   ├── MetaProgress.tsx          # Barra de progresso das faixas de comissão
│   │   └── RecentOrders.tsx          # Últimas 5 OS do mês
│   ├── lancamentos/
│   │   ├── OSForm.tsx                # Modal de criação/edição de OS
│   │   └── OSTable.tsx               # Cards (mobile) + tabela (desktop), busca, sort, paginação
│   ├── relatorios/
│   │   ├── MonthlyChart.tsx          # Gráfico de barras Recharts
│   │   └── MonthlyHistory.tsx        # Histórico por mês em cards
│   ├── financas/
│   │   ├── HealthDashboard.tsx       # KPIs financeiros e indicador de saúde
│   │   ├── IncomePanel.tsx           # Lista e gerencia receitas (inclui empréstimos)
│   │   ├── ExpensePanel.tsx          # Lista e gerencia despesas (inclui seção CC)
│   │   ├── EntryFormModal.tsx        # Modal unificado receita/despesa (+ seletor de cartão)
│   │   ├── BudgetEnvelopes.tsx       # Barras de orçamento por categoria (envelopes)
│   │   ├── BudgetEnvelopeModal.tsx   # Define alocação por categoria
│   │   ├── CreditCardsPanel.tsx      # Faturas dos cartões + CRUD de cartão
│   │   └── OfxImportModal.tsx        # Importa extrato OFX (conciliação bancária)
│   └── ui/                           # Componentes Shadcn UI
├── lib/
│   ├── types.ts                      # Interfaces: ServiceOrder, CommissionBracket, MonthSummary
│   │                                 # + Subscription, SubscriptionStatus, SubscriptionGate
│   ├── subscription.ts               # PURO/edge-safe: isSubscriptionActive, isProtectedPath, describeSubscription
│   ├── subscription-db.ts            # getMySubscription() (importa cliente — fora do edge)
│   ├── stripe.ts                     # getStripe() (lazy) + normalizeStatus (rotas API)
│   ├── supabase-admin.ts             # createSupabaseAdmin() — service_role (webhook, server-only)
│   ├── modules.ts                    # MODULES — definição central da navegação/módulos
│   ├── supabase-middleware.ts        # createMiddlewareClient() para o middleware (Edge)
│   ├── ofx-parser.ts                 # parseOfx() + ofxToExpenseInserts/ofxToIncomeInserts
│   ├── finance.ts                    # Interfaces: IncomeEntry, ExpenseEntry, PersonalLoan, BudgetSettings
│   │                                 # + CreditCard, CardInvoice, BudgetCategory, BudgetEnvelope
│   │                                 # + RecurringService, RecurringServiceInsert (migração 012)
│   │                                 # + computeFinanceSummary(), computeCardInvoices(), computeBudgetEnvelopes()
│   ├── commission.ts                 # COMMISSION_BRACKETS + calculateCommission()
│   ├── supabase.ts                   # createBrowserClient + signIn, signOut, getUser
│   │                                 # + getOrders, createOrder, updateOrder, deleteOrder
│   │                                 # + confirmPayment, getCompetencias, getMonthlyStats
│   ├── supabase-server.ts            # createSupabaseServer() — uso em Server Components
│   ├── finance-db.ts                 # CRUD: getIncomes, createIncome, updateIncome, deleteIncome
│   │                                 # + getExpenses, createExpense, updateExpense, deleteExpense
│   │                                 # + getBudgetSettings, upsertBudgetSettings
│   │                                 # + fetchCommissionForMonth, syncCommission
│   │                                 # + createLoan, receiveInstallment
│   │                                 # + initializeMonth, getFinanceCompetencias
│   │                                 # + getRecurringServices, createRecurringService, updateRecurringService
│   │                                 # + deleteRecurringService, syncRecurringServicesToMonth
│   ├── utils.ts                      # formatCurrency, formatDate, formatMonthYear
│   │                                 # + getCurrentCompetencia, cn
│   └── use-toast.ts                  # Hook de notificações toast
├── middleware.ts                     # Proteção de rotas — redireciona para /login
├── next.config.ts                    # Next.js config + wrapper @ducanh2912/next-pwa
├── capacitor.config.ts               # Config Capacitor (server-mode → URL Vercel)
├── tailwind.config.ts                # Tema custom: shadow-neon-*, animate-slide-in
├── public/
│   ├── manifest.json                 # Manifesto PWA
│   └── icons/
│       ├── icon-192.png              # Ícone PWA 192px
│       └── icon-512.png              # Ícone PWA 512px
└── supabase/migrations/
    ├── 001_initial.sql               # service_orders, índices, view monthly_summary
    ├── 002_finance.sql               # income_entries, expense_entries, budget_settings, seeds
    ├── 003_loans.sql                 # personal_loans, loan_id em income_entries
    ├── 004_auth_rls.sql              # user_id + trigger set_user_id() + políticas RLS
    ├── 005_expense_payment.sql       # payment_method em expense_entries
    ├── 006_fix_rls_backfill.sql      # Backfill user_id=NULL (executar 1x após criar conta)
    ├── 007_saas_evolutions.sql       # subscriptions, credit_cards, budget_categories, external_id (OFX)
    ├── 008_security_invoker_views.sql # views com security_invoker (respeitam RLS)
    ├── 009_fix_service_orders_rls.sql # reativa RLS em service_orders + índices (user_id, competencia)
    ├── 010_force_service_orders_isolation.sql # drop dinâmico de todas as policies + recria user_own
    └── 011_user_preferences.sql       # tabela user_preferences (JSONB) — flags por conta
```

---

## Evoluções SaaS (Migração 007)

Quatro evoluções para tornar o produto multi-tenant e vendável. Toda a lógica respeita a
competência (1º dia do mês), as comissões automáticas e o padrão RLS `user_own`.

### A — Assinaturas / Gateway de Pagamento
Tabela `subscriptions` + gate no `middleware.ts` (ver "Gate de Assinatura"). Trial de 14 dias
automático para novos utilizadores. A integração Stripe (criar sessão de checkout + webhook que
atualiza `status`/`current_period_end` com a `service_role` key) é o passo seguinte; a página
`/checkout` já existe como destino do gate.

### B — Cartões de Crédito e Faturas
Tabela `credit_cards` + `expense_entries.credit_card_id`. `computeCardInvoices()` consolida a fatura
por mês (Aberta/Paga/Vazia, % do limite, vencimento). UI em `CreditCardsPanel`; o `EntryFormModal`
mostra um seletor de cartão quando a forma de pagamento é "Cartão de Crédito".

### C — Orçamentos por Categoria (Envelopes)
Tabela `budget_categories` (filha de `budget_settings`). `computeBudgetEnvelopes()` cruza alocação ×
gasto real. Barras dinâmicas em `BudgetEnvelopes`: **verde ≤70%**, **amarelo 71–90%**,
**vermelho >90%** (pulsante quando passa de 100%). Alocações geridas em `BudgetEnvelopeModal`.

### D — Conciliação Bancária (OFX)
`lib/ofx-parser.ts` faz parse das tags `<STMTTRN>` (DTPOSTED, TRNAMT, MEMO, FITID, TRNTYPE) — puro,
sem dependências. Débitos → despesas, créditos → receitas. `bulkInsertExpenses/bulkInsertIncomes`
inserem em lote com **dedup por `external_id` (FITID)**. UI em `OfxImportModal` (lê o ficheiro local,
mostra prévia e importa). Lançamentos vão para o mês de cada transação.

---

## Fluxos Principais

### Adicionar OS
1. Usuário clica em "Nova OS" na página de Lançamentos.
2. Preenche: número, cliente, data, valor, método, status (padrão: Pendente).
3. `competencia` é derivada automaticamente da `order_date` (primeiro dia do mês).
4. OS salva no Supabase via `createOrder()`.

### Confirmar Pagamento de OS
1. Na tabela de OS (desktop) ou card (mobile), clicar no ícone ✓ verde.
2. Chama `confirmPayment(id)` → UPDATE `status = 'Pago'`.
3. Totais e comissão real são recalculados na UI.

### Inicializar Mês (Finanças)
1. Usuário acessa `/financas` e clica "Inicializar Mês".
2. `initializeMonth()` busca entradas com `is_recurring=true` de meses anteriores.
3. Copia-as para o mês atual (sem duplicar as que já existem).
4. Fallback: usa `DEFAULT_INCOMES` e `DEFAULT_EXPENSES` hardcoded se nenhum mês anterior existir.

### Registrar Parcela de Empréstimo
1. No `IncomePanel`, clicar no indicador laranja de uma entrada de empréstimo.
2. Chama `receiveInstallment(entryId, loanId, competencia)`.
3. Marca entrada atual como `Recebido`, decrementa parcelas, cria entrada do mês seguinte.
4. Se todas as parcelas foram recebidas: marca empréstimo como `Quitado`.

### Filtro por Competência
- Todas as páginas têm um `<Select>` de mês/ano.
- Dashboard/Lançamentos: popula via `getCompetencias()` (de `service_orders`)
- Finanças: popula via `getFinanceCompetencias()` (de `income_entries` + `expense_entries`)
- Default: mês atual via `getCurrentCompetencia()` = `startOfMonth(new Date())`

---

## Manutenção e Extensões Futuras

### Alterar faixas de comissão
Editar `lib/commission.ts` → array `COMMISSION_BRACKETS` e função `calculateCommission`.
Atualizar também a view `monthly_summary` no SQL se desejar que o banco calcule.

### Adicionar novas categorias de receita/despesa
1. Atualizar os CHECK constraints nas tabelas via migração SQL
2. Atualizar os arrays `INCOME_CATEGORIES` / `EXPENSE_CATEGORIES` em `lib/finance.ts`
3. Atualizar os mapeamentos de cor em `IncomePanel.tsx` e `ExpensePanel.tsx`

### Adicionar nova página
1. Criar `app/nova-pagina/page.tsx`
2. Adicionar link no `Sidebar.tsx` e no `BottomNav.tsx`
3. Seguir o padrão de header e design system documentados acima

### Rebuild do APK Capacitor
Necessário somente se mudar `capacitor.config.ts` ou adicionar plugins nativos:
```bash
npm run cap:sync
npm run cap:open  # abre Android Studio para gerar novo APK
```
Mudanças de UI/lógica **não** requerem rebuild — deploy na Vercel é suficiente.

# Security & Pre-Launch Hardening Protocol

Ao receber a instrução de auditoria pré-lançamento, execute uma varredura rigorosa no código e implemente as correções necessárias seguindo estas 20 diretrizes:

## 1. Gestão de Credenciais e Repositório
* **1. Esconder API Keys:** Mover chaves sensíveis para `.env`. Garantir que `.env` esteja no `.gitignore` e que exista um `.env.example` sem valores reais.
* **2. Limpar Secrets do Git:** Verificar o histórico de commits e staged files para garantir que nenhuma chave privada, token ou senha foi comitada.
* **3. Public Key DB:** Verificar chaves expostas em clientes frontend; garantir que chaves de banco de dados no frontend possuam permissões estritamente anônimas/públicas e nunca permissões de serviço (`service_role`).
* **4. Ativar RLS (Row Level Security):** Garantir que todas as tabelas no banco de dados possuam RLS ativo com políticas explícitas de leitura, inserção, atualização e exclusão (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).

## 2. Autenticação e Acesso
* **5. Criptografia de Dados:** Implementar criptografia em repouso para campos sensíveis (PII, tokens) e em trânsito.
* **6. Auth Server-Side:** Validar sessões e tokens JWT estritamente no backend/middleware (Edge/Server Components/Express/Fastify), sem confiar no estado local do cliente.
* **7. Restringir Acessos (RBAC):** Implementar e auditar controle de acesso baseado em cargos/papéis para rotas administrativas e recursos privados.
* **8. Bloquear Mass Assignment:** Usar DTOs, esquemas estritos ou pick lists de campos permitidos antes de persistir dados no banco.
* **9. Proteger Cookies:** Configurar cookies de sessão com `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict`) e `Domain` restrito.
* **10. Hash nas Senhas:** Garantir uso de algoritmos seguros e lentos (Argon2id ou Bcrypt com custo >= 10/12) para credenciais manuais.

## 3. Defesa de Tráfego e Dados
* **11. Rate Limit:** Aplicar limitadores de requisições (por IP/Token) em rotas críticas (auth, login, APIs públicas).
* **12. Bot Protection:** Validar CAPTCHAs, Honeypots ou WAF checks em formulários públicos e endpoints de cadastro.
* **13. Queries Parametrizadas:** Eliminar concatenação de strings em queries SQL/ORM para prevenção total contra SQL Injection.
* **14. Validação de Inputs:** Aplicar validação estrita e parsing com schemas (ex.: Zod, Yup, Joi) em todas as entradas de requisições.
* **15. Prevenção de Vazamento de Conteúdo:** Garantir que rotas estáticas privadas e buckets de storage não possuam URLs abertas ou listagem de diretórios pública.

## 4. Infraestrutura e Dependências
* **16. Restringir Uploads:** Validar MIME types reais (magic numbers), sanitizar nomes de arquivos, impor limite de tamanho (max payload) e salvar em storage isolado.
* **17. Trim de Respostas de API:** Sanitizar saídas de API para nunca expor senhas com hash, chaves internas, IDs sequenciais desnecessários ou stack traces.
* **18. Add Security Headers:** Configurar headers essenciais via middleware (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
* **19. Forçar HTTPS:** Redirecionar todo tráfego HTTP para HTTPS e incluir cabeçalho `Strict-Transport-Security` (HSTS).
* **20. Scam de Dependências & Auditoria:** Rodar checagem de vulnerabilidades no gerenciador de pacotes (`npm audit`, `pnpm audit` ou `yarn audit`), remover dependências não utilizadas e fixar versões de pacotes confiáveis.