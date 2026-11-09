/**
 * KHALID GROUP ERP — DATA & TENANT ISOLATION ENGINE
 * Blueprint: Khalid_ERP_Data_User_Isolation_Plan_AR.docx
 * Enforces Zero Cross-Tenant Leakage across Database, Cache, Storage, Queries, and Exports.
 */

import { supabase } from './supabaseClient';
import { iamPolicyEngine } from './iamPolicyEngine';

export interface ScopedQueryContext {
  tenantId?: string;
  companyId: string;
  companyCode?: string;
  branchId?: string;
  departmentId?: string;
  userEmail: string;
  userId?: string;
}

export interface SharedMasterReference {
  id: string;
  category: 'country' | 'currency' | 'job_title' | 'standard_unit' | string;
  code: string;
  nameAr: string;
  nameEn?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
}

class DataIsolationService {
  // ============================================================================
  // 1. TENANT-AWARE CACHE KEY GENERATION (Section 12 of Blueprint)
  // ============================================================================

  /**
   * Generates a strict tenant-isolated cache key.
   * Format: `company:{companyId}:{resource}:{recordId}`
   */
  public getScopedCacheKey(companyId: string, resource: string, keySuffix: string = 'list'): string {
    if (!companyId) throw new Error('Data Isolation Violation: companyId is required for Cache Key generation.');
    return `company:${companyId}:${resource}:${keySuffix}`;
  }

  // ============================================================================
  // 2. TENANT-AWARE OBJECT STORAGE PATH (Section 10 of Blueprint)
  // ============================================================================

  /**
   * Generates a secured, company-isolated object storage path.
   * Format: `companies/{companyId}/{resource}/{recordId}/{fileName}`
   */
  public getScopedStoragePath(
    companyId: string,
    resource: string,
    recordId: string,
    fileName: string
  ): string {
    if (!companyId) throw new Error('Data Isolation Violation: companyId is required for Storage Path generation.');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `companies/${companyId}/${resource}/${recordId}/${sanitizedFileName}`;
  }

  // ============================================================================
  // 3. CROSS-TENANT INTEGRITY & IDOR VALIDATION (Section 8 & 20 of Blueprint)
  // ============================================================================

  /**
   * Validates whether an actor in company A is attempting to access a record owned by company B.
   * Logs an audit alert automatically if a violation is detected.
   */
  public async validateCrossTenantAccess(
    context: ScopedQueryContext,
    targetRecordCompanyId: string,
    resource: string,
    recordId?: string
  ): Promise<boolean> {
    if (context.companyId === targetRecordCompanyId) {
      return true;
    }

    // Violation Detected!
    await iamPolicyEngine.logAudit({
      actorId: context.userId,
      actorEmail: context.userEmail,
      companyId: context.companyId,
      companyCode: context.companyCode,
      action: 'CROSS_TENANT_ACCESS_BLOCKED',
      resource,
      recordId,
      result: 'FORBIDDEN',
      severity: 'خطر أمني',
      newValues: {
        attemptedCompanyId: targetRecordCompanyId,
        actorCompanyId: context.companyId,
      },
    });

    console.error(
      `[SECURITY ALERT] Cross-tenant access blocked! Actor in company [${context.companyId}] attempted unauthorized access to [${resource}:${recordId}] owned by company [${targetRecordCompanyId}].`
    );

    return false;
  }

  // ============================================================================
  // 4. SCOPED QUERY REPOSITORIES (Section 19 of Blueprint)
  // ============================================================================

  /**
   * Scoped Query for KAS Monafasat Master Records
   */
  public async getScopedMonafasat(
    context: ScopedQueryContext,
    options: {
      searchQuery?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ data: any[]; count: number }> {
    const { searchQuery, status, page = 1, pageSize = 25 } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('kas_monafasat_master')
      .select('*', { count: 'exact' })
      .eq('company_id', context.companyId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`tender_name.ilike.${q},tender_number.ilike.${q},government_entity.ilike.${q}`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
    };
  }

  /**
   * Scoped Query for Tenders
   */
  public async getScopedTenders(context: ScopedQueryContext): Promise<any[]> {
    const { data, error } = await supabase
      .from('kas_tenders')
      .select('*')
      .eq('company_id', context.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // 5. SHARED MASTER REFERENCE DATA (Section 22 of Blueprint)
  // ============================================================================

  /**
   * Retrieves shared, read-only reference data (Countries, Currencies, Standard Job Titles).
   */
  public async getSharedMasterReference(category?: string): Promise<SharedMasterReference[]> {
    try {
      let query = supabase
        .from('shared_master_reference')
        .select('*')
        .eq('is_active', true)
        .order('name_ar', { ascending: true });

      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        category: row.category,
        code: row.code,
        nameAr: row.name_ar,
        nameEn: row.name_en,
        metadata: row.metadata,
        isActive: row.is_active,
      }));
    } catch (err) {
      console.warn('Fallback getSharedMasterReference:', err);
      return [];
    }
  }

  // ============================================================================
  // 6. SCOPED EXPORT METADATA INJECTOR (Section 11 of Blueprint)
  // ============================================================================

  /**
   * Adds strict company isolation branding and metadata to export payloads.
   */
  public enrichExportWithTenantMetadata(
    context: ScopedQueryContext,
    companyCommercialName: string,
    exportData: any[]
  ): {
    meta: {
      generatedAt: string;
      tenantScope: string;
      companyName: string;
      companyId: string;
      exporterEmail: string;
      securityClassification: string;
    };
    records: any[];
  } {
    return {
      meta: {
        generatedAt: new Date().toISOString(),
        tenantScope: 'مجموعة خالد السليم القابضة',
        companyName: companyCommercialName,
        companyId: context.companyId,
        exporterEmail: context.userEmail,
        securityClassification: 'بيانات داخلية سرية — يحظر التداول خارج نطاق الشركة',
      },
      records: exportData,
    };
  }
}

export const dataIsolationService = new DataIsolationService();
