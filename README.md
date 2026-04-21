# SpendLens

**An AI-powered personal finance tracker that turns your receipts, bank statements, and spending habits into actionable insights.**

SpendLens lets you upload PDFs, auto-extract transactions via Claude, track budgets and investments, and ask natural-language questions about your financial data, all in a clean, responsive web app.

---



## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI Receipt Parsing** | Upload a PDF receipt; Claude extracts merchant, amount, date, and line items automatically |
| **AI Bank Statement Import** | Upload a bank statement PDF; Claude extracts all transactions with category suggestions |
| **Natural Language Query** | Ask questions like "How much did I spend on food in March?" and get a streamed answer backed by 12 months of your real data |
| **Spending Insights** | Auto-generated 3–5 AI insights (warnings, tips, achievements) from 3 months of spending patterns |
| **Dashboard** | At-a-glance stat cards, monthly income vs. expense trend chart, category breakdown donut, budget progress, and recent transactions |
| **Transaction Management** | Full CRUD with filters (type, category, date range), pagination, and recurring transaction support |
| **Budget Management** | Monthly budgets per category with colour-coded progress bars (green / amber / red) and per-month navigation |
| **Investment Tracker** | Portfolio P&L, allocation donuts by type and holding, full holdings table with per-unit buy/current price |
| **Category Management** | Custom categories with emoji icon and hex colour; 8 sensible defaults on sign-up |
| **Data Export** | Download all transactions as CSV or a full account backup as JSON |
| **PDF Upload History** | Re-view and re-save parsed data from any previous upload |
| **Auth** | Google OAuth via Supabase Auth; session managed with SSR-safe cookies |
| **Dark / Light Mode** | System-aware theme toggle stored in the browser |
| **Responsive UI** | Works on mobile, tablet, and desktop |

---

## 🛠 Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | [Next.js](https://nextjs.org) | 14.2 | App Router, server components, route handlers, and streaming responses in one framework |
| Language | TypeScript | 5 | End-to-end type safety across API contracts, Prisma models, and React components |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS keeps styles co-located with markup; excellent dark-mode support |
| UI Components | shadcn/ui + Radix UI | 4.2 / 1.4 | Accessible, unstyled primitives with a copy-paste component model — no opaque library lock-in |
| ORM | Prisma | 6.19 | Type-safe database client, schema-first migrations, and Decimal support for financial data |
| Database | PostgreSQL (via Supabase) | — | ACID-compliant, row-level security, and first-class JSON support |
| Auth | Supabase Auth + `@supabase/ssr` | 0.10 | OAuth out of the box; SSR-compatible session management with cookie-based tokens |
| Storage | Supabase Storage | — | Private buckets for PDF uploads; signed URLs for server-side download |
| AI | Anthropic Claude (`claude-sonnet-4-6`) | SDK 0.87 | Best-in-class document understanding for PDF parsing; streaming for interactive Q&A; prompt caching for cost efficiency |
| Charts | Recharts | 3.8 | Composable React chart library; responsive containers with custom tooltips |
| Forms / Validation | Zod | 4.3 | Runtime schema validation on every API route input |
| Dates | date-fns | 4.1 | Immutable, tree-shakeable date utilities |
| Toasts | Sonner | 2.0 | Minimal, composable toast notifications |
| Icons | Lucide React | 1.8 | Consistent icon set with named exports for tree-shaking |
| Deployment | Vercel | — | Zero-config Next.js deployment with edge network and environment variable management |

---


  
## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- An [Anthropic](https://console.anthropic.com) API key (required for AI features)
- `npm` or `pnpm`

### Environment variables

Create a `.env.local` file in the project root:

```bash
# ── Supabase ────────────────────────────────────────────────────────────────

# Found in: Supabase Dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

# Found in: Supabase Dashboard → Project Settings → API → anon / public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Found in: Supabase Dashboard → Project Settings → API → service_role key
# Used ONLY server-side (account deletion). Never expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Database ─────────────────────────────────────────────────────────────────

# Found in: Supabase Dashboard → Project Settings → Database → Connection string
# Use the "Transaction" pooler URI (port 6543) for serverless environments
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# Use the direct connection URI (port 5432) for Prisma migrations
DIRECT_URL=postgresql://postgres.xxxx:password@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres

# ── Anthropic ────────────────────────────────────────────────────────────────

# Found in: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── App ──────────────────────────────────────────────────────────────────────

# The canonical URL of your deployment (used for OAuth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase project setup

1. **Create a project** at [supabase.com/dashboard](https://supabase.com/dashboard).

2. **Enable Google OAuth**
   Go to Authentication → Providers → Google and add your Google Cloud OAuth credentials.

3. **Set the redirect URL**
   In Authentication → URL Configuration, add:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```

4. **Create a Storage bucket**
   Go to Storage → New bucket → name it `uploads` → set to **Private**.

### Install and run

```bash
# 1. Clone the repository
git clone https://github.com/your-username/spendlens.git
cd spendlens

# 2. Install dependencies
npm install

# 3. Push the database schema
npx prisma db push

# 4. (Optional) Explore the database visually
npx prisma studio

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

### Build for production

```bash
npm run build
npm run start
```

---

## 📁 Project structure

```
spendlens/
├── app/
│   ├── (dashboard)/                  # Authenticated route group — shared sidebar layout
│   │   ├── layout.tsx                # Auth guard + sidebar shell
│   │   ├── dashboard/page.tsx        # Overview: stats, charts, recent transactions
│   │   ├── transactions/page.tsx     # Full transaction list with filters + pagination
│   │   ├── budgets/page.tsx          # Monthly budget cards with progress tracking
│   │   ├── investments/page.tsx      # Portfolio tracker with P&L and allocation charts
│   │   ├── insights/page.tsx         # AI insights cards + natural language Q&A
│   │   ├── upload/page.tsx           # PDF upload, AI parsing, and review flow
│   │   └── settings/page.tsx         # Profile, categories, data export, danger zone
│   ├── api/
│   │   ├── auth/                     # signout, user sync after OAuth
│   │   ├── transactions/             # CRUD + [id] routes
│   │   ├── categories/               # CRUD + [id] routes
│   │   ├── budgets/                  # CRUD + [id] + progress aggregate route
│   │   ├── investments/              # CRUD + [id] routes
│   │   ├── uploads/                  # List, detail, confirm routes
│   │   ├── upload/                   # File upload to Supabase Storage
│   │   ├── ai/                       # parse-receipt, parse-statement, insights, query
│   │   ├── dashboard/summary/        # Aggregated dashboard data (7 queries in parallel)
│   │   ├── export/                   # csv and json download endpoints
│   │   └── user/                     # profile, delete-transactions, delete-account
│   ├── auth/callback/route.ts        # Supabase OAuth callback handler
│   ├── login/page.tsx                # Sign-in page
│   ├── layout.tsx                    # Root layout: fonts, theme provider, toaster
│   ├── page.tsx                      # Root redirect → /dashboard or /login
│   └── globals.css                   # Tailwind base + CSS custom properties
├── components/
│   ├── ui/                           # shadcn/ui primitives (button, card, dialog, …)
│   ├── layout/                       # Sidebar, ThemeToggle, SignOutButton
│   ├── dashboard/                    # StatCard, SpendingTrendChart, CategoryBreakdownChart, …
│   ├── transactions/                 # TransactionsTable, TransactionFormDialog
│   ├── settings/                     # CategoriesSection, CategoryFormDialog, DeleteCategoryDialog
│   ├── investments/                  # AllocationCharts, HoldingsTable, InvestmentFormDialog, types
│   └── upload/                       # UploadDropzone, ReceiptReviewForm, StatementReviewTable, …
├── lib/
│   ├── ai/
│   │   ├── claude.ts                 # Anthropic client + parseReceipt / parseBankStatement
│   │   └── parse-helpers.ts          # downloadUpload, resolveCategoryId, markFailed
│   ├── auth/
│   │   ├── get-user.ts               # getUser() — validates session → Prisma user
│   │   └── sync-user.ts              # syncUser() — upserts user + 8 default categories
│   ├── supabase/
│   │   ├── client.ts                 # Browser-side Supabase client
│   │   ├── server.ts                 # SSR Supabase client (cookie-based)
│   │   └── admin.ts                  # Service-role client for admin operations
│   ├── format.ts                     # formatCurrency, formatDate, formatPercentage
│   ├── prisma.ts                     # Prisma singleton (hot-reload safe)
│   └── utils.ts                      # cn() — Tailwind class merger
├── prisma/
│   └── schema.prisma                 # Database schema — 6 models
├── public/                           # Static assets
├── .env.local                        # Local environment variables (never committed)
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🗄 Database schema

```mermaid
erDiagram
    User {
        uuid id PK
        string email UK
        string name
        string currency
        datetime created_at
    }

    Category {
        uuid id PK
        string name
        string icon
        string color
        boolean is_default
        uuid user_id FK
    }

    Transaction {
        uuid id PK
        decimal amount
        enum type
        string description
        datetime date
        boolean is_recurring
        enum recurrence_interval
        enum source
        datetime created_at
        uuid user_id FK
        uuid category_id FK
    }

    Budget {
        uuid id PK
        decimal amount
        int month
        int year
        uuid user_id FK
        uuid category_id FK
    }

    Investment {
        uuid id PK
        string name
        enum type
        decimal buy_price
        decimal quantity
        decimal current_value
        datetime purchase_date
        string notes
        datetime created_at
        uuid user_id FK
    }

    Upload {
        uuid id PK
        string file_name
        string file_url
        enum file_type
        enum status
        json parsed_data
        datetime created_at
        uuid user_id FK
    }

    User ||--o{ Category : owns
    User ||--o{ Transaction : owns
    User ||--o{ Budget : owns
    User ||--o{ Investment : owns
    User ||--o{ Upload : owns
    Category ||--o{ Transaction : categorises
    Category ||--o{ Budget : tracks
```

**Enums**

| Model | Field | Values |
|-------|-------|--------|
| Transaction | `type` | `INCOME`, `EXPENSE` |
| Transaction | `source` | `MANUAL`, `AI_RECEIPT`, `AI_STATEMENT` |
| Transaction | `recurrence_interval` | `WEEKLY`, `MONTHLY`, `YEARLY` |
| Investment | `type` | `STOCK`, `CRYPTO`, `ETF`, `BOND`, `PROPERTY`, `OTHER` |
| Upload | `file_type` | `RECEIPT`, `BANK_STATEMENT` |
| Upload | `status` | `PROCESSING`, `COMPLETED`, `FAILED` |

---

## 📡 API reference

All routes require an authenticated session cookie and return `401` if unauthenticated.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/sync` | Upsert Prisma user after OAuth callback |
| `POST` | `/api/auth/signout` | Sign out and clear session cookie |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/summary` | All dashboard data in one request: current/last month totals, category spending, 6-month trend, recent transactions, budget progress |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List transactions; supports `type`, `categoryId`, `startDate`, `endDate`, `page`, `pageSize` |
| `POST` | `/api/transactions` | Create a transaction |
| `GET` | `/api/transactions/[id]` | Get a single transaction |
| `PUT` | `/api/transactions/[id]` | Update a transaction |
| `DELETE` | `/api/transactions/[id]` | Delete a transaction |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/categories` | List all categories (defaults first, then alphabetical) |
| `POST` | `/api/categories` | Create a custom category |
| `PUT` | `/api/categories/[id]` | Update name, icon, or colour |
| `DELETE` | `/api/categories/[id]` | Delete a category (guarded: rejects if used by transactions or budgets) |

### Budgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/budgets` | List budgets; `month` and `year` query params (default: current month) |
| `POST` | `/api/budgets` | Create or update a budget (upsert per user / category / month / year) |
| `PUT` | `/api/budgets/[id]` | Update budget amount |
| `DELETE` | `/api/budgets/[id]` | Delete a budget |
| `GET` | `/api/budgets/progress` | Budgets with actual spend + unbudgeted categories for a given month |

### Investments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/investments` | List all investments |
| `POST` | `/api/investments` | Add an investment |
| `PUT` | `/api/investments/[id]` | Update an investment |
| `DELETE` | `/api/investments/[id]` | Delete an investment |

### Uploads & AI Parsing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a PDF to Supabase Storage; returns `{ id }` |
| `GET` | `/api/uploads` | List all uploads (omits `parsedData` for performance) |
| `GET` | `/api/uploads/[id]` | Get a single upload including `parsedData` |
| `POST` | `/api/ai/parse-receipt` | Parse a receipt PDF with Claude; stores result on the upload record |
| `POST` | `/api/ai/parse-statement` | Parse a bank statement PDF with Claude |
| `POST` | `/api/uploads/[id]/confirm` | Bulk-create transactions from a parsed upload |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/insights` | Generate 3–5 spending insights from 3 months of data; returns JSON array |
| `POST` | `/api/ai/query` | Ask a natural-language question about 12 months of data; **streams** plain-text response |

### User & Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/user/profile` | Get current user's profile (id, email, name, currency) |
| `PUT` | `/api/user/profile` | Update name and/or currency |
| `DELETE` | `/api/user/transactions` | Delete all of the user's transactions |
| `DELETE` | `/api/user/account` | Delete account and all data; removes Supabase auth user |
| `GET` | `/api/export/csv` | Download all transactions as a CSV file |
| `GET` | `/api/export/json` | Download full account backup as JSON |

---

## ▲ Deployment

SpendLens is designed to deploy to [Vercel](https://vercel.com) with zero configuration changes.

### Steps

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/your-username/spendlens.git
   git push -u origin main
   ```

2. **Import to Vercel**
   Go to [vercel.com/new](https://vercel.com/new), import your repository, and select the **Next.js** preset (auto-detected).

3. **Add environment variables**
   In Vercel → Project Settings → Environment Variables, add every variable from the [Environment variables](#environment-variables) section. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://spendlens.vercel.app`).

4. **Deploy**
   Vercel builds and deploys on every push to `main`.

5. **Update OAuth redirect URLs**
   Add your production domain to:
   - Supabase: Authentication → URL Configuration
   - Google Cloud Console: OAuth 2.0 → Authorised redirect URIs



---



## 👤 Author

**Voshana Nissanka**

- GitHub: [voshana08](https://github.com/Voshana08)
- LinkedIn: [https://www.linkedin.com/in/voshana-nissanka/]


---


