/**
 * Authentication mode configuration.
 *
 * - Production (default): real Supabase Auth — passwords are verified server-side,
 *   Google uses real OAuth, and no session is ever created automatically.
 * - Demo mode: the built-in staff directory can sign in without a real Supabase account
 *   (any non-empty password). Intended for local development & sales demos ONLY.
 *
 * Demo mode is ON automatically in `vite dev` / vitest, and OFF in production builds
 * unless `VITE_DEMO_AUTH=true` is explicitly set. Set `VITE_DEMO_AUTH=false` to test
 * real authentication locally.
 */
const rawDemoFlag = String(import.meta.env.VITE_DEMO_AUTH ?? '').trim().toLowerCase();

export const DEMO_AUTH_ENABLED: boolean =
  rawDemoFlag === 'true' || (rawDemoFlag !== 'false' && Boolean(import.meta.env.DEV));

/** Placeholder credential used only by demo quick-login shortcuts (never sent to Supabase). */
export const DEMO_QUICK_LOGIN_SECRET = 'demo-quick-login';
