/**
 * ISR & Edge Caching Configuration (`revalidate = 60` seconds)
 * Blueprint: TASK-601 & architecture.md §10.1
 * Ensures public CV galleries and rental package catalogs serve within < 50ms TTFB
 * while revalidating availability in the background every 60 seconds.
 */

export const ISR_REVALIDATE_SECONDS = 60;
export const ISR_STALE_TIME_MS = ISR_REVALIDATE_SECONDS * 1000;

export interface IsrCachePolicy {
  routePattern: string;
  revalidateSeconds: number;
  staleWhileRevalidateSeconds: number;
  cacheControlHeader: string;
}

export const ISR_ROUTE_POLICIES: Record<string, IsrCachePolicy> = {
  PUBLIC_CV_GALLERY: {
    routePattern: '/workspace/cvs',
    revalidateSeconds: 60,
    staleWhileRevalidateSeconds: 300,
    cacheControlHeader: 'public, s-maxage=60, stale-while-revalidate=300',
  },
  RENTAL_PACKAGES_CATALOG: {
    routePattern: '/workspace/rent-packages',
    revalidateSeconds: 60,
    staleWhileRevalidateSeconds: 300,
    cacheControlHeader: 'public, s-maxage=60, stale-while-revalidate=300',
  },
  LANDING_PORTAL: {
    routePattern: '/',
    revalidateSeconds: 60,
    staleWhileRevalidateSeconds: 600,
    cacheControlHeader: 'public, s-maxage=60, stale-while-revalidate=600',
  },
};

export function getIsrQueryOptions(policyKey: keyof typeof ISR_ROUTE_POLICIES = 'PUBLIC_CV_GALLERY') {
  const policy = ISR_ROUTE_POLICIES[policyKey] || ISR_ROUTE_POLICIES.PUBLIC_CV_GALLERY;
  return {
    staleTime: policy.revalidateSeconds * 1000,
    gcTime: policy.staleWhileRevalidateSeconds * 1000,
    refetchOnWindowFocus: false,
  };
}
