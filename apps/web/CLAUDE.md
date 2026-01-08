# ConstructionPro - Claude Instructions

## Project Overview
ConstructionPro is a construction project management platform built with Next.js 14, Prisma, PostgreSQL (Supabase), and TypeScript. Deployed on Vercel.

## Proactive Agent Usage

**Use agents automatically when the situation fits - don't wait to be asked.**

### When to Use Each Agent:

| Trigger | Agent | Why |
|---------|-------|-----|
| After writing/modifying API routes | `next-app-router-validator` | Catch missing force-dynamic before deployment |
| After creating pages with interactivity | `next-app-router-validator` | Catch missing 'use client' directives |
| Before any Vercel deployment | `next-app-router-validator` | Prevent build failures |
| After modifying Prisma queries | `prisma-postgres-checker` | Ensure PostgreSQL compatibility |
| When search/filter features are touched | `prisma-postgres-checker` | Verify case-insensitive search |
| After integrating external APIs | `api-field-mapper` | Verify response shapes match interfaces |
| When data isn't displaying correctly | `api-field-mapper` | Find field name mismatches |
| After implementing new features | `error-handler` | Ensure proper error handling |
| After writing significant code | `quality-control-enforcer` | Validate implementation quality |
| When building UI components | `construction-ui` | Follow mobile-first, field-worker-friendly patterns |
| When implementing workflows | `construction-workflow` | Validate business logic and approval flows |
| Before releases | `changelog-writer` | Generate changelog from commits |
| After adding features | `readme-updater` | Keep documentation in sync |
| When handling user input/auth | `security-auditor` | Check for vulnerabilities |
| After new features | `test-scaffolder` | Generate test coverage |
| When app feels slow | `performance-reviewer` | Find optimization opportunities |
| After modifying any API route | `api-response-transformer` | Ensure consistent snake_case format for mobile |
| After modifying auth code | `security-token-auditor` | Verify secure token handling |

### Agent Usage Guidelines:

1. **Be proactive** - Run relevant agents after completing work, not just when asked
2. **Run in parallel** - When multiple agents are relevant, run them simultaneously
3. **Trust agent output** - Act on agent recommendations
4. **Combine agents** - A new API route might need both `next-app-router-validator` AND `error-handler`

## Tech Stack Quick Reference

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Supabase)
- **Auth**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Deployment**: Vercel

## Common Gotchas (Learned from Experience)

1. **All API routes using `getServerSession`** must have `export const dynamic = 'force-dynamic'`
2. **All string searches in Prisma** must use `mode: 'insensitive'` for PostgreSQL
3. **Pages with onClick/useState** must have `'use client'` directive
4. **Zod schemas with `.refine()`** become ZodEffects and can't use `.merge()` - use base schemas
5. **API response field names** must match interface field names exactly
6. **Json fields in Prisma (reading)** are already parsed - NEVER use `JSON.parse()`. Cast through `unknown`: `field as unknown as string[]`
7. **Json fields in Prisma (writing)** accept objects directly - NEVER use `JSON.stringify()`. Pass the object/array directly

## Agent Definitions

### api-response-transformer

**Purpose**: Ensure all API routes return consistent format for iOS/Android compatibility.

**What it checks**:
- All response objects use `transformX()` functions for snake_case
- Nested objects are flattened (no `_count.projects`, no `project.name`)
- Both camelCase and snake_case accepted in request bodies
- Pagination format is consistent across endpoints
- Error responses follow `{ error: string }` format

### security-token-auditor

**Purpose**: Catch security issues in API authentication.

**What it checks**:
- JWT tokens validated on all protected routes
- `requireApiAuth()` called before any data access
- No tokens logged or exposed in error messages
- Proper CORS configuration
- Rate limiting on auth endpoints
