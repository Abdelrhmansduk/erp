# Security Policy — KAS ERP (Khalid Al-Sulaim Holding Group)

## Protected Boundaries & Secrets Hygiene
1. **Never commit secrets**: `.env`, `.env.local`, Supabase `service_role` keys, SMTP credentials, or ZATCA private certificates must NEVER be committed to Git. Always store them in **GitHub Repository Secrets** or **Vercel/Supabase Environment Variables**.
2. **Strict Multi-Company & RLS Isolation**: Every Supabase table must have Row Level Security (`ENABLE ROW LEVEL SECURITY`) enabled and scoped by `company_id` and authenticated corporate email (`@kas.sa`).
3. **Branch Protection on `main`**: All production changes should pass CI (`Typecheck`, `Vitest Suite`, `Production Build`, and `Secrets Guard`) before merge/release.

## Reporting a Vulnerability
Please report security findings privately to the system administrator (`a.salif.dev@kas.sa`) rather than opening a public issue.
