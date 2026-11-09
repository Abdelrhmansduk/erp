import { describe, it, expect, beforeEach } from 'vitest';
import {
  publicPagesIsrEngine,
  multiTierCacheEngine,
  cdnEdgeTopologyEngine,
  databaseQuerierEngine,
  loadTestRunnerEngine,
  ISR_REVALIDATE_SECONDS,
} from './edgePerformanceAndDatabaseEngine';
import { domainEventBus } from './domainEventBus';

describe('Enterprise High-Performance Infrastructure Engine (ISR, Caching, CDN, DB Querier, Load Testing)', () => {
  beforeEach(() => {
    publicPagesIsrEngine.clearForTesting();
    multiTierCacheEngine.clearForTesting();
    cdnEdgeTopologyEngine.clearForTesting();
  });

  describe('1. Public Pages ISR Engine', () => {
    it('generates an initial snapshot with correct s-maxage and stale-while-revalidate headers, then serves HIT within TTL', () => {
      const t0 = 1_700_000_000_000;
      const first = publicPagesIsrEngine.getOrGenerateSnapshot({
        routePath: '/portal/client/SAF-901',
        routeKey: 'portal_client_status',
        companyId: 'SAF',
        nowMs: t0,
        generator: () => ({ stage: 'MEDICAL_EXAM', contractNo: 'SAF-901' }),
      });

      expect(first.cacheStatus).toBe('MISS_GENERATED');
      expect(first.snapshot.revalidateSeconds).toBe(ISR_REVALIDATE_SECONDS.portal_client_status);
      expect(first.snapshot.headers['Cache-Control']).toContain('s-maxage=60');
      expect(first.snapshot.headers['Cache-Control']).toContain('stale-while-revalidate=86400');

      const second = publicPagesIsrEngine.getOrGenerateSnapshot({
        routePath: '/portal/client/SAF-901',
        routeKey: 'portal_client_status',
        companyId: 'SAF',
        nowMs: t0 + 30_000,
        generator: () => ({ stage: 'VISA_STAMPING', contractNo: 'SAF-901' }),
      });

      expect(second.cacheStatus).toBe('HIT');
      expect(second.snapshot.payload.stage).toBe('MEDICAL_EXAM');
    });

    it('supports on-demand revalidation via domain events and webhook paths', async () => {
      const t0 = 1_700_000_000_000;
      publicPagesIsrEngine.getOrGenerateSnapshot({
        routePath: '/portal/client/SAF-902',
        routeKey: 'portal_client_status',
        companyId: 'SAF',
        nowMs: t0,
        generator: () => ({ stage: 'CONTRACT_SIGNED' }),
      });

      await domainEventBus.publishDomainEvent({
        eventType: 'CONTRACT_STAGE_CHANGED',
        aggregateType: 'CONTRACT',
        aggregateId: 'SAF-902',
        companyId: 'SAF',
        payload: { newStage: 'TRAVEL_TICKET' },
      });

      const afterEvent = publicPagesIsrEngine.getOrGenerateSnapshot({
        routePath: '/portal/client/SAF-902',
        routeKey: 'portal_client_status',
        companyId: 'SAF',
        nowMs: t0 + 5_000,
        generator: () => ({ stage: 'TRAVEL_TICKET' }),
      });

      expect(afterEvent.cacheStatus).toBe('STALE_REVALIDATED');
      expect(afterEvent.snapshot.payload.stage).toBe('TRAVEL_TICKET');
      expect(afterEvent.snapshot.lastRevalidatedReason).toContain('CONTRACT_STAGE_CHANGED');
    });
  });

  describe('2. Multi-Tier Caching Engine (L1 + L2 SWR + Tenant Isolation)', () => {
    it('isolates cache keys strictly by companyId and transitions from HIT -> STALE -> MISS', () => {
      const t0 = 1_700_000_000_000;
      multiTierCacheEngine.set({
        companyId: 'SAF',
        namespace: 'trial_balance',
        key: '2026-Q4',
        value: { totalDebit: 500_000 },
        tags: ['ledger', 'finance'],
        staleTimeMs: 5 * 60 * 1000,
        cacheTimeMs: 30 * 60 * 1000,
        nowMs: t0,
      });

      // Another tenant (YAQ) must never read SAF's cached data
      const crossTenantRead = multiTierCacheEngine.get({
        companyId: 'YAQ',
        namespace: 'trial_balance',
        key: '2026-Q4',
        nowMs: t0 + 1_000,
      });
      expect(crossTenantRead.status).toBe('MISS');

      // Fresh HIT for SAF within 5 minutes
      const hitRead = multiTierCacheEngine.get<{ totalDebit: number }>({
        companyId: 'SAF',
        namespace: 'trial_balance',
        key: '2026-Q4',
        nowMs: t0 + 60_000,
      });
      expect(hitRead.status).toBe('HIT');
      expect(hitRead.value?.totalDebit).toBe(500_000);

      // STALE (SWR window) between 5 minutes and 30 minutes
      const staleRead = multiTierCacheEngine.get<{ totalDebit: number }>({
        companyId: 'SAF',
        namespace: 'trial_balance',
        key: '2026-Q4',
        nowMs: t0 + 10 * 60 * 1000,
      });
      expect(staleRead.status).toBe('STALE');
      expect(staleRead.value?.totalDebit).toBe(500_000);

      // Tag invalidation purges tagged entries for that tenant
      const invalidated = multiTierCacheEngine.invalidateByTag('SAF', 'ledger');
      expect(invalidated).toBe(1);
    });
  });

  describe('3. CDN & Edge Topology (Saudi PoPs & Sliding-Window Rate Limiter)', () => {
    it('routes Saudi cities to the nearest Edge PoP (RUH, JED, DMM) and emits immutable headers for /assets/', () => {
      expect(cdnEdgeTopologyEngine.resolveNearestPop('فرع الرياض الرئيسي').code).toBe('RUH');
      expect(cdnEdgeTopologyEngine.resolveNearestPop('فرع جدة - طريق المدينة').code).toBe('JED');
      expect(cdnEdgeTopologyEngine.resolveNearestPop('فرع الدمام والخبر').code).toBe('DMM');

      const assetHeaders = cdnEdgeTopologyEngine.getEdgeHeadersForAsset('/assets/index-abc123.js');
      expect(assetHeaders['Cache-Control']).toBe('public, max-age=31536000, immutable');

      const docHeaders = cdnEdgeTopologyEngine.getEdgeHeadersForAsset('/index.html');
      expect(docHeaders['X-Frame-Options']).toBe('DENY');
    });

    it('enforces 10 requests / 5 minutes on AUTH routes per IP', () => {
      const t0 = 1_700_000_000_000;
      for (let i = 0; i < 10; i++) {
        const res = cdnEdgeTopologyEngine.checkRateLimit({
          ipAddress: '203.0.113.55',
          routeCategory: 'AUTH',
          nowMs: t0 + i * 100,
        });
        expect(res.allowed).toBe(true);
      }

      const eleventh = cdnEdgeTopologyEngine.checkRateLimit({
        ipAddress: '203.0.113.55',
        routeCategory: 'AUTH',
        nowMs: t0 + 2_000,
      });
      expect(eleventh.allowed).toBe(false);
      expect(eleventh.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('4. Database Querier & Tuning Engine (RLS InitPlan & OLTP 100ms Budget)', () => {
    it('validates RLS policies for InitPlan subselect wrapping', () => {
      const unoptimized = databaseQuerierEngine.validateRlsPolicySql(
        "USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id'))"
      );
      expect(unoptimized.isOptimalInitPlan).toBe(false);

      const optimized = databaseQuerierEngine.validateRlsPolicySql(
        'USING (company_id = (SELECT public.current_user_company_id()))'
      );
      expect(optimized.isOptimalInitPlan).toBe(true);
    });

    it('enforces <= 100ms OLTP query budget and tenant scoping', async () => {
      expect(() =>
        databaseQuerierEngine.buildQueryPlan({
          table: 'recruitment_contracts',
          companyId: 'all',
          isGroupExecutive: false,
        })
      ).toThrow();

      const fastExec = await databaseQuerierEngine.executeWithQueryBudget({
        table: 'recruitment_contracts',
        companyId: 'SAF',
        workloadType: 'OLTP',
        simulatedDurationMs: 28,
        queryFn: () => [{ id: 'CNT-1' }],
      });
      expect(fastExec.plan.budgetMs).toBe(100);
      expect(fastExec.plan.targetNode).toBe('PRIMARY_POOL_SUPAVISOR');

      await expect(
        databaseQuerierEngine.executeWithQueryBudget({
          table: 'recruitment_contracts',
          companyId: 'SAF',
          workloadType: 'OLTP',
          simulatedDurationMs: 145,
          queryFn: () => [],
        })
      ).rejects.toThrow(/Query Budget Exceeded/);
    });
  });

  describe('5. Load Testing & SLO Benchmark Runner (5,000 VUs / 1,200 req/s)', () => {
    it('verifies enterprise SLO targets (p50 < 80ms, p95 < 250ms, p99 < 500ms, errorRate < 0.01%)', () => {
      const report = loadTestRunnerEngine.runLoadBenchmark();
      expect(report.virtualUsers).toBe(5000);
      expect(report.targetRps).toBe(1200);
      expect(report.p50LatencyMs).toBeLessThanOrEqual(80);
      expect(report.p95LatencyMs).toBeLessThanOrEqual(250);
      expect(report.p99LatencyMs).toBeLessThanOrEqual(500);
      expect(report.errorRatePct).toBeLessThanOrEqual(0.01);
      expect(report.sloPassed).toBe(true);
    });
  });
});
