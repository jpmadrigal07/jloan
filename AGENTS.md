# 🤖 Agent Instructions

## 📑 Table of Contents

- [📝 Documentation Maintenance](#-documentation-maintenance)
- [💰 JLoan Project Overview](#-jloan-project-overview)
- [⭐ Core Features](#-core-features)
- [🛠️ Technical Overview](#️-technical-overview)
- [🏗️ Project Stack](#️-project-stack)
- [🗄️ Database & ORM](#️-database--orm)
- [📂 Project Structure](#-project-structure)
- [📝 Version Control & Release Management](#-version-control--release-management)
- [🎨 Styling System](#-styling-system)
- [✅ Best Practices and Coding Style](#-best-practices-and-coding-style)

---

## 📝 Documentation Maintenance

> ⚠️ **CRITICAL**: Keep AGENTS.md files synchronized with code changes at all times.

### Documentation Update Requirements

**When to Update AGENTS.md Files**:

- ✅ **ALWAYS** update the relevant `AGENTS.md` file when you:
  - Change folder structure or organization patterns
  - Add, remove, or modify code patterns or conventions
  - Update architectural decisions or approaches
  - Change file naming conventions or organization standards
  - Modify shared utilities, services, or common code patterns
  - Update state management patterns or data fetching approaches
  - Change styling approaches or component organization
  - Add new features that affect code organization

**Which AGENTS.md to Update**:

- **Root `AGENTS.md`**: Update for changes affecting the entire project, general principles, or project-wide conventions
- **Feature-specific `AGENTS.md`** (e.g., `app/[feature]/AGENTS.md`): Update for changes specific to that feature or module

**Update Process**:

1. **Before or during code changes**: Identify which `AGENTS.md` files are affected
2. **Make code changes**: Implement your structural or pattern changes
3. **Update documentation**: Immediately update the relevant `AGENTS.md` file(s) to reflect the new structure/patterns
4. **Review**: Ensure documentation accurately describes the current state of the codebase
5. **Commit together**: Commit documentation updates alongside code changes in the same PR/commit when possible

**What to Document**:

- Folder structures and organization patterns
- File naming conventions
- Code patterns and best practices
- Architecture decisions and rationale
- Usage examples and guidelines
- Critical rules and conventions

> 💡 **Remember**: Outdated documentation is worse than no documentation. If the code structure changes but `AGENTS.md` doesn't, it creates confusion and inconsistency.

---

## 💰 JLoan Project Overview

**JLoan** is a modern loan management system built with Next.js. The application provides comprehensive loan management capabilities including loan applications, processing, tracking, and administration.

### ⭐ Core Features

1. **Loan Management**
   - Loan application processing
   - Loan tracking and status management
   - Loan administration and reporting

2. **User Interface**
   - Modern, responsive design
   - Accessible components using Radix UI
   - Consistent UI patterns with shadcn/ui

3. **Navigation & Routing**
   - Next.js App Router with file-based routing
   - Dynamic routing support
   - Server and client components

---

## 🛠️ Technical Overview

This project is a **Next.js 16** web application built with **React 19** and **TypeScript**, featuring:

- **Next.js App Router** for modern routing and server components
- **Tailwind CSS 4** for styling with custom theme configuration
- **Radix UI** primitives for accessible components
- **shadcn/ui** component library for consistent UI patterns
- **Geist Font** for typography

The architecture follows modern React patterns with:

- **Server Components** by default (Next.js App Router)
- **Client Components** for interactive features (`'use client'`)
- **TypeScript** throughout for type safety
- **Component-based architecture** for reusability

---

## 🏗️ Project Stack

### Core Technologies

- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4 with Tailwind Animate (tw-animate-css)
- **UI Components**: Radix UI primitives (@radix-ui/react-*)
- **Component Library**: shadcn/ui (configured via components.json)
- **Icons**: Lucide React ^0.562.0
- **Fonts**: Geist Sans & Geist Mono (Next.js Google Fonts)

### Utilities

- **clsx** ^2.1.1 for conditional class names
- **tailwind-merge** ^3.4.0 for merging Tailwind classes
- **class-variance-authority** ^0.7.1 for component variants

### Development Tools

- **Package Manager**: Bun (bun.lock present)
- **Node Version**: >=20
- **Linting**: ESLint 9 with Next.js config
- **Formatting**: Prettier ^3.7.4
- **Release Management**: semantic-release ^24.2.6 with Conventional Commits

### Infrastructure & Tools

- **Build Tool**: Next.js built-in bundler
- **Version Control**: Git with Conventional Commits
- **CI/CD**: semantic-release for automated versioning and releases

### Database & ORM

- **ORM**: Drizzle ORM ^0.45.1
- **Database**: Neon PostgreSQL (serverless)
- **Database Client**: @neondatabase/serverless ^1.0.2
- **ORM Toolkit**: drizzle-kit ^0.31.8 (for migrations and schema management)

---

## 🗄️ Database & ORM

This project uses **Drizzle ORM** with **Neon PostgreSQL** for database operations. Drizzle provides a type-safe, lightweight ORM with excellent TypeScript support.

### Database Setup

**Database Provider**: Neon PostgreSQL (serverless)

**Configuration**:

1. **Environment Variable**: Set `DATABASE_URL` in your `.env.local` file:
   ```bash
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

2. **Database Connection**: Located in `lib/db/index.ts`
   - Uses `@neondatabase/serverless` for serverless PostgreSQL connection
   - Uses `drizzle-orm/neon-http` adapter for HTTP-based queries
   - Automatically validates `DATABASE_URL` environment variable

3. **Drizzle Configuration**: `drizzle.config.ts`
   - Schema location: `./lib/db/schema.ts`
   - Migration output: `./drizzle`
   - Dialect: PostgreSQL

### Database Structure

**Schema Location**: `lib/db/schema.ts`

- ✅ **Define tables** using Drizzle's `pgTable` function
- ✅ **Export types** using `$inferSelect` and `$inferInsert` for type safety
- ✅ **Use PostgreSQL-specific types** from `drizzle-orm/pg-core`

**Example Schema**:

```typescript
import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  author: varchar('author', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Database Usage

**Import Database Instance**:

```typescript
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
```

**Query Examples**:

```typescript
// Select all records
const allPosts = await db.select().from(posts);

// Select with conditions
const post = await db.select().from(posts).where(eq(posts.id, 1));

// Insert record
const newPost = await db.insert(posts).values({
  title: 'My Post',
  content: 'Post content',
  author: 'John Doe',
}).returning();

// Update record
await db.update(posts)
  .set({ title: 'Updated Title' })
  .where(eq(posts.id, 1));

// Delete record
await db.delete(posts).where(eq(posts.id, 1));
```

### API Routes with Database

**Example API Route**: `app/api/posts/route.ts`

The project includes a sample API route demonstrating database operations:

- **GET `/api/posts`**: Fetch all posts
- **POST `/api/posts`**: Create a new post

**Best Practices for API Routes**:

1. ✅ **ALWAYS** handle errors with try-catch blocks
2. ✅ **ALWAYS** validate request data before database operations
3. ✅ **ALWAYS** return appropriate HTTP status codes
4. ✅ **USE** TypeScript types from schema (`Post`, `NewPost`)
5. ✅ **LOG** errors for debugging (server-side only)
6. ✅ **RETURN** user-friendly error messages

**Example API Route Structure**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';

export async function GET() {
  try {
    const allPosts = await db.select().from(posts);
    return NextResponse.json(allPosts, { status: 200 });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate and insert
    const newPost = await db.insert(posts).values(body).returning();
    return NextResponse.json(newPost[0], { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
```

### Database Migrations

**Drizzle Kit Commands**:

- `bun run db:generate` - Generate migration files from schema changes
- `bun run db:migrate` - Run pending migrations
- `bun run db:push` - Push schema changes directly to database (development)
- `bun run db:studio` - Open Drizzle Studio (database GUI)

**Migration Workflow**:

1. **Modify schema** in `lib/db/schema.ts`
2. **Generate migration**: `bun run db:generate`
3. **Review migration** files in `./drizzle` directory
4. **Apply migration**: `bun run db:migrate` (or `bun run db:push` for development)

> 💡 **Tip**: Use `db:push` for rapid development, use `db:migrate` for production-ready migrations

### Database Best Practices

1. **Schema Organization**:
   - ✅ Keep all table definitions in `lib/db/schema.ts`
   - ✅ Export types for each table using `$inferSelect` and `$inferInsert`
   - ✅ Use descriptive table and column names (snake_case for database, camelCase for TypeScript)

2. **Type Safety**:
   - ✅ **ALWAYS** use inferred types from schema (`typeof table.$inferSelect`)
   - ✅ **ALWAYS** import types from schema file, not inline
   - ✅ **USE** TypeScript types in API routes and components

3. **Error Handling**:
   - ✅ **ALWAYS** wrap database operations in try-catch blocks
   - ✅ **ALWAYS** return appropriate HTTP status codes
   - ✅ **LOG** errors server-side (never expose database errors to clients)
   - ✅ **PROVIDE** user-friendly error messages

4. **Performance**:
   - ✅ Use `.select()` with specific columns when possible
   - ✅ Use `.where()` clauses to filter data
   - ✅ Use `.limit()` and `.offset()` for pagination
   - ✅ Consider indexing frequently queried columns

5. **Security**:
   - ✅ **NEVER** expose `DATABASE_URL` in client-side code
   - ✅ **ALWAYS** validate and sanitize user input before database operations
   - ✅ **USE** parameterized queries (Drizzle handles this automatically)
   - ✅ **NEVER** trust client-side data - always validate on the server

### Database File Organization

```
lib/
└── db/
    ├── index.ts          # Database connection and export
    └── schema.ts         # Table definitions and types
```

**When to Create Route-Specific Database Code**:

- ✅ **Route-specific queries**: Create custom query functions in `app/[route]/lib/db-queries.ts`
- ✅ **Route-specific types**: Extend base types in route-specific files
- ✅ **Complex queries**: Create reusable query functions in route `lib/` folder

---

## 📂 Project Structure

```text
jloan/
├── app/                          # Next.js App Router routes
│   ├── favicon.ico
│   ├── globals.css               # Global styles and Tailwind config
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── api/                      # API routes
│   │   └── posts/
│   │       └── route.ts          # Example API route (GET, POST)
│   └── [route]/                  # Example: Modularized route folder
│       ├── page.tsx              # Route page
│       ├── layout.tsx            # Route-specific layout (optional)
│       ├── components/           # Route-specific components
│       │   └── route-component.tsx
│       ├── hooks/                # Route-specific hooks
│       │   └── use-route-data.ts
│       ├── constants/            # Route-specific constants
│       │   └── route-config.ts
│       └── lib/                  # Route-specific utilities
│           └── route-utils.ts
├── components/                   # Shared React components (used across routes)
│   └── ui/                       # shadcn/ui components
│       └── button.tsx
├── hooks/                        # Shared hooks (used across routes)
│   └── .gitkeep
├── constants/                    # Shared constants (used across routes)
│   └── .gitkeep
├── lib/                          # Shared utility functions
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   └── db/                       # Database configuration and schema
│       ├── index.ts              # Database connection (drizzle instance)
│       └── schema.ts             # Database schema definitions
├── drizzle/                      # Generated migration files (gitignored)
├── public/                       # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── components.json               # shadcn/ui configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── next.config.ts                # Next.js configuration
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
├── changelog.config.js           # Changelog configuration
├── .releaserc.js                 # semantic-release configuration
├── package.json
└── bun.lock
```

### Folder Structure Guidelines

**Route Organization**:

- **App Router**: All routes in `app/` directory using file-based routing
- **Layouts**: Use `layout.tsx` for shared layouts
- **Pages**: Use `page.tsx` for route pages
- **Modular Routes**: Each route can have its own modularized folders (`components/`, `hooks/`, `constants/`, `lib/`)

**Modular Architecture Pattern**:

> 🎯 **Key Principle**: Routes can be self-contained modules with their own `components/`, `hooks/`, `constants/`, and `lib/` folders.

**When to Use Root-Level vs Route-Level Folders**:

- ✅ **Root `/components/`**: For shared components used across **multiple routes**
- ✅ **Root `/hooks/`**: For shared hooks used across **multiple routes**
- ✅ **Root `/constants/`**: For shared constants used across **multiple routes**
- ✅ **Root `/lib/`**: For shared utilities used across **multiple routes**
- ✅ **Route `/app/[route]/components/`**: For components **only used in that specific route**
- ✅ **Route `/app/[route]/hooks/`**: For hooks **only used in that specific route**
- ✅ **Route `/app/[route]/constants/`**: For constants **only used in that specific route**
- ✅ **Route `/app/[route]/lib/`**: For utilities **only used in that specific route**

**Component Organization**:

- ✅ **Root `/components/`**: For shared components used across multiple routes
- ✅ **UI Components**: All shadcn/ui components in `/components/ui/`
- ✅ **Route-specific components**: Place in `app/[route]/components/` if only used in that route
- ✅ **Modular pattern**: Each route can have its own `components/` folder for route-specific components

**Hooks Organization**:

- ✅ **Root `/hooks/`**: For shared hooks used across multiple routes
- ✅ **Route-specific hooks**: Place in `app/[route]/hooks/` if only used in that route
- ✅ **Modular pattern**: Each route can have its own `hooks/` folder for route-specific hooks

**Constants Organization**:

- ✅ **Root `/constants/`**: For shared constants used across multiple routes
- ✅ **Route-specific constants**: Place in `app/[route]/constants/` if only used in that route
- ✅ **Modular pattern**: Each route can have its own `constants/` folder for route-specific constants

**Utilities Organization**:

- ✅ **Root `/lib/`**: For shared utility functions and helpers (e.g., `utils.ts` with `cn` function)
- ✅ **Database**: Database connection and schema in `/lib/db/` (see [Database & ORM](#️-database--orm))
- ✅ **Route-specific utilities**: Place in `app/[route]/lib/` if only used in that route
- ✅ **Modular pattern**: Each route can have its own `lib/` folder for route-specific utilities

**API Routes Organization**:

- ✅ **API Routes**: Place in `app/api/[endpoint]/route.ts` for Next.js API routes
- ✅ **Route Handlers**: Export named functions (`GET`, `POST`, `PUT`, `DELETE`, etc.)
- ✅ **Database Operations**: Use Drizzle ORM for all database operations in API routes
- ✅ **Error Handling**: Always wrap database operations in try-catch blocks

**File Naming Conventions**:

- ✅ **Components**: `kebab-case.tsx` (e.g., `button.tsx`, `loan-form.tsx`)
- ✅ **Hooks**: `kebab-case.ts` with `use-` prefix (e.g., `use-loan-data.ts`)
- ✅ **Constants**: `kebab-case.ts` (e.g., `api-endpoints.ts`, `loan-config.ts`)
- ✅ **Utilities**: `kebab-case.ts` (e.g., `utils.ts`, `format-helpers.ts`)
- ✅ **Component Names in Code**: `PascalCase` (e.g., `Button`, `LoanForm`)
- ✅ **Hook Names in Code**: `camelCase` with `use` prefix (e.g., `useLoanData`)
- ✅ **Constant Names in Code**: `UPPER_SNAKE_CASE` or `camelCase` depending on usage

**Import Paths**:

- ✅ **Root-level imports**: Use `@/` alias (e.g., `@/components/ui/button`, `@/lib/utils`)
- ✅ **Route-level imports**: Use relative paths within the route (e.g., `./components/route-component`, `./hooks/use-route-data`)
- ✅ **Cross-route imports**: Use `@/` alias to import from root-level shared folders

---

## 📝 Version Control & Release Management

The project uses **Conventional Commits** specification for commit messages and **semantic-release** for automated version management and releases.

### Conventional Commits

All commit messages follow the **Conventional Commits** specification to enable automated versioning and changelog generation.

**Commit Message Format**:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Supported Commit Types**:

- **`feat`**: A new feature (results in MINOR version bump)
- **`fix`**: A bug fix (results in PATCH version bump)
- **`docs`**: Documentation only changes
- **`chore`**: Changes to build process or auxiliary tools
- **`refactor`**: Code change that neither fixes a bug nor adds a feature
- **`perf`**: Performance improvements
- **`test`**: Adding or updating tests
- **`build`**: Changes to build system or dependencies
- **`ci`**: Changes to CI/CD configuration

**Commit Message Examples**:

```bash
# Feature commit (minor version bump)
feat: add loan application form

# Bug fix (patch version bump)
fix(button): resolve button styling issue

# Documentation
docs: update component usage guidelines

# Chore
chore(deps): update dependencies

# Breaking change (major version bump)
feat!: redesign loan processing flow
```

**Breaking Changes**:

- Add `!` after the type/scope to indicate a breaking change (results in MAJOR version bump)
- Example: `feat(api)!: change loan API structure`

### Semantic Release

**Automated Release Process**:

- **Configuration**: `.releaserc.js` and `changelog.config.js`
- **Version Detection**: Analyzes commit messages to determine version bump (major, minor, patch)
- **Changelog Generation**: Automatically generates changelog from commit messages
- **Git Tags**: Creates and pushes version tags to the repository
- **GitHub Releases**: Creates GitHub releases with changelog entries

**Version Bumping Rules**:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes (`feat!`, `fix!`, etc. with `!`)
- **MINOR** (1.0.0 → 1.1.0): New features (`feat`)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes (`fix`)
- **No Release**: Other commit types (docs, chore, etc.) don't trigger releases

### Best Practices

**Commit Message Guidelines**:

- ✅ **ALWAYS** use conventional commit format
- ✅ Use clear, descriptive commit messages
- ✅ Include scope when commit affects specific area: `feat(loan): ...`, `fix(ui): ...`
- ✅ Use imperative mood ("add feature" not "added feature")
- ✅ Keep first line under 72 characters
- ✅ Add body for complex changes explaining the "why"
- ❌ **NEVER** use generic messages like "update", "fix", "changes"

---

## 🎨 Styling System

This project uses **Tailwind CSS 4** for styling with a custom theme configuration.

### Styling Approach

1. **Tailwind CSS 4** is configured with CSS-based theme configuration in `globals.css`
2. **Global styles** are defined in `app/globals.css`
3. **Tailwind classes** work on React components via the `className` prop
4. **Custom theme** is configured in `globals.css` using CSS variables (Tailwind 4 CSS-based configuration)
5. **Radix UI** components are styled with Tailwind classes
6. **shadcn/ui** provides pre-styled component primitives based on Radix UI
7. **Tailwind Animate** (tw-animate-css) provides animation utilities

> 🎨 **CRITICAL: Tailwind 4 Configuration Priority**
>
> - ✅ **PRIMARY**: Configure Tailwind in `globals.css` using CSS-based configuration (Tailwind 4 recommended approach)
> - ⚠️ **LAST RESORT**: Use `tailwind.config.js` only when CSS-based configuration is not sufficient
> - 💡 **Why**: Tailwind CSS 4 prefers CSS-based configuration for better performance and simpler setup

### Theme Colors

The project uses a custom color palette defined in `globals.css`:

- **Primary Colors**: Custom primary palette with foreground variants
- **Secondary Colors**: Custom secondary palette with foreground variants
- **Muted Colors**: Muted palette for subtle backgrounds
- **Accent Colors**: Accent palette for highlights
- **Destructive Colors**: Error/destructive action colors
- **Chart Colors**: Chart color palette (chart-1 through chart-5)
- **Sidebar Colors**: Sidebar-specific color palette
- **Semantic Colors**: Border, input, ring, popover, card colors

### Custom Fonts

- **Geist Sans**: Primary body font (via Next.js Google Fonts)
- **Geist Mono**: Monospace font for code (via Next.js Google Fonts)

### Configuration Files

- **Tailwind CSS configuration**: Configured in `app/globals.css` using CSS `@theme` directive
- **PostCSS configuration**: `postcss.config.mjs` for processing CSS
- **shadcn/ui configuration**: `components.json` for component library settings

### Usage in Components

Use standard Tailwind CSS classes on React components:

```tsx
<div className="flex items-center justify-center bg-primary p-4">
  <h1 className="text-lg font-bold text-foreground">Hello World</h1>
</div>
```

### Icon System

> 🎨 **ICON LIBRARY**: Use **Lucide React** for all icons in the app
> 🏷️ **NAMING CONVENTION**: Always use descriptive names (e.g., `ArrowUpRight`, `Menu`, `X`)
> 🚫 **NO EMOJIS**: NEVER use emojis (🚀, 💡, ✅, etc.) in the UI - ALWAYS use Lucide icons instead

**Why Lucide Icons**:

- ✅ Consistent, professional icon design
- ✅ Tree-shakeable (only import icons you use)
- ✅ Customizable size and color
- ✅ Wide variety of icons (~1000+ icons available)
- ✅ Professional appearance (no emojis!)

**How to Use Lucide Icons**:

```tsx
// Import specific icons
import { ArrowUpRight, Menu, X, Search } from 'lucide-react';

// Basic usage
<Menu size={24} color="#4a93f7" />

// In components
<Button>
  <ArrowUpRight size={20} />
  Submit
</Button>
```

**Icon Usage Guidelines**:

- ✅ **ALWAYS** use Lucide icons with descriptive names for UI elements
- ✅ Import only the specific icons you need (tree-shaking)
- ✅ Use consistent sizing: 16px (sm), 20px (md), 24px (lg), 28px (xl)
- ✅ Match icon colors to design system
- ❌ **NEVER** use emoji as icons in production code
- ❌ **NEVER** use emojis for visual indicators, status, or decorative purposes
- ❌ **AVOID** custom SVG icons unless absolutely necessary

---

## ✅ Best Practices and Coding Style

### State Management & Data Fetching

> 🔒 **RECOMMENDED RULE: ALL server requests (real AND dummy) SHOULD use TanStack Query**
>
> 🚫 **useState is ONLY for UI state, NEVER for server/API data state**

1. **🚨 RECOMMENDED: TanStack Query for ALL Server Operations** (when added):
   - ✅ **RECOMMENDED to use** TanStack Query for ALL server requests:
     - ✅ Real API calls (REST API, etc.)
     - ✅ Mock/dummy API calls for testing or development
     - ✅ ANY external API requests (REST, GraphQL, etc.)
     - ✅ ANY asynchronous data fetching from servers
   - ❌ **AVOID using** `useState` to manage server request state (loading, data, error)
   - ❌ **AVOID using** `useEffect` to fetch server data
   - 💡 **Why**: TanStack Query provides automatic caching, background updates, request deduplication, and optimistic updates

2. **State Management Hierarchy** (use in this order):
   - **TanStack Query**: For ALL server/API state (queries, mutations, loading, errors, cache) - RECOMMENDED for ANY server data
   - **useState**: For local UI state only (form inputs, toggles, modals, local flags, component-level state)
   - 🔒 **Golden Rule**: If data comes from a server (real or mock), use TanStack Query. If it's UI state, use useState.

3. **AVOID unnecessary `useEffect`** - only use when you need to synchronize with external systems:
   - ✅ **Valid uses**: setting up event listeners, syncing with browser APIs, subscribing to WebSocket/real-time
   - ❌ **Avoid**: fetching data (use TanStack Query), transforming data (use `useMemo`), handling events (use event handlers)
   - 💡 **Tip**: If you can calculate something during render, you don't need `useEffect`

### Forms & Validation

1. **USE React Hook Form** for form management (when forms are added)
2. **ALWAYS USE Zod** for schema validation - validation is REQUIRED for all forms
3. **ALWAYS** validate form inputs before submission
4. **PROVIDE** clear error messages to users

### Component & File Conventions

1. **USE** `.tsx` extension for components (TypeScript + JSX)
2. **PREFER** functional components with React hooks
3. **USE** `export default` for page components in Next.js App Router
4. **USE** `kebab-case` for all file and folder names:
   - Component files: `button.tsx`, `loan-form.tsx`
   - Hook files: `use-loan-data.ts`
   - Utility files: `utils.ts`
   - Folder names: `components/`, `app/`
5. **USE** `PascalCase` for component names in code:
   - Export: `export function Button() { ... }`
   - Import/Usage: `<Button />`, `<LoanForm />`
6. **IMPORT PATH GUIDELINES**:
   - ✅ **Root-level shared code**: Use absolute imports with `@/` alias
     - `import { Button } from '@/components/ui/button'`
     - `import { cn } from '@/lib/utils'`
     - `import { useSharedHook } from '@/hooks/use-shared-hook'`
   - ✅ **Route-level modular code**: Use relative imports within the route
     - `import { RouteComponent } from './components/route-component'`
     - `import { useRouteData } from './hooks/use-route-data'`
     - `import { routeConfig } from './constants/route-config'`
   - ❌ **Avoid**: Relative imports that go up multiple levels
     - ❌ `import { Button } from '../../components/ui/button'` (use `@/components/ui/button` instead)

### Props & TypeScript

1. **ALWAYS** define prop types using TypeScript interfaces or types
2. **PREFER** destructuring props in function parameters
3. **USE** shared types when available

```tsx
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant, size, children }: ButtonProps) {
  // component logic
}
```

### UI & Styling

1. **USE Tailwind CSS** for styling via the `className` prop
2. **USE Radix UI** primitives for accessible components
3. **USE shadcn/ui** components (built on Radix UI) for common UI patterns
4. **USE Lucide React** for all icons (see Icon System section above)
5. **PREFER** Tailwind utility classes over inline styles
6. **USE** `cn()` utility function (from `lib/utils.ts`) for conditional class names
7. **⭐ ALWAYS PREFER skeleton loading** over circle/spinner loading for better UX:
   - ✅ Skeleton loading provides visual context and reduces perceived wait time
   - ❌ Avoid circle/spinner loading unless it's for very brief operations (<500ms)

### Code Quality

1. **FOLLOW** ESLint rules (configured with Next.js config)
2. **USE** Prettier for code formatting
3. **USE** single quotes for strings (Prettier config)
4. **PREFER** meaningful variable and function names
5. **SPLIT** large components (>300 lines) into smaller components
6. **USE** TypeScript strict mode
7. **AVOID** `any` type - use proper types or `unknown`
8. **UPDATE** relevant `AGENTS.md` files whenever code structure, patterns, or conventions change (see [Documentation Maintenance](#-documentation-maintenance))

### Routing (Next.js App Router)

1. **USE Next.js App Router** file-based routing in `/app/` directory
2. **USE** `layout.tsx` for shared layouts
3. **IMPORT** from `next/navigation` for navigation:
   - `useRouter()` for programmatic navigation
   - `useSearchParams()` for query parameters
   - `usePathname()` for current pathname
   - `Link` component for declarative navigation

### API & Services

1. **USE** TanStack Query hooks for ALL API operations (when added)
2. **CREATE** custom hooks following modular pattern:
   - ✅ **Shared hooks**: Place in root `/hooks/` for hooks used across multiple routes
   - ✅ **Route-specific hooks**: Place in `app/[route]/hooks/` for hooks only used in that route
3. **USE** environment variables for API configuration
4. **API Routes**: Use Next.js API routes for server-side endpoints when needed
5. **DATABASE OPERATIONS**: 
   - ✅ **ALWAYS** use Drizzle ORM for database operations (see [Database & ORM](#️-database--orm))
   - ✅ **ALWAYS** import database instance from `@/lib/db`
   - ✅ **ALWAYS** import schema tables from `@/lib/db/schema`
   - ✅ **ALWAYS** use TypeScript types from schema (`Post`, `NewPost`, etc.)
   - ✅ **ALWAYS** handle errors with try-catch blocks in API routes
   - ✅ **ALWAYS** validate request data before database operations

### Environment & Configuration

1. **USE** environment variables in `.env` files
2. **NEVER** commit `.env` with sensitive keys (use `.env.local` or secure secrets management)
3. **PREFIX** public environment variables appropriately:
   - Next.js: `NEXT_PUBLIC_*` for client-side variables
   - Server-side: Standard naming for server-side variables

### Error Handling

1. **ALWAYS** handle errors gracefully
2. **PROVIDE** user-friendly error messages
3. **LOG** errors appropriately (server-side logging)
4. **USE** TanStack Query error states for API errors (when using TanStack Query)
5. **DISPLAY** error states in UI (error boundaries, toast notifications)

### Performance

1. **USE** Next.js Image component for images
2. **IMPLEMENT** code splitting with dynamic imports
3. **OPTIMIZE** bundle size (check with `bun run build`)
4. **USE** React.memo for expensive components (when needed)
5. **USE** useMemo and useCallback appropriately (avoid premature optimization)
6. **MONITOR** bundle size and performance metrics

### Testing (When Applicable)

1. **WRITE** tests for critical business logic
2. **USE** appropriate testing frameworks (Jest, React Testing Library)
3. **TEST** API endpoints and services
4. **MAINTAIN** test coverage for shared utilities

---

## 📚 Additional Resources

- **Next.js Documentation**: <https://nextjs.org/docs>
- **Tailwind CSS**: <https://tailwindcss.com/docs>
- **Radix UI**: <https://www.radix-ui.com/>
- **shadcn/ui**: <https://ui.shadcn.com/>
- **Lucide Icons**: <https://lucide.dev/icons>
- **Bun**: <https://bun.sh/docs>
- **Conventional Commits**: <https://www.conventionalcommits.org/>
- **Semantic Release**: <https://semantic-release.gitbook.io/>

---

## 🎯 Quick Reference

### Common Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Lint code
bun run lint

# Database commands
bun run db:generate    # Generate migration files from schema
bun run db:migrate     # Run pending migrations
bun run db:push        # Push schema changes directly (development)
bun run db:studio      # Open Drizzle Studio (database GUI)
```

### Ports

- **Web**: <http://localhost:3000>
- **Drizzle Studio**: <http://localhost:4983> (when running `db:studio`)

### Key Directories

- `app/` - Next.js App Router routes and pages
- `app/api/` - API routes (Next.js API endpoints)
- `components/` - Shared React components
- `lib/` - Utility functions
- `lib/db/` - Database connection and schema
- `drizzle/` - Generated migration files
- `public/` - Static assets (images, fonts, icons)

---

> 🧠 This document provides comprehensive context and guidelines for the JLoan project. Keep it updated as the project evolves!
