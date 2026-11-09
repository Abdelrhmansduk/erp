---
name: supabase-integration
description: "Patterns, database queries, authentication, Row Level Security (RLS), and schema migrations for Supabase."
---

# Supabase Integration Skill

## Rules for Supabase Operations

### 1. Database Queries & Error Handling
- Always check and handle the `{ data, error }` return object from Supabase client calls.
- Never wrap API calls in silent try/catch blocks that swallow underlying error codes.
- Use explicit select fields when querying tables instead of blanket `select('*')` for production queries.

### 2. Row Level Security (RLS) & Security
- Ensure every table created has Row Level Security (RLS) enabled.
- Define explicit security policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- Secure environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and never expose service role keys on the frontend.

### 3. TypeScript Schema Generation
- Keep database interfaces synced with Supabase types.
- Ensure nullability checks are strictly handled before accessing properties.
