# 📊 Track - Modern Habit & Wellness Tracking SaaS

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Managed-4169E1?style=for-the-badge&logo=postgresql)
![NextAuth](https://img.shields.io/badge/NextAuth.js-v4-purple?style=for-the-badge&logo=auth0)

**A full-stack, multi-user habit and wellness tracking dashboard built for consistency, clarity, and performance.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Environment Variables](#-environment-variables) • [Database & Migrations](#-database--migrations) • [Scripts](#-scripts) • [Deployment](#-deployment)

</div>

---

## ✨ Key Features

- **📅 Interactive Monthly Habit Matrix**
  - Intuitive grid view mapping out each day of the month with live weekday/date headers.
  - One-click completion toggling with instant optimistic UI feedback.
  - Per-habit monthly targets with progress tracking.

- **📊 Advanced Analytics & Visualizations**
  - **Daily Completion Bar Chart**: Visualize aggregate habit completions across every single day of the month.
  - **Donut Completion Metric**: Real-time breakdown of completed vs. remaining goals.
  - **Habit Performance Analysis**: Progress bars, completion percentage, and status indicators for each habit.
  - **Leaderboard**: Automatically ranks your highest-performing habits for the month.

- **🌙 Daily Wellness Logging**
  - Track **Mood Score** (1–5 scale) directly within the matrix.
  - Track **Sleep Duration** (hours) with debounced batch persistence.

- **🔐 Robust Authentication**
  - Credential-based authentication with bcrypt-hashed passwords.
  - Google OAuth integration support via NextAuth.js.
  - Secure session handling and route guards (`/tracker` protected, automatic redirect from `/`).

- **⚡ High-Performance Batch APIs**
  - Batch endpoints for habit completions (`/api/tracker/batch`) and wellness logs (`/api/daily-logs/batch`).
  - Strict user-ownership checks to prevent unauthorized state manipulation.

- **🎨 Modern Dark UI**
  - Sleek, accessible dark-mode interface styled with Tailwind CSS.
  - Responsive design optimized for desktop productivity and mobile tracking.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (Pages Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) & [PostCSS](https://postcss.org/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM 5](https://www.prisma.io/) |
| **Authentication** | [NextAuth.js v4](https://next-auth.js.org/) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Charts & Data Viz**| [Recharts 2](https://recharts.org/) |
| **Package Manager** | [pnpm](https://pnpm.io/) |

---

## 📁 Project Structure

```text
Track/
├── components/
│   └── Tracker.tsx              # Core dashboard: matrix, charts, wellness inputs
├── lib/
│   └── prisma.ts                # Prisma client singleton instance
├── pages/
│   ├── _app.tsx                 # App layout with NextAuth SessionProvider
│   ├── index.tsx                # Gateway with session-aware redirection
│   ├── tracker.tsx              # Main authenticated dashboard page
│   ├── auth/
│   │   ├── signin.tsx           # Custom sign-in page
│   │   └── register.tsx         # Account registration page
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth].ts # NextAuth handlers (Credentials & Google)
│       │   └── register.ts      # User registration endpoint
│       ├── daily-logs/
│       │   └── batch.ts         # Batch mood & sleep persistence
│       ├── habits/
│       │   ├── index.ts         # Habit creation & list endpoint
│       │   └── [id].ts          # Habit delete & update endpoint
│       └── tracker/
│           └── batch.ts         # Batch habit completion toggles
├── prisma/
│   ├── schema.prisma            # PostgreSQL data models & indexes
│   ├── seed.ts                  # Development demo data seeder
│   └── migrations/              # Production-ready SQL migration history
├── styles/
│   └── globals.css              # Global styling & Tailwind directives
├── .env.example                 # Example environment variables template
├── package.json                 # Project dependencies & npm scripts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.17+ or v20+ recommended)
- [pnpm](https://pnpm.io/) (v9 or v11)
- A running [PostgreSQL](https://www.postgresql.org/) database (local or cloud like Neon, Supabase, Vercel Postgres)

### 1. Clone & Install

```bash
git clone https://github.com/Grim-235/Track.git
cd Track
pnpm install
```

### 2. Configure Environment Variables

Create your local `.env` file based on `.env.example`:

```bash
# On Linux / macOS
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```

Fill in the required configuration values in `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/habit_tracker?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-random-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

> **Tip:** You can generate a secure `NEXTAUTH_SECRET` using:
> ```bash
> openssl rand -base64 32
> ```

### 3. Setup Database

Deploy the initial schema migrations to your database:

```bash
pnpm prisma:deploy
```

*(Optional)* Seed sample habit and user data for development:

```bash
pnpm exec prisma db seed
```
> Default seed account credentials:
> - **Email:** `demo@example.com`
> - **Password:** `password123`

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with schema parameter. |
| `NEXTAUTH_URL` | **Yes** | Canonical URL of the application (`http://localhost:3000` locally, or production HTTPS domain). |
| `NEXTAUTH_SECRET` | **Yes** | Cryptographic secret used to encrypt session tokens and cookies. |
| `GOOGLE_CLIENT_ID` | Optional | Google Cloud OAuth Client ID for Google single sign-on. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google Cloud OAuth Client Secret. |

---

## 📜 Scripts

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js development server at `http://localhost:3000`. |
| `pnpm build` | Generates Prisma client and creates an optimized production build. |
| `pnpm start` | Starts the production Next.js server. |
| `pnpm lint` | Runs Next.js ESLint checks. |
| `pnpm typecheck` | Runs TypeScript type checking without emitting files. |
| `pnpm prisma:generate` | Generates the Prisma client library. |
| `pnpm prisma:migrate` | Runs database migrations locally in development. |
| `pnpm prisma:deploy` | Applies pending Prisma migrations to the production/target database. |
| `pnpm prisma:studio` | Opens interactive Prisma Studio GUI to inspect and edit database records. |

---

## 🌐 Deployment

### Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. In Project Settings > Environment Variables, supply:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your deployed Vercel domain or custom domain)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` (if using Google OAuth)
4. The pre-configured build command `pnpm vercel-build` will automatically apply migrations (`prisma migrate deploy`), generate the Prisma client, and build the Next.js app.

---

## 🔒 Security Best Practices

- **Password Hashing:** Passwords are never stored in plain text and are securely hashed using `bcryptjs`.
- **API Ownership Verification:** All batch endpoints verify that the requesting user owns the habit records before executing mutations.
- **Environment Isolation:** Secrets and `.env` credentials are kept out of source control.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
