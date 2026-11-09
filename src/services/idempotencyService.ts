import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface IdempotencyRecord<TResponse = unknown> {
  idempotency_key: string;
  company_id: string;
  operation_type: string;
  request_hash: string;
  response_status: number;
  response_body: TResponse;
  created_at: string;
  expires_at: string;
}

const memoryIdempotencyCache = new Map<string, IdempotencyRecord>();

function canUseRemoteDatabase(): boolean {
  return isSupabaseConfigured && import.meta.env.MODE !== 'test';
}

/**
 * Deterministic fast hash for payload comparison to prevent Idempotency-Key reuse with mutated payloads.
 */
export function computePayloadHash(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? {});
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `FNV1A-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function generateIdempotencyKey(prefix: string, companyId: string, uniqueSeed?: string): string {
  const scopedCompany = companyId && companyId !== 'all' ? companyId : 'SAF';
  const seed = uniqueSeed || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  return `IDEMP-${scopedCompany}-${prefix.toUpperCase()}-${seed}`;
}

export const idempotencyService = {
  /**
   * Executes a critical financial or contractual mutation under strict Idempotency-Key protection
   * (architecture.md §7.3 & rules.md §3.3).
   *
   * - If the same `idempotencyKey` was already processed with the same payload hash, returns the cached response without re-running `handler`.
   * - If the same `idempotencyKey` is reused with a different payload hash, throws an idempotency conflict error.
   */
  async executeWithIdempotency<TResponse>(params: {
    idempotencyKey: string;
    companyId: string;
    operationType: string;
    payload: unknown;
    ttlMs?: number;
    handler: () => Promise<TResponse> | TResponse;
  }): Promise<{ data: TResponse; deduplicated: boolean; record: IdempotencyRecord<TResponse> }> {
    const { idempotencyKey, operationType, payload, handler } = params;
    if (!idempotencyKey || idempotencyKey.trim().length < 6) {
      throw new Error('Idempotency-Key صالح ومطلوب لجميع العمليات المالية والتعاقدية الحرجة.');
    }

    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'SAF';
    const requestHash = computePayloadHash(payload);
    const now = Date.now();

    const existing = memoryIdempotencyCache.get(idempotencyKey);
    if (existing && new Date(existing.expires_at).getTime() > now) {
      if (existing.request_hash !== requestHash) {
        throw new Error(
          `تعارض مفتاح عدم التكرار (Idempotency Conflict): المفتاح ${idempotencyKey} مستخدم مسبقاً ببيانات مختلفة.`
        );
      }
      return {
        data: existing.response_body as TResponse,
        deduplicated: true,
        record: existing as IdempotencyRecord<TResponse>,
      };
    }

    if (canUseRemoteDatabase()) {
      try {
        const { data: remoteExisting } = await supabase
          .from('idempotency_records')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (remoteExisting && new Date(remoteExisting.expires_at).getTime() > now) {
          if (remoteExisting.request_hash !== requestHash) {
            throw new Error(
              `تعارض مفتاح عدم التكرار (Idempotency Conflict): المفتاح ${idempotencyKey} مستخدم مسبقاً ببيانات مختلفة.`
            );
          }
          memoryIdempotencyCache.set(idempotencyKey, remoteExisting as IdempotencyRecord);
          return {
            data: remoteExisting.response_body as TResponse,
            deduplicated: true,
            record: remoteExisting as IdempotencyRecord<TResponse>,
          };
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Idempotency Conflict')) {
          throw err;
        }
      }
    }

    const result = await handler();
    const ttlMs = params.ttlMs ?? 24 * 60 * 60 * 1000;
    const record: IdempotencyRecord<TResponse> = {
      idempotency_key: idempotencyKey,
      company_id: companyId,
      operation_type: operationType,
      request_hash: requestHash,
      response_status: 200,
      response_body: result,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString(),
    };

    memoryIdempotencyCache.set(idempotencyKey, record);

    if (canUseRemoteDatabase()) {
      try {
        await supabase.from('idempotency_records').upsert([record], { onConflict: 'idempotency_key' });
      } catch (err) {
        console.warn('[IdempotencyService] Remote persistence warning:', err);
      }
    }

    return {
      data: result,
      deduplicated: false,
      record,
    };
  },

  getRecord(idempotencyKey: string): IdempotencyRecord | undefined {
    return memoryIdempotencyCache.get(idempotencyKey);
  },

  clearCacheForTesting(): void {
    memoryIdempotencyCache.clear();
  },
};
