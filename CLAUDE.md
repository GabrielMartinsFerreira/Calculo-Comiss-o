# Sistema de Controle de Comissionamento Comercial

## Visão Geral

Aplicação web para controle e cálculo de comissões comerciais mensais.
Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS · Shadcn UI · Recharts · Framer Motion · Supabase · @supabase/ssr.

---

## Autenticação e Segurança

### Pacotes
- `@supabase/ssr`: cliente SSR com suporte a cookies — `createBrowserClient` (client) e `createServerClient` (middleware/server).

### Arquitetura de Auth
| Arquivo | Papel |
|---------|-------|
| `middleware.ts` | Protege todas as rotas; redireciona `/login` se não autenticado |
| `lib/supabase-server.ts` | `createSupabaseServer()` — cliente servidor com cookies do Next.js 15 |
| `lib/supabase.ts` | `createBrowserClient` + funções `signIn`, `signOut`, `getUser` |
| `components/auth/LoginForm.tsx` | Formulário Email/Password com "Lembrar-me" |
| `app/login/page.tsx` | Página pública sem sidebar |
| `components/layout/ConditionalLayout.tsx` | Renderiza Sidebar só fora de `/login`; verifica `remember_me` no mount |
| `app/layout.tsx` | Server Component async — obtém `initialUser` via `createSupabaseServer()` |

### "Lembrar-me"
- `rememberMe = true` → `localStorage.setItem("remember_me", "true")`
- `rememberMe = false` → `sessionStorage.setItem("session_only", "active")`
- `ConditionalLayout` no mount: se nenhuma flag existir, faz signOut (nova janela de browser sem "lembrar").

### Row Level Security (RLS)
**REGRA CRÍTICA: Nunca desativar o RLS. Todas as tabelas DEVEM ter políticas RLS activas.**

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
1. `004_auth_rls.sql` — adiciona `user_id`, cria trigger e políticas RLS
2. `005_expense_payment.sql` — adiciona `payment_method` em `expense_entries`
3. Criar conta em Authentication → Users
4. Executar os UPDATE comentados em `004_auth_rls.sql` para migrar dados existentes

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
| Neon Orange | `#f97316` | Avisos secundários |
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

## Configuração do Ambiente

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica_aqui
```

Obtenha as chaves em: Supabase Dashboard → Project Settings → API.

### 3. Banco de dados

Execute o arquivo `supabase/migrations/001_initial.sql` no SQL Editor do Supabase.
O script cria a tabela `service_orders`, índices, trigger de `updated_at` e uma view `monthly_summary`.

### 4. Iniciar desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Modelagem do Banco de Dados

### Tabela: `service_orders`

| Coluna           | Tipo           | Constraints                         | Descrição                            |
|------------------|----------------|-------------------------------------|--------------------------------------|
| `id`             | uuid           | PK, DEFAULT gen_random_uuid()       | Identificador único                  |
| `os_number`      | text           | NOT NULL                            | Número da OS (ex: "OS3994")          |
| `client_name`    | text           | NOT NULL                            | Nome do cliente                      |
| `order_date`     | date           | NOT NULL                            | Data da OS                           |
| `order_value`    | numeric(12,2)  | NOT NULL, CHECK > 0                 | Valor do pedido em R$                |
| `payment_method` | text           | CHECK IN ('Pix','Boleto','Cartão')  | Método de pagamento                  |
| `status`         | text           | DEFAULT 'Pendente', CHECK IN (...)  | 'Pendente' ou 'Pago'                 |
| `competencia`    | date           | NOT NULL                            | Primeiro dia do mês de competência   |
| `created_at`     | timestamptz    | DEFAULT now()                       | Data de criação                      |
| `updated_at`     | timestamptz    | DEFAULT now(), trigger              | Atualizado automaticamente           |

**Índices:** `competencia DESC`, `status`, `os_number`

### View: `monthly_summary`
Agrega dados por competência: total de OS, totais financeiros e comissão calculada.

### Tabela: `expense_entries` — campo `payment_method`
Adicionado via `005_expense_payment.sql`.

| Valor | Comportamento |
|-------|---------------|
| `Dinheiro` | Despesa geral padrão |
| `Pix` | Despesa geral |
| `Débito` | Despesa geral |
| `Cartão de Crédito` | Separado na secção "Fatura do Cartão" em `ExpensePanel` |

**Lógica de Cartão de Crédito em `computeFinanceSummary`:**
- `totalCreditCardBill` = CC com `status = 'Pago'` (fatura confirmada)
- `totalCreditCardPending` = CC com outro status (em aberto)
- `totalExpenseGeneral` = todas as despesas **excluindo** CC (para não double-contar com a fatura)
- `totalExpense` ainda inclui tudo (para projeção de saldo)

---

## Regras de Negócio e Cálculo de Comissão

### Faixas de Comissão (sobre o Total Pago do mês)

| Faixa        | Total Pago Acumulado       | Taxa    |
|--------------|----------------------------|---------|
| Mini Meta    | R$ 0 até R$ 50.000,00      | 1,5%    |
| Meta         | R$ 50.000,01 até R$ 70.000 | 2,0%    |
| Mega Meta    | Acima de R$ 70.000,00      | 2,5%    |

**Fórmula (flat rate):** A taxa da faixa em que o total se enquadra é aplicada sobre o TOTAL inteiro, não por parcelas.
Isso replica a lógica da planilha original: `IF(total<=50000, total*1.5%, IF(total<=70000, total*2%, total*2.5%))`.

**Exemplo:** R$ 59.334 pago → faixa Meta (2%) → comissão = R$ 1.186,68.

### Status das OS
- **Pendente:** OS cadastrada mas pagamento ainda não confirmado. Entra na previsão, não no real.
- **Pago:** Pagamento confirmado manualmente. Computa a comissão real do mês.

A comissão "prevista" é calculada sobre o total de TODAS as OS (incluindo pendentes).
A comissão "real" é calculada somente sobre as OS com status `Pago`.

---

## Estrutura de Arquivos

```
├── app/
│   ├── layout.tsx              # Layout raiz com Sidebar e Toaster
│   ├── globals.css             # CSS global com variáveis de tema
│   ├── page.tsx                # Dashboard principal
│   ├── lancamentos/page.tsx    # CRUD de Ordens de Serviço
│   └── relatorios/page.tsx     # Gráficos e histórico mensal
├── components/
│   ├── layout/Sidebar.tsx      # Menu lateral de navegação
│   ├── dashboard/
│   │   ├── KPICards.tsx        # 4 cards de indicadores
│   │   ├── MetaProgress.tsx    # Barra de progresso das faixas
│   │   └── RecentOrders.tsx    # Últimas 5 OS do mês
│   ├── lancamentos/
│   │   ├── OSForm.tsx          # Modal de criação/edição de OS
│   │   └── OSTable.tsx         # Tabela com busca, sort e paginação
│   ├── relatorios/
│   │   ├── MonthlyChart.tsx    # Gráfico de barras Recharts
│   │   └── MonthlyHistory.tsx  # Histórico por mês em cards
│   └── ui/                     # Componentes Shadcn UI
├── lib/
│   ├── types.ts                # Interfaces TypeScript
│   ├── commission.ts           # Lógica de cálculo de comissão
│   ├── supabase.ts             # Client Supabase + funções CRUD
│   ├── utils.ts                # formatCurrency, formatDate, cn, etc.
│   └── use-toast.ts            # Hook de notificações toast
└── supabase/migrations/
    └── 001_initial.sql         # Schema e índices do banco
```

---

## Fluxos Principais

### Adicionar OS
1. Usuário clica em "Nova OS" na página de Lançamentos.
2. Preenche: número, cliente, data, valor, método, status (padrão: Pendente).
3. `competencia` é derivada automaticamente da `order_date` (primeiro dia do mês).
4. OS salva no Supabase via `createOrder()`.

### Confirmar Pagamento
1. Na tabela de OS, clicar no ícone ✓ verde ao lado de uma OS Pendente.
2. Chama `confirmPayment(id)` que faz UPDATE `status = 'Pago'`.
3. Os totais e comissão real são recalculados na UI.

### Filtro por Competência
- Todas as páginas têm um `<Select>` de mês/ano.
- Popula via `getCompetencias()` que busca valores distintos de `competencia`.
- Default: mês atual via `startOfMonth(new Date())`.

---

## Manutenção e Extensões Futuras

### Alterar faixas de comissão
Editar `lib/commission.ts` → array `COMMISSION_BRACKETS` e função `calculateCommission`.
Atualizar também a view `monthly_summary` no SQL se desejar que o banco calcule.

### Adicionar autenticação
1. Habilitar Auth no Supabase Dashboard.
2. Descomentar as policies RLS no SQL de migração.
3. Adicionar `@supabase/auth-helpers-nextjs` e middleware de proteção de rotas.

### Multi-usuário (vendedores diferentes)
Adicionar coluna `user_id uuid REFERENCES auth.users` na tabela `service_orders`.
Adicionar policy RLS: `USING (user_id = auth.uid())`.

### Deploy na Vercel
1. Importar o repositório na Vercel.
2. Definir as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas configurações do projeto.
3. Deploy automático a cada push.
