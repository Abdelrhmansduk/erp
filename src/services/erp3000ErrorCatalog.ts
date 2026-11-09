import type { ErrorCategory, ErrorSeverity } from './errorMonitorService';

export interface ErpCatalogErrorItem {
  /** الرقم التسلسلي من 1 إلى 3000 */
  seq: number;
  /** الكود القياسي للخطأ مثل ERP-ERR-0001 */
  code: string;
  /** كود المجال الرئيسي */
  domainCode: string;
  /** اسم المجال الرئيسي بالعربية */
  domainNameAr: string;
  /** اسم الوحدة الفرعية أو العملية التشغيلية */
  subModuleAr: string;
  /** الملف أو المحرك المسؤول في المنظومة */
  guardianModule: string;
  /** كود نمط الخلل البرمجي */
  patternCode: string;
  /** اسم نمط الخلل البرمجي بالعربية */
  patternNameAr: string;
  /** عنوان الخطأ التفصيلي */
  titleAr: string;
  /** رسالة الاستثناء أو الأثر التقني */
  technicalSignature: string;
  /** التشخيص الجذري للخطأ البرمجي */
  rootCauseAr: string;
  /** الحل الهندسي والوقاية في المنظومة */
  remediationAr: string;
  /** التصنيف المتوافق مع مرصد الأخطاء */
  category: ErrorCategory;
  /** درجة الخطورة */
  severity: ErrorSeverity;
  /** رمز CWE أو التصنيف الهندسي القياسي */
  standardRef: string;
}

export interface ErpDomainDefinition {
  code: string;
  nameAr: string;
  rangeStart: number;
  rangeEnd: number;
  defaultCategory: ErrorCategory;
  guardianModule: string;
  subModules: Array<{
    nameAr: string;
    entityKey: string;
    metricOrField: string;
  }>;
}

export interface ErpFailurePatternDefinition {
  code: string;
  nameAr: string;
  severity: ErrorSeverity;
  categoryOverride?: ErrorCategory;
  standardRef: string;
  buildTitle: (subModuleAr: string, field: string) => string;
  buildSignature: (domainCode: string, entityKey: string, field: string, seq: number) => string;
  buildRootCause: (subModuleAr: string, field: string) => string;
  buildRemediation: (subModuleAr: string, guardianModule: string, field: string) => string;
}

/**
 * المجالات العشرة الكبرى لأنظمة تخطيط الموارد المؤسسية (10 Domains × 30 Sub-Modules = 300 سياق تشغيلي)
 */
export const ERP_DOMAINS_10: ErpDomainDefinition[] = [
  {
    code: 'GL_FIN',
    nameAr: '1. المحاسبة المركزية والأستاذ العام المزدوج (General Ledger & SMACC)',
    rangeStart: 1,
    rangeEnd: 300,
    defaultCategory: 'data_validation',
    guardianModule: 'src/services/accounting/journalEngine.ts',
    subModules: [
      { nameAr: 'ترحيل قيود اليومية المزدوجة', entityKey: 'JournalEntry', metricOrField: 'debit_credit_balance' },
      { nameAr: 'إقفال الفترات المالية الشهرية والسنوية', entityKey: 'FiscalPeriod', metricOrField: 'period_lock_status' },
      { nameAr: 'حسابات الأستاذ المساعد للعملاء والموردين', entityKey: 'SubLedgerAccount', metricOrField: 'reconciliation_delta' },
      { nameAr: 'شجرة الحسابات الدليلية متعددة المستويات', entityKey: 'ChartOfAccounts', metricOrField: 'parent_account_code' },
      { nameAr: 'القيود العكسية والتسويات التصحيحية', entityKey: 'ReversalEntry', metricOrField: 'reversed_entry_id' },
      { nameAr: 'مراكز التكلفة وتوزيع المصروفات المشتركة', entityKey: 'CostCenterAllocation', metricOrField: 'allocation_ratio' },
      { nameAr: 'إهلاك الأصول الثابتة المجدول', entityKey: 'AssetDepreciation', metricOrField: 'accumulated_depreciation' },
      { nameAr: 'تقييم العملات الأجنبية وفروقات الصرف', entityKey: 'ForexRevaluation', metricOrField: 'exchange_rate_precision' },
      { nameAr: 'ميزان المراجعة الموحد للمجموعة القابضة', entityKey: 'ConsolidatedTrialBalance', metricOrField: 'intercompany_elimination' },
      { nameAr: 'سندات القبض النقدية والإلكترونية', entityKey: 'ReceiptVoucher', metricOrField: 'receipt_amount_halala' },
      { nameAr: 'سندات الصرف والعهد النقدية المؤقتة', entityKey: 'PaymentVoucher', metricOrField: 'petty_cash_ceiling' },
      { nameAr: 'الموازنات التقديرية والرقابة على الصرف', entityKey: 'BudgetControl', metricOrField: 'budget_variance_limit' },
      { nameAr: 'إثبات الإيرادات المؤجلة والمحققة (IFRS 15)', entityKey: 'RevenueRecognition', metricOrField: 'earned_revenue_slice' },
      { nameAr: 'المصروفات المدفوعة مقدماً والمستحقة', entityKey: 'PrepaidExpenseSchedule', metricOrField: 'amortization_installment' },
      { nameAr: 'مخصص الديون المشكوك في تحصيلها (ECL)', entityKey: 'BadDebtProvision', metricOrField: 'aging_bucket_provision' },
      { nameAr: 'القوائم المالية الختامية (المركز المالي والدخل)', entityKey: 'FinancialStatements', metricOrField: 'retained_earnings_link' },
      { nameAr: 'قائمة التدفقات النقدية المباشرة وغير المباشرة', entityKey: 'CashFlowStatement', metricOrField: 'operating_cash_net' },
      { nameAr: 'القيود التلقائية الناتجة عن عقود المبيعات', entityKey: 'AutoSalesJournal', metricOrField: 'trigger_event_id' },
      { nameAr: 'تسوية الحسابات الجارية بين الشركات الشقيقة', entityKey: 'IntercompanyClearing', metricOrField: 'mirror_journal_ref' },
      { nameAr: 'احتساب الزكاة الشرعية والوعاء الزكوي', entityKey: 'ZakatBaseCalculation', metricOrField: 'zakatable_net_assets' },
      { nameAr: 'أعمار الذمم المدينة وتنبيهات الائتمان', entityKey: 'ReceivablesAging', metricOrField: 'credit_limit_exposure' },
      { nameAr: 'أعمار الذمم الدائنة وجدولة استحقاق الموردين', entityKey: 'PayablesAging', metricOrField: 'due_date_horizon' },
      { nameAr: 'الأرباح المبقاة والاحتياطيات النظامية (10%)', entityKey: 'StatutoryReserve', metricOrField: 'reserve_transfer_amount' },
      { nameAr: 'محاسبة عقود الإيجار التمويلي والتشغيلي (IFRS 16)', entityKey: 'LeaseRightOfUse', metricOrField: 'rou_liability_present_value' },
      { nameAr: 'تصفية العهد الميدانية ومطابقة الفواتير الضريبية', entityKey: 'ExpenseClaimSettlement', metricOrField: 'attached_tax_invoice_no' },
      { nameAr: 'القيود الافتتاحية للسنوات المالية الجديدة', entityKey: 'OpeningBalanceCarryover', metricOrField: 'opening_equity_check' },
      { nameAr: 'ربط الحسابات البنكية بدليل الأستاذ العام', entityKey: 'BankGlMapping', metricOrField: 'gl_control_account_id' },
      { nameAr: 'إدارة الشيكات المؤجلة وأوراق القبض والدفع', entityKey: 'PostDatedCheque', metricOrField: 'cheque_maturity_status' },
      { nameAr: 'مراجعة القيود اليومية واعتماد المدير المالي', entityKey: 'JournalApprovalWorkflow', metricOrField: 'approver_signature_hash' },
      { nameAr: 'التدقيق المحاسبي وكشف القيود الشاذة', entityKey: 'LedgerAnomalyDetector', metricOrField: 'benford_deviation_score' },
    ],
  },
  {
    code: 'ZATCA_TAX',
    nameAr: '2. الفوترة الإلكترونية الضريبية والربط الحكومي (ZATCA Phase 2 & VAT)',
    rangeStart: 301,
    rangeEnd: 600,
    defaultCategory: 'data_validation',
    guardianModule: 'src/services/zatcaPhase2Service.ts',
    subModules: [
      { nameAr: 'توليد وثيقة الفاتورة القياسية UBL 2.1 XML', entityKey: 'UblInvoiceXml', metricOrField: 'xml_canonicalization_c14n' },
      { nameAr: 'حساب هاش الفاتورة السابقة المتسلسل (PIH SHA-256)', entityKey: 'PreviousInvoiceHash', metricOrField: 'pih_chain_digest' },
      { nameAr: 'ترميز حقول الـ QR بصيغة TLV Base64 (الحقول 1-9)', entityKey: 'TlvQrGenerator', metricOrField: 'tlv_tag_byte_length' },
      { nameAr: 'التوقيع الرقمي المشفر ECDSA secp256k1', entityKey: 'CryptographicStamp', metricOrField: 'ecdsa_signature_value' },
      { nameAr: 'إصدار وتجديد شهادة الامتثال الضريبي (CSID)', entityKey: 'CsidCertificate', metricOrField: 'pcsid_token_expiry' },
      { nameAr: 'الاعتماد الفوري للفواتير الضريبية B2B (Clearance)', entityKey: 'B2bClearanceGateway', metricOrField: 'clearance_status_code' },
      { nameAr: 'الإبلاغ عن الفواتير الضريبية المبسطة B2C (Reporting)', entityKey: 'B2cReportingQueue', metricOrField: 'reporting_window_24h' },
      { nameAr: 'إشعارات الدائن الضريبية للمرتجعات (Credit Notes)', entityKey: 'TaxCreditNote', metricOrField: 'original_invoice_uuid_ref' },
      { nameAr: 'إشعارات المدين الضريبية للتعديلات الإضافية (Debit Notes)', entityKey: 'TaxDebitNote', metricOrField: 'debit_reason_code' },
      { nameAr: 'التحقق من الرقم الضريبي للمورد والعميل (15 رقماً يبدأ وينتهي بـ 3)', entityKey: 'VatNumberValidator', metricOrField: 'tin_15_digit_checksum' },
      { nameAr: 'حساب ضريبة القيمة المضافة القياسية 15% على البنود', entityKey: 'LineItemVatCalc', metricOrField: 'line_vat_halala_round' },
      { nameAr: 'معالجة الضريبة الصفرية والإعفاءات الضريبية المسببة', entityKey: 'TaxExemptionCode', metricOrField: 'zatca_exemption_reason_code' },
      { nameAr: 'الفواتير الضريبية للدفعات المقدمة وتسوية الفاتورة النهائية', entityKey: 'AdvancePaymentInvoice', metricOrField: 'prepaid_vat_deduction' },
      { nameAr: 'العداد التراكمي غير القابل لإعادة الضبط (ICV Counter)', entityKey: 'InvoiceCounterValue', metricOrField: 'monotonic_icv_sequence' },
      { nameAr: 'المعرف العالمي الفريد للفاتورة (UUID v4 RFC 4122)', entityKey: 'InvoiceUuidGenerator', metricOrField: 'invoice_uuid_uniqueness' },
      { nameAr: 'العنوان الوطني المهيكل للمصدر والمشتري في XML', entityKey: 'NationalAddressXml', metricOrField: 'building_postal_additional_no' },
      { nameAr: 'إقرار ضريبة القيمة المضافة الربع سنوي والشهري', entityKey: 'VatReturnDeclaration', metricOrField: 'net_payable_vat_box' },
      { nameAr: 'ضريبة الاستقطاع للموردين غير المقيمين (WHT)', entityKey: 'WithholdingTaxEngine', metricOrField: 'wht_rate_category' },
      { nameAr: 'الخصومات التجارية على مستوى السطر وعلى مستوى الفاتورة', entityKey: 'InvoiceAllowanceCharge', metricOrField: 'taxable_amount_after_discount' },
      { nameAr: 'حفظ وأرشفة الفواتير الضريبية المختومة لمدة 6 سنوات', entityKey: 'TaxArchiveVault', metricOrField: 'immutable_xml_archive_hash' },
      { nameAr: 'طابور إعادة المحاولة التلقائية عند انقطاع بوابة فاتورة', entityKey: 'ZatcaRetryBackoff', metricOrField: 'retry_attempt_backoff_ms' },
      { nameAr: 'مطابقة إجماليات الفواتير الضريبية مع دفتر الأستاذ العام', entityKey: 'ZatcaGlReconciler', metricOrField: 'vat_control_account_2104' },
      { nameAr: 'فحص قواعد العمل الخاصة بهيئة الزكاة (BR-KSA-01 إلى BR-KSA-85)', entityKey: 'ZatcaRuleValidator', metricOrField: 'br_ksa_rule_assertion' },
      { nameAr: 'معالجة الفواتير الذاتية (Self-Billed Tax Invoices)', entityKey: 'SelfBillingInvoice', metricOrField: 'self_billed_type_code_389' },
      { nameAr: 'فوترة العقود المستمرة والمستخلصات المرحلية', entityKey: 'ProgressBillingTax', metricOrField: 'retention_tax_treatment' },
      { nameAr: 'تصدير سجل المبيعات والمشتريات الضريبي للفحص الميداني', entityKey: 'TaxAuditFileExporter', metricOrField: 'audit_csv_utf8_bom' },
      { nameAr: 'التحقق من تطابق الطابع الزمني للفاتورة مع توقيت المملكة (AST)', entityKey: 'InvoiceTimestampGuard', metricOrField: 'issue_date_time_ast' },
      { nameAr: 'معالجة رسائل التحذير والرفض الواردة من خادم ZATCA', entityKey: 'ZatcaResponseParser', metricOrField: 'validation_results_warnings' },
      { nameAr: 'تشفير المفتاح الخاص لتوقيع الفواتير في الخزنة الآمنة', entityKey: 'PrivateKeyVault', metricOrField: 'ec_private_key_pkcs8' },
      { nameAr: 'طباعة الفاتورة الضريبية بصيغة PDF/A-3 مع تضمين ملف XML', entityKey: 'PdfA3EmbeddedXml', metricOrField: 'embedded_xml_attachment_stream' },
    ],
  },
  {
    code: 'IAM_RLS',
    nameAr: '3. العزل المؤسسي وتعدد الشركات وحوكمة الصلاحيات (Multi-Tenancy, RLS & IAM)',
    rangeStart: 601,
    rangeEnd: 900,
    defaultCategory: 'auth_permission',
    guardianModule: 'src/services/iamPolicyEngine.ts',
    subModules: [
      { nameAr: 'عزل سجلات الشركات الخمس (SAF, YAQ, TOP, KAS, DAR) عبر company_id', entityKey: 'TenantRowIsolation', metricOrField: 'company_id_rls_predicate' },
      { nameAr: 'حماية الوحدات الحصرية للشركات (مثل exclusiveToCompany: KAS)', entityKey: 'ExclusiveModuleGuard', metricOrField: 'exclusive_company_boundary' },
      { nameAr: 'قفل جلسة الموظف غير التنفيذي على شركته المعينة', entityKey: 'SessionCompanyLock', metricOrField: 'locked_session_company_id' },
      { nameAr: 'سياسة المنع الافتراضي في محرك الصلاحيات (Deny by Default)', entityKey: 'DefaultDenyEvaluator', metricOrField: 'explicit_permission_grant' },
      { nameAr: 'فحص مستويات نطاق البيانات السبعة (0: بلا وصول إلى 6: المجموعة)', entityKey: 'DataScopeEnforcer', metricOrField: 'data_scope_level_rank' },
      { nameAr: 'فصل المهام الرقابية المتعارضة (Segregation of Duties - SoD)', entityKey: 'SodConflictDetector', metricOrField: 'creator_vs_approver_id' },
      { nameAr: 'تفويض الصلاحيات المؤقت والمحدد بتاريخ انتهاء (IamDelegation)', entityKey: 'TemporaryDelegation', metricOrField: 'delegation_expires_at' },
      { nameAr: 'التحقق من مطالبات JWT App Metadata داخل سياسات Supabase RLS', entityKey: 'JwtClaimsRlsCheck', metricOrField: 'app_metadata_company_claim' },
      { nameAr: 'تحسين أداء سياسات RLS باستخدام InitPlan الفرعي (SELECT auth.uid())', entityKey: 'RlsInitPlanOptimizer', metricOrField: 'subselect_auth_jwt_plan' },
      { nameAr: 'المصادقة البيومترية ومفاتيح المرور (WebAuthn Passkeys)', entityKey: 'WebAuthnPasskeyFlow', metricOrField: 'credential_challenge_nonce' },
      { nameAr: 'روابط الدخول الموثقة للمشرفين ورموز التحقق (Magic Links / OTP)', entityKey: 'SupervisorMagicLink', metricOrField: 'one_time_token_hash' },
      { nameAr: 'إيقاف الحسابات الفوري وإبطال الجلسات النشطة (Session Revocation)', entityKey: 'ActiveSessionRevoker', metricOrField: 'revoked_token_blacklist' },
      { nameAr: 'حماية بوابات العملاء والوكلاء الخارجيين من الوصول الداخلي', entityKey: 'ExternalPortalSandbox', metricOrField: 'portal_role_boundary' },
      { nameAr: 'سجل التدقيق الأمني غير القابل للتعديل (Security Audit Log)', entityKey: 'ImmutableSecurityAudit', metricOrField: 'audit_actor_ip_fingerprint' },
      { nameAr: 'حماية عمليات التصدير الجماعي للبيانات الحساسة (Bulk Export Guard)', entityKey: 'BulkExportRateLimiter', metricOrField: 'export_row_quota_limit' },
      { nameAr: 'التحقق من صلاحيات التوجيه إلى التبويبات الـ 54 في الهيكل الموحد', entityKey: 'RouteTabGuard', metricOrField: 'authorized_tab_key' },
      { nameAr: 'منع تصعيد الصلاحيات الذاتي عبر تعديل ملف تعريف المستخدم', entityKey: 'PrivilegeEscalationShield', metricOrField: 'immutable_role_assignment' },
      { nameAr: 'عزل قنوات البث اللحظي WebSockets حسب الشركة والقسم', entityKey: 'RealtimeChannelTenantGuard', metricOrField: 'channel_tenant_topic' },
      { nameAr: 'إدارة كلمات المرور وسياسة القفل بعد المحاولات الفاشلة', entityKey: 'BruteForceLockout', metricOrField: 'failed_login_attempts_count' },
      { nameAr: 'مصفوفة الصلاحيات للأقسام التسعة (9-Department RBAC Matrix)', entityKey: 'DepartmentRbacMatrix', metricOrField: 'department_code_acl' },
      { nameAr: 'حماية مفاتيح API السرية ومنع تسربها في حزم المتصفح', entityKey: 'SecretKeyBundleScanner', metricOrField: 'vite_public_env_prefix' },
      { nameAr: 'التحقق من صلاحية الاعتماد المالي حسب سقف المبلغ (Approval Tiers)', entityKey: 'FinancialApprovalTier', metricOrField: 'max_approval_amount_sar' },
      { nameAr: 'عزل بيانات الفروع والمناطق الجغرافية داخل الشركة الواحدة', entityKey: 'BranchScopeIsolation', metricOrField: 'branch_id_filter_scope' },
      { nameAr: 'حماية نقاط نهاية Webhooks الخارجية بتوقيع HMAC-SHA256', entityKey: 'WebhookSignatureGuard', metricOrField: 'x_signature_hmac_digest' },
      { nameAr: 'التحقق من حالة الحساب وتفعيل الموظفين الجدد قبل منح النفاذ', entityKey: 'OnboardingAccountGate', metricOrField: 'account_activation_state' },
      { nameAr: 'منع هجمات تزوير الطلبات عبر المواقع (CSRF) وتلاعب الجلسة', entityKey: 'SessionIntegrityGuard', metricOrField: 'samesite_strict_token' },
      { nameAr: 'تقييد الوصول الزمني والجغرافي للعمليات الحساسة', entityKey: 'ContextualAbacPolicy', metricOrField: 'allowed_working_hours_window' },
      { nameAr: 'مراجعة صلاحيات الحسابات التنفيذية (HQ / رئيس المجموعة)', entityKey: 'ExecutiveOverrideAudit', metricOrField: 'hq_override_justification' },
      { nameAr: 'عزل التخزين المؤقت المحلي (LocalStorage/IndexedDB) عند تبديل الحساب', entityKey: 'ClientCacheTenantPurge', metricOrField: 'session_switch_cache_clear' },
      { nameAr: 'فحص توافق التوقيع الرقمي لسياسات الأمان عند إقلاع النظام', entityKey: 'PolicyManifestVerifier', metricOrField: 'policy_schema_version_hash' },
    ],
  },
  {
    code: 'PAY_ESCROW',
    nameAr: '4. بوابات الدفع، حسابات الضمان، والتسويات البنكية (Payments, Escrow & Settlement)',
    rangeStart: 901,
    rangeEnd: 1200,
    defaultCategory: 'network_api',
    guardianModule: 'src/services/paymentOrchestratorService.ts',
    subModules: [
      { nameAr: 'درع عدم التكرار للعمليات المالية (Idempotency-Key Enforcement)', entityKey: 'IdempotencyExecution', metricOrField: 'idempotency_key_fnv1a_hash' },
      { nameAr: 'احتجاز مبالغ العقود في حساب التزامات الضمان (حساب 2105)', entityKey: 'EscrowHoldAccount', metricOrField: 'escrow_liability_balance' },
      { nameAr: 'بوابة شرط اجتياز الفحص الطبي قبل تحرير عمولة الوكالة الخارجية', entityKey: 'EscrowMedicalClearanceGate', metricOrField: 'medical_passed_verification' },
      { nameAr: 'معالجة استرداد المبالغ للعملاء عند إلغاء العقد وحساب غرامة التأخير', entityKey: 'EscrowClientRefund', metricOrField: 'refundable_net_amount' },
      { nameAr: 'الربط مع بوابات الدفع الإلكتروني (مدى، فيزا، ماستركارد، Apple Pay)', entityKey: 'PaymentGatewayCheckout', metricOrField: 'gateway_transaction_reference' },
      { nameAr: 'التحقق الرياضي من تواقيع إشعارات الدفع الواردة (Webhook HMAC)', entityKey: 'PaymentWebhookVerifier', metricOrField: 'webhook_hmac_sha256_valid' },
      { nameAr: 'مطابقة كشوف الحسابات البنكية الآلية (MT940 / CAMT.053)', entityKey: 'BankStatementParser', metricOrField: 'statement_closing_balance' },
      { nameAr: 'معالجة العمليات المعلقة والمدفوعات المقتطعة دون إشعار (Orphan Payments)', entityKey: 'OrphanPaymentReconciler', metricOrField: 'unmatched_payment_Reference' },
      { nameAr: 'تحويلات غرفة المقاصة الآلية ونظام سريع (SARIE Instant Transfers)', entityKey: 'SarieTransferEngine', metricOrField: 'beneficiary_iban_checksum' },
      { nameAr: 'تقسيم المدفوعات على عدة فواتير أو عقود (Split Payment Allocation)', entityKey: 'SplitPaymentAllocator', metricOrField: 'allocated_slices_sum' },
      { nameAr: 'إدارة الأقساط الشهرية والجدولة التلقائية للاستحقاقات', entityKey: 'InstallmentScheduleEngine', metricOrField: 'installment_principal_sum' },
      { nameAr: 'احتساب عمولات بوابات الدفع وضريبة القيمة المضافة على رسوم البنك', entityKey: 'GatewayFeeAccounting', metricOrField: 'merchant_discount_rate_vat' },
      { nameAr: 'التحقق من صحة رقم الآيبان السعودي (24 خانة يبدأ بـ SA)', entityKey: 'SaudiIbanValidator', metricOrField: 'mod_97_10_iban_check' },
      { nameAr: 'حماية سقوف التحويل البنكي اليومية والموافقة الثنائية (Maker-Checker)', entityKey: 'DualApprovalTransfer', metricOrField: 'checker_authorization_token' },
      { nameAr: 'تسوية عهد نقاط البيع (POS End-of-Day Z-Report Settlement)', entityKey: 'PosTerminalSettlement', metricOrField: 'pos_batch_variance_halala' },
      { nameAr: 'معالجة الاعتراضات البنكية وطلبات استرجاع البطاقات (Chargebacks)', entityKey: 'ChargebackDisputeHandler', metricOrField: 'dispute_reserve_freeze' },
      { nameAr: 'إصدار سندات القبض الآلية فور تأكيد بوابة الدفع', entityKey: 'AutoReceiptGenerator', metricOrField: 'linked_payment_intent_id' },
      { nameAr: 'ربط الفواتير بنظام سداد للمدفوعات الحكومية والتجارية (SADAD Biller)', entityKey: 'SadadBillPresentment', metricOrField: 'sadad_bill_number_status' },
      { nameAr: 'تحويل المستحقات للوكالات الخارجية بالعملة الأجنبية (USD/PHP/BDT)', entityKey: 'AgencyRemittanceEngine', metricOrField: 'swift_mt103_reference' },
      { nameAr: 'مراقبة السيولة النقدية اللحظية والتنبؤ بالعجز (Cash Position Monitor)', entityKey: 'TreasuryLiquidityRadar', metricOrField: 'available_free_cash_sar' },
      { nameAr: 'إقفال حساب الضمان وتحويل الإيراد المحقق بعد انتهاء فترة التجربة (90 يوماً)', entityKey: 'ProbationEscrowSettlement', metricOrField: 'probation_90d_completion_flag' },
      { nameAr: 'معالجة المدفوعات الجزئية وحساب المتبقي على الذمم', entityKey: 'PartialPaymentTracker', metricOrField: 'remaining_invoice_balance' },
      { nameAr: 'منع الصرف للحسابات البنكية المجمدة أو غير الموثقة', entityKey: 'BeneficiaryComplianceGate', metricOrField: 'kyc_verified_bank_account' },
      { nameAr: 'توليد ملفات الصرف المجمعة بصيغة البنوك السعودية (B2B Payroll/Vendor File)', entityKey: 'BankBulkFileGenerator', metricOrField: 'batch_hash_total_control' },
      { nameAr: 'التعامل مع انتهاء مهلة جلسة الدفع وإلغاء الحجز المؤقت', entityKey: 'CheckoutTimeoutHandler', metricOrField: 'payment_session_ttl_expired' },
      { nameAr: 'تسجيل القيود المحاسبية التلقائية لعمليات الضمان والتحرير والاسترداد', entityKey: 'EscrowLedgerBridge', metricOrField: 'escrow_journal_posting_ref' },
      { nameAr: 'مراجعة التسويات البنكية الشهرية واعتماد فروقات الهللات', entityKey: 'BankReconciliationSignoff', metricOrField: 'unreconciled_items_count' },
      { nameAr: 'حماية بيانات بطاقات الدفع ومنع تخزين CVV/PAN (PCI-DSS Compliance)', entityKey: 'PciTokenizationShield', metricOrField: 'tokenized_card_fingerprint' },
      { nameAr: 'إدارة خطابات الاعتماد المستندي (Letters of Credit - LC)', entityKey: 'LetterOfCreditTracker', metricOrField: 'lc_margin_coverage_amount' },
      { nameAr: 'تنبيهات الفشل المتكرر لبوابات الدفع والتبديل للمزود الاحتياطي', entityKey: 'PaymentFailoverRouter', metricOrField: 'circuit_breaker_gateway_state' },
    ],
  },
  {
    code: 'HR_MUSANED',
    nameAr: '5. الموارد البشرية، عقود مساند، الرواتب، وحماية الأجور (HR, Musaned & WPS)',
    rangeStart: 1201,
    rangeEnd: 1500,
    defaultCategory: 'data_validation',
    guardianModule: 'src/services/musanedLifecycleEngine.ts',
    subModules: [
      { nameAr: 'آلة الحالة لعقد استقدام مساند (14 مرحلة إلزامية متسلسلة)', entityKey: 'MusanedContractStateMachine', metricOrField: 'stage_transition_guard' },
      { nameAr: 'استقبال ومطابقة إشعارات منصة مساند وإنجاز (Webhooks & Sync)', entityKey: 'MusanedWebhookProcessor', metricOrField: 'musaned_contract_no' },
      { nameAr: 'التحقق من رقم الحدود ورقم التأشيرة في دفعات التفاويض الخارجية', entityKey: 'VisaDelegationValidator', metricOrField: 'border_and_visa_number' },
      { nameAr: 'حساب فترة التجربة النظامية (90 يوماً) وضمان الاستبدال أو الاسترداد', entityKey: 'ProbationWarrantyTracker', metricOrField: 'warranty_days_elapsed' },
      { nameAr: 'احتساب غرامات تأخير وصول العاملة وفق لائحة وزارة الموارد البشرية', entityKey: 'ArrivalDelayPenaltyCalc', metricOrField: 'delay_days_penalty_amount' },
      { nameAr: 'مسير الرواتب الشهري واحتساب البدلات والخصومات (Payroll Engine)', entityKey: 'MonthlyPayrollRun', metricOrField: 'net_salary_payable_sar' },
      { nameAr: 'توليد ملف نظام حماية الأجور المطابق لمواصفات مُدد والبنوك (WPS SIF)', entityKey: 'WpsMudadFileBuilder', metricOrField: 'wps_record_count_checksum' },
      { nameAr: 'احتساب اشتراكات التأمينات الاجتماعية للسعوديين وغير السعوديين (GOSI)', entityKey: 'GosiContributionCalc', metricOrField: 'gosi_wage_cap_percentage' },
      { nameAr: 'حساب مكافأة نهاية الخدمة وفق المادة 84 و85 من نظام العمل السعودي', entityKey: 'EndOfServiceBenefitCalc', metricOrField: 'eosb_tenure_years_factor' },
      { nameAr: 'أرصدة الإجازات السنوية والمرضية وتصفية مستحقات الإجازة', entityKey: 'LeaveAccrualEngine', metricOrField: 'available_leave_days_balance' },
      { nameAr: 'متابعة انتهاء الإقامات ورخص العمل وجوازات السفر (Muqeem Alerts)', entityKey: 'DocumentExpiryRadar', metricOrField: 'iqama_expiry_hijri_gregorian' },
      { nameAr: 'الفرز الذكي للسير الذاتية وتقييم المرشحين التنفيذيين (ATS Scoring)', entityKey: 'AtsCandidateScorer', metricOrField: 'weighted_competency_score' },
      { nameAr: 'حجز السير الذاتية للعملاء ومنع بيع نفس السيرة لعميلين', entityKey: 'CandidateCvReservation', metricOrField: 'cv_reservation_lock_token' },
      { nameAr: 'مطابقة الفحص الطبي الخارجي (GAMCA / Wafid) قبل ختم التأشيرة', entityKey: 'MedicalFitnessGate', metricOrField: 'wafid_medical_fit_certificate' },
      { nameAr: 'إصدار تذاكر الطيران ومتابعة بيان الوصول في المطار (Flight Manifest)', entityKey: 'FlightArrivalTracker', metricOrField: 'pnr_arrival_timestamp' },
      { nameAr: 'احتساب ساعات العمل الإضافي بمعامل 1.5x من الأجر الأساسي والفعلي', entityKey: 'OvertimePayCalculator', metricOrField: 'overtime_hours_multiplier' },
      { nameAr: 'إدارة السلف والقروض الحسنة للموظفين وجدولة الاستقطاع الشهري', entityKey: 'EmployeeLoanDeduction', metricOrField: 'monthly_deduction_ratio_cap' },
      { nameAr: 'تسجيل الحضور والانصراف بالبصمة والموقع الجغرافي (Geofenced Attendance)', entityKey: 'AttendancePunchValidator', metricOrField: 'gps_geofence_radius_meters' },
      { nameAr: 'توثيق عقود العمل الإلكترونية في منصة قوى (Qiwa Contract Sync)', entityKey: 'QiwaContractSynchronizer', metricOrField: 'qiwa_contract_reference_id' },
      { nameAr: 'حساب نسب التوطين (نطاقات) والتنبيه عند الاقتراب من الحد الأدنى', entityKey: 'NitaqatSaudizationMonitor', metricOrField: 'saudization_weighted_ratio' },
      { nameAr: 'إدارة الجزاءات والمخالفات التأديبية وفق لائحة تنظيم العمل المعتمدة', entityKey: 'DisciplinaryActionRule', metricOrField: 'progressive_penalty_stage' },
      { nameAr: 'تسكين الكوادر في السكن الجماعي ومتابعة الطاقة الاستيعابية', entityKey: 'StaffHousingAllocation', metricOrField: 'room_occupancy_capacity' },
      { nameAr: 'إدارة التأمين الطبي للموظفين والتابعين ومطابقة فواتير البوليصة', entityKey: 'MedicalInsurancePolicy', metricOrField: 'cchi_policy_member_class' },
      { nameAr: 'معالجة حالات التغيب عن العمل وإجراءات البلاغات النظامية', entityKey: 'AbscondingCaseWorkflow', metricOrField: 'absence_notification_grace_period' },
      { nameAr: 'تسوية المخالصات النهائية وإخلاء الطرف عبر جميع الأقسام', entityKey: 'FinalSettlementClearance', metricOrField: 'multi_dept_clearance_signed' },
      { nameAr: 'إدارة عمولات مسوقي الاستقدام ومستشاري المبيعات حسب التحصيل الفعلي', entityKey: 'RecruiterCommissionCalc', metricOrField: 'collected_contract_tier' },
      { nameAr: 'استخراج بيانات الجوازات والهويات بالذكاء الاصطناعي (OCR Extractor)', entityKey: 'PassportOcrExtractor', metricOrField: 'mrz_checksum_digit_validation' },
      { nameAr: 'جدولة المقابلات المرئية المسجلة وتقييم المهارات المهنية', entityKey: 'VideoInterviewScheduler', metricOrField: 'interview_timezone_slot' },
      { nameAr: 'إدارة عقود الوكالات الخارجية في الدول المرسلة وحصص التأشيرات', entityKey: 'ForeignAgencyQuota', metricOrField: 'agency_active_quota_balance' },
      { nameAr: 'ترحيل قيد الرواتب والمخصصات الشهري إلى الأستاذ العام تلقائياً', entityKey: 'PayrollToGlJournalBridge', metricOrField: 'payroll_cost_center_split' },
    ],
  },
  {
    code: 'INV_WMS',
    nameAr: '6. إدارة المخزون، المستودعات، والحجز المتزامن (Inventory, WMS & Soft Locks)',
    rangeStart: 1501,
    rangeEnd: 1800,
    defaultCategory: 'runtime_exception',
    guardianModule: 'src/services/inventoryReservationService.ts',
    subModules: [
      { nameAr: 'الحجز المؤقت للمخزون والكوادر لمدة 15 دقيقة (Soft Lock with TTL)', entityKey: 'InventorySoftLease', metricOrField: 'soft_lock_expires_at_ms' },
      { nameAr: 'منع الحجز المزدوج عند تزامن طلبين في نفس اللحظة (Optimistic Concurrency)', entityKey: 'ConcurrentReservationGuard', metricOrField: 'row_version_lock_token' },
      { nameAr: 'تحرير الحجوزات المنتهية الصلاحية تلقائياً وإعادتها للمتاح', entityKey: 'ExpiredLeaseReaper', metricOrField: 'reaped_lease_status' },
      { nameAr: 'تحويل الحجز المؤقت إلى عقد مؤكد فور إتمام الدفع (Commit Lease)', entityKey: 'LeaseToContractCommit', metricOrField: 'committed_contract_id' },
      { nameAr: 'احتساب تكلفة المخزون بطريقة المتوسط المرجح المتحرك (Moving WAC)', entityKey: 'WeightedAverageCostEngine', metricOrField: 'unit_wac_cost_halala' },
      { nameAr: 'احتساب تكلفة الصادر بطريقة الوارد أولاً صادر أولاً (FIFO Layers)', entityKey: 'FifoCostLayerTracker', metricOrField: 'fifo_layer_remaining_qty' },
      { nameAr: 'منع السحب بالسالب من أرصدة المستودعات (Negative Stock Guard)', entityKey: 'NonNegativeStockRule', metricOrField: 'available_on_hand_qty' },
      { nameAr: 'التحويلات المخزنية بين المستودعات والفروع ( Stock In-Transit)', entityKey: 'InterWarehouseTransfer', metricOrField: 'in_transit_transfer_state' },
      { nameAr: 'الجرد الدوري والمفاجئ وتسوية الفروقات المخزنية (Cycle Counting)', entityKey: 'InventoryCountAdjustment', metricOrField: 'physical_vs_system_variance' },
      { nameAr: 'ربط طلبات المتاجر الإلكترونية (سلة، زد، شوبيفاي) بأرصدة المخزون', entityKey: 'OmnichannelStockSync', metricOrField: 'ecommerce_channel_buffer' },
      { nameAr: 'تتبع الأرقام التسلسلية وأرقام التشغيلات وتواريخ الصلاحية (Batch/Serial)', entityKey: 'SerialBatchTracker', metricOrField: 'lot_expiry_date_check' },
      { nameAr: 'حساب نقطة إعادة الطلب والحد الأدنى للمخزون الآمن (Reorder Point)', entityKey: 'SafetyStockReplenisher', metricOrField: 'reorder_threshold_level' },
      { nameAr: 'إدارة وحدات القياس المتعددة ومعاملات التحويل (كرتون / حبة / طن)', entityKey: 'UomConversionFactor', metricOrField: 'base_uom_multiplier' },
      { nameAr: 'سندات الإدخال المخزني ومطابقتها مع أوامر الشراء (GRN Validation)', entityKey: 'GoodsReceiptValidator', metricOrField: 'received_vs_ordered_tolerance' },
      { nameAr: 'سندات الصرف المخزني للمشاريع ومراكز الإيواء والتموين', entityKey: 'MaterialIssueSlip', metricOrField: 'issued_cost_center_code' },
      { nameAr: 'معالجة مرتجعات المبيعات وإعادة الفحص قبل الإضافة للمخزون السليم', entityKey: 'ReturnInspectionQuarantine', metricOrField: 'quarantine_disposition_code' },
      { nameAr: 'تقييم المخزون الراكد والتالف وتكوين مخصص الهبوط (NRV Provision)', entityKey: 'SlowMovingStockEvaluator', metricOrField: 'net_realizable_value_writeoff' },
      { nameAr: 'توزيع التكاليف الإضافية للاستيراد والشحن والجمارك على الأصناف (Landed Cost)', entityKey: 'LandedCostApportioner', metricOrField: 'customs_freight_allocation' },
      { nameAr: 'إدارة مواقع التخزين والرفوف داخل المستودع (Bin Location Routing)', entityKey: 'WarehouseBinLocator', metricOrField: 'aisle_rack_bin_capacity' },
      { nameAr: 'تجميع الباقات والأطقم المركبة (BOM / Kitting & Bundling)', entityKey: 'BundleKitAssembler', metricOrField: 'component_availability_min' },
      { nameAr: 'مطابقة رصيد حساب المخزون في الأستاذ العام مع تقييم المستودعات', entityKey: 'InventoryGlReconciler', metricOrField: 'subledger_vs_gl_inventory_diff' },
      { nameAr: 'قراءة وتوليد رموز الباركود وGS1-128 للأصناف والشحنات', entityKey: 'BarcodeGs1Parser', metricOrField: 'gtin_check_digit_valid' },
      { nameAr: 'حجز قطع الغيار والإعاشة لمراكز دار الرواد والأسطول', entityKey: 'InternalConsumptionLock', metricOrField: 'reserved_internal_req_id' },
      { nameAr: 'منع تعديل وحدة القياس الأساسية أو طريقة التقييم لصنف عليه حركات', entityKey: 'ItemMasterImmutability', metricOrField: 'has_posted_stock_ledger_tx' },
      { nameAr: 'إدارة مخزون الأمانات والبضاعة المودعة لدى الغير (Consignment Stock)', entityKey: 'ConsignmentStockLedger', metricOrField: 'consignee_custody_balance' },
      { nameAr: 'جدولة التوريد التلقائي لعقود الإعاشة والتموين اليومية', entityKey: 'CateringSupplyScheduler', metricOrField: 'daily_headcount_ration_qty' },
      { nameAr: 'التحقق من أوزان وأحجام الشحنات قبل توجيه مركبات التوصيل', entityKey: 'ShipmentVolumetricCheck', metricOrField: 'gross_weight_volume_limit' },
      { nameAr: 'معالجة إشعارات نفاد المخزون اللحظية وإيقاف العرض في البوابات', entityKey: 'OutOfStockCircuitBreaker', metricOrField: 'zero_stock_listing_pause' },
      { nameAr: 'سجل حركات الصنف التفصيلي غير القابل للحذف (Stock Ledger Card)', entityKey: 'ImmutableStockMovement', metricOrField: 'running_balance_after_tx' },
      { nameAr: 'إقفال فترة المستودعات ومنع إدخال حركات بتاريخ رجعي في فترة مقفلة', entityKey: 'InventoryPeriodCutoff', metricOrField: 'movement_posting_date_lock' },
    ],
  },
  {
    code: 'PROC_ETIMAD',
    nameAr: '7. المشتريات، منافسات اعتماد، وجداول الكميات (Procurement, Etimad & BOQ)',
    rangeStart: 1801,
    rangeEnd: 2100,
    defaultCategory: 'data_validation',
    guardianModule: 'src/services/kasEtmadSuiteService.ts',
    subModules: [
      { nameAr: 'تحليل وتسعير جداول الكميات للمنافسات الحكومية (BOQ Pricing Engine)', entityKey: 'BoqScheduleAnalyzer', metricOrField: 'boq_total_extended_price' },
      { nameAr: 'حساب هامش الربح المستهدف ونقطة التعادل في عروض منافسات اعتماد', entityKey: 'TenderMarginSimulator', metricOrField: 'target_gross_margin_pct' },
      { nameAr: 'إصدار ومتابعة الضمانات البنكية الابتدائية والنهائية (1% - 5%)', entityKey: 'BankGuaranteeLifecycle', metricOrField: 'bg_coverage_percentage' },
      { nameAr: 'تنبيهات تمديد أو مصادرة أو الإفراج عن الضمانات البنكية قبل انتهائها', entityKey: 'GuaranteeExpiryWatchdog', metricOrField: 'bg_validity_days_remaining' },
      { nameAr: 'المطابقة الثلاثية بين أمر الشراء، سند الاستلام، وفاتورة المورد (3-Way Match)', entityKey: 'ThreeWayMatchEngine', metricOrField: 'po_grn_invoice_variance' },
      { nameAr: 'إدارة دورة طلبات الشراء الداخلية واعتماد الميزانية (Purchase Requisition)', entityKey: 'PurchaseRequisitionFlow', metricOrField: 'pr_budget_encumbrance' },
      { nameAr: 'مقارنة عروض أسعار الموردين والترسية الفنية والمالية (RFQ Evaluation)', entityKey: 'VendorRfqComparator', metricOrField: 'weighted_tech_commercial_score' },
      { nameAr: 'تأهيل الموردين والتحقق من السجل التجاري وشهادة الزكاة والتوطين', entityKey: 'VendorComplianceKyc', metricOrField: 'vendor_certificates_valid' },
      { nameAr: 'إدارة المستخلصات الجارية والختامية للمشاريع الحكومية وحجز الضمان العشري', entityKey: 'ProgressPaymentCertificate', metricOrField: 'retention_deduction_10pct' },
      { nameAr: 'تحليل الأسعار التاريخية للمنافسات المماثلة وكشف التسعير الشاذ', entityKey: 'HistoricalBidIntelligence', metricOrField: 'unit_price_zscore_outlier' },
      { nameAr: 'متابعة المواعيد النهائية لتقديم المظاريف الفنية والمالية في منصة اعتماد', entityKey: 'EtimadSubmissionCountdown', metricOrField: 'bid_closing_timestamp_ast' },
      { nameAr: 'احتساب رسوم كراسة الشروط والمواصفات وتحميلها على تكلفة الفرصة', entityKey: 'TenderBookletFeeTracker', metricOrField: 'rfp_document_fee_sadad' },
      { nameAr: 'إدارة أوامر التغيير والكميات الإضافية في العقود الحكومية (+10% / -20%)', entityKey: 'VariationOrderLimitGuard', metricOrField: 'statutory_variation_cap_pct' },
      { nameAr: 'حساب نسبة المحتوى المحلي الإلزامية والوزن التفضيلي في المنافسات', entityKey: 'LocalContentScoreCalc', metricOrField: 'lc_baseline_target_ratio' },
      { nameAr: 'ربط بنود جدول الكميات (BOQ) بمراكز التكلفة وموازنة المشروع', entityKey: 'BoqToBudgetMapper', metricOrField: 'project_wbs_cost_code' },
      { nameAr: 'إدارة عقود الباطن ومطابقة مستخلصات مقاولي الباطن مع الإنجاز الفعلي', entityKey: 'SubcontractorBackToBack', metricOrField: 'subcontract_certified_work' },
      { nameAr: 'احتساب غرامات التأخير ومؤشرات مستوى الخدمة في عقود التشغيل (SLA Penalties)', entityKey: 'GovernmentSlaPenaltyCalc', metricOrField: 'total_penalty_cap_20pct' },
      { nameAr: 'مراجعة الشروط التعاقدية والمخاطر القانونية قبل تقديم العرض', entityKey: 'TenderRiskMatrix', metricOrField: 'risk_contingency_reserve' },
      { nameAr: 'أرشفة وثائق المنافسة والمراسلات الرسمية واستفسارات ما قبل التقديم', entityKey: 'TenderDossierVault', metricOrField: 'dossier_completeness_check' },
      { nameAr: 'تحويل المنافسة المرساة إلى مشروع تشغيلي وعقد مالي في المنظومة', entityKey: 'AwardToProjectHandover', metricOrField: 'award_letter_reference_no' },
      { nameAr: 'متابعة السقوف الائتمانية للتسهيلات البنكية المخصصة لإصدار الضمانات', entityKey: 'BankFacilityLimitTracker', metricOrField: 'available_bg_facility_line' },
      { nameAr: 'إدارة اتفاقيات الأسعار الإطارية مع الموردين المعتمدين (Blanket PO)', entityKey: 'FrameworkAgreementTracker', metricOrField: 'call_off_cumulative_spend' },
      { nameAr: 'منع تجزئة أوامر الشراء للتحايل على صلاحيات الاعتماد المالي (Split PO Fraud)', entityKey: 'SplitOrderFraudDetector', metricOrField: 'rolling_24h_vendor_po_sum' },
      { nameAr: 'تقييم أداء الموردين الدوري حسب الالتزام بالمواعيد والجودة', entityKey: 'VendorScorecardEngine', metricOrField: 'otif_delivery_rating' },
      { nameAr: 'مطابقة أوامر الشراء المستوردة مع الاعتمادات المستندية وبوليصة الشحن', entityKey: 'ImportProcurementTracker', metricOrField: 'bill_of_lading_incoterms' },
      { nameAr: 'حساب التكلفة الكلية للملكية والتشغيل طوال مدة العقد (TCO Analysis)', entityKey: 'LifecycleCostEstimator', metricOrField: 'npv_contract_cashflow' },
      { nameAr: 'إدارة عينات المواد واعتمادها الفني قبل التوريد الكمي', entityKey: 'MaterialSubmittalApproval', metricOrField: 'technical_approval_status' },
      { nameAr: 'توليد خطابات التغطية والعروض المالية المختومة آلياً', entityKey: 'BidProposalGenerator', metricOrField: 'amount_in_words_tafqeet_match' },
      { nameAr: 'مراقبة انحراف التكلفة الفعلية للمشروع عن التكلفة التقديرية (EVM CPI/SPI)', entityKey: 'EarnedValueProjectMonitor', metricOrField: 'cost_performance_index_cpi' },
      { nameAr: 'إقفال المشروع واسترداد الضمان البنكي النهائي بعد محضر الاستلام النهائي', entityKey: 'ProjectCloseoutRelease', metricOrField: 'final_handover_certificate_signed' },
    ],
  },
  {
    code: 'OPS_FLEET_DAR',
    nameAr: '8. التشغيل، تأجير الأسطول، ومراكز الإيواء (Fleet Dispatch, Rental & Shelter)',
    rangeStart: 2101,
    rangeEnd: 2400,
    defaultCategory: 'runtime_exception',
    guardianModule: 'src/services/fleetDispatchEngine.ts',
    subModules: [
      { nameAr: 'محرك توجيه السائقين والمركبات وتحسين المسارات اليومية (Fleet Dispatch)', entityKey: 'FleetRouteOptimizer', metricOrField: 'route_dispatch_window_slot' },
      { nameAr: 'تسعير باقات التأجير المرن بالساعة واليوم والشهر (Hourly/Monthly Pricing)', entityKey: 'FlexibleRentalPricer', metricOrField: 'package_hourly_tier_rate' },
      { nameAr: 'التحقق من تسليم واستلام الخدمة عبر رمز التحقق للعميل (OTP Handover)', entityKey: 'ServiceOtpVerification', metricOrField: 'handover_otp_code_valid' },
      { nameAr: 'منع تضارب جدول ورديات العاملة أو السائق في نفس الفترة الزمنية', entityKey: 'ShiftOverlapPreventor', metricOrField: 'shift_time_interval_conflict' },
      { nameAr: 'إدارة تسكين الوافدات في مراكز دار الرواد للإيواء والرعاية (Shelter Check-in)', entityKey: 'ShelterAdmissionRegistry', metricOrField: 'shelter_bed_assignment_id' },
      { nameAr: 'متابعة الحالات الصحية والإعاشة اليومية داخل مراكز الإيواء', entityKey: 'ShelterWelfareMonitor', metricOrField: 'daily_medical_meal_log' },
      { nameAr: 'إدارة إجراءات نقل الخدمات وتجارب العمل للعملاء الجدد (Sponsorship Transfer)', entityKey: 'KafalaTransferWorkflow', metricOrField: 'trial_period_outcome_status' },
      { nameAr: 'متابعة إجراءات الترحيل النظامي وحجوزات السفر النهائي (Exit Visa & Flight)', entityKey: 'FinalExitRepatriation', metricOrField: 'final_exit_visa_clearance' },
      { nameAr: 'مراقبة صيانة مركبات الأسطول الدورية وفحص السلامة قبل الانطلاق', entityKey: 'VehicleMaintenanceGate', metricOrField: 'odometer_service_due_km' },
      { nameAr: 'تتبع استهلاك الوقود وبطاقات التزود ومنع الاستخدام خارج أوقات العمل', entityKey: 'FuelCardAnomalyTracker', metricOrField: 'fuel_liters_vs_odometer_ratio' },
      { nameAr: 'إدارة عقود التأجير الشهري والتجديد التلقائي وإشعارات الانتهاء', entityKey: 'MonthlyRentalAutoRenew', metricOrField: 'renewal_invoice_lead_days' },
      { nameAr: 'احتساب ساعات الانتظار والتأخير وتعديلات زمن الزيارة الفعلية', entityKey: 'VisitDurationReconciler', metricOrField: 'actual_check_in_out_delta' },
      { nameAr: 'توزيع الطلبات حسب النطاق الجغرافي والأحياء المخدومة (Zone Geofencing)', entityKey: 'ServiceZonePolygonCheck', metricOrField: 'client_lat_lng_in_polygon' },
      { nameAr: 'إدارة طلبات الاستبدال الفوري للعمالة أثناء سريان عقد التأجير', entityKey: 'RentalReplacementSwap', metricOrField: 'swap_pro_rata_adjustment' },
      { nameAr: 'متابعة تراخيص الهيئة العامة للنقل وبطاقات تشغيل السائقين (TGA / Naql)', entityKey: 'TransportLicenseGuard', metricOrField: 'tga_operating_card_valid' },
      { nameAr: 'إدارة حوادث المركبات والمطالبات التأمينية وتحميل نسب المسؤولية', entityKey: 'FleetAccidentClaim', metricOrField: 'najm_liability_percentage' },
      { nameAr: 'تقييم جودة الخدمة بعد كل زيارة ومعالجة شكاوى العملاء الفورية', entityKey: 'PostVisitQualityRating', metricOrField: 'csat_escalation_threshold' },
      { nameAr: 'جدولة نقل الكوادر من المطار إلى مراكز الاستقبال والتوجيه', entityKey: 'AirportPickupShuttle', metricOrField: 'flight_landing_shuttle_sync' },
      { nameAr: 'حساب الطاقة التشغيلية القصوى للفرع ومنع قبول حجوزات تفوق الكوادر المتاحة', entityKey: 'BranchCapacityThrottle', metricOrField: 'active_workforce_utilization' },
      { nameAr: 'إدارة العهدة العينية للسائقين والمشرفين الميدانيين (أجهزة، زي، معدات)', entityKey: 'FieldCustodyTracker', metricOrField: 'custody_item_handover_sign' },
      { nameAr: 'احتساب حوافز السائقين والمشرفين بناءً على عدد الجولات المكتملة بنجاح', entityKey: 'TripIncentiveCalculator', metricOrField: 'completed_on_time_trips' },
      { nameAr: 'التحقق من سداد العميل قبل تفعيل أمر التوجيه الميداني للزيارة', entityKey: 'PreDispatchPaymentGate', metricOrField: 'visit_payment_cleared_flag' },
      { nameAr: 'إدارة قوائم الانتظار الذكية للعملاء في أوقات الذروة والمواسم', entityKey: 'PeakSeasonWaitlist', metricOrField: 'priority_queue_slot_offer' },
      { nameAr: 'توثيق محاضر التسليم والاستلام الإلكتروني للعمالة بنظام التوقيع الرقمي', entityKey: 'DigitalHandoverProtocol', metricOrField: 'client_signature_vector_hash' },
      { nameAr: 'متابعة مدد بقاء العمالة في مركز الإيواء وتنبيهات تجاوز المدة المعيارية', entityKey: 'ShelterStayDurationSla', metricOrField: 'shelter_stay_days_limit' },
      { nameAr: 'ربط إيرادات عقود التأجير اليومية والشهرية بمراكز ربحية المركبات والكوادر', entityKey: 'FleetProfitabilityLedger', metricOrField: 'revenue_per_worker_day' },
      { nameAr: 'إدارة التصاريح الأمنية وتصاريح دخول المجمعات السكنية والمنشآت', entityKey: 'CompoundAccessPermit', metricOrField: 'gate_pass_validity_window' },
      { nameAr: 'التعامل مع حالات إلغاء الزيارة المتأخر واحتساب رسوم الانتقال', entityKey: 'LateCancellationFeeRule', metricOrField: 'cancellation_cutoff_hours' },
      { nameAr: 'مزامنة حالة السائق والموقع اللحظي مع لوحة غرفة العمليات المركزية', entityKey: 'LiveDispatchTelemetry', metricOrField: 'telemetry_heartbeat_age_sec' },
      { nameAr: 'إعداد تقارير الامتثال الدورية لوزارة الموارد البشرية لمراكز الإيواء', entityKey: 'HrsdShelterComplianceReport', metricOrField: 'hrsd_inspection_readiness_score' },
    ],
  },
  {
    code: 'DB_OUTBOX_SYNC',
    nameAr: '9. قواعد البيانات، صندوق الصادر، والمزامنة الهجينة (PostgreSQL, Outbox & Sync)',
    rangeStart: 2401,
    rangeEnd: 2700,
    defaultCategory: 'network_api',
    guardianModule: 'src/services/domainEventBus.ts',
    subModules: [
      { nameAr: 'نمط صندوق الصادر التبادلي لضمان عدم ضياع الأحداث (Transactional Outbox)', entityKey: 'DomainOutboxDispatcher', metricOrField: 'outbox_event_delivery_state' },
      { nameAr: 'طابور العمليات غير المتصلة والمزامنة عند عودة الشبكة (Offline Queue)', entityKey: 'OfflineMutationQueue', metricOrField: 'offline_queue_replay_order' },
      { nameAr: 'حل تعارضات التعديل المتزامن بين المخزن المحلي والسحابي (Conflict Resolution)', entityKey: 'HybridSyncReconciler', metricOrField: 'vector_clock_updated_at' },
      { nameAr: 'تجميع الاستعلامات ومنع مشكلة استعلامات N+1 في التقارير الكبيرة', entityKey: 'QueryBatchLoader', metricOrField: 'batch_join_query_plan' },
      { nameAr: 'فهارس GIN لحقول JSONB وفهارس العناصر النشطة الجزئية (Partial Indexes)', entityKey: 'PostgresIndexStrategy', metricOrField: 'gin_jsonb_path_ops_index' },
      { nameAr: 'حماية المعاملات الذرية ومنع الكتابة المزدوجة غير المتسقة (ACID / Dual-Write)', entityKey: 'AtomicTransactionBoundary', metricOrField: 'unit_of_work_commit_state' },
      { nameAr: 'إدارة طابور الرسائل التالفة بعد استنفاد محاولات الإعادة (Dead-Letter Queue)', entityKey: 'DeadLetterQueueHandler', metricOrField: 'max_retries_dlq_quarantine' },
      { nameAr: 'التخزين المؤقت متعدد الطبقات وإبطال الكاش عند التحديث (Multi-Tier Cache)', entityKey: 'MultiTierCacheInvalidator', metricOrField: 'stale_while_revalidate_tag' },
      { nameAr: 'مزامنة الطلبات الواردة والصادرة مع المتاجر الإلكترونية (Ecommerce OMS Sync)', entityKey: 'EcommerceOrderSync', metricOrField: 'external_order_id_mapping' },
      { nameAr: 'ترحيل مخطط قاعدة البيانات بأمان دون توقف الخدمة (Zero-Downtime Migrations)', entityKey: 'SchemaMigrationGuard', metricOrField: 'expand_contract_migration_step' },
      { nameAr: 'تحديد سقف عدد الصفوف المسترجعة والترقيم بالمؤشر (Cursor Pagination)', entityKey: 'CursorPaginationEngine', metricOrField: 'keyset_cursor_limit_bound' },
      { nameAr: 'مراقبة تجمع الاتصالات ومنع استنزاف اتصالات قاعدة البيانات (Connection Pool)', entityKey: 'PgBouncerPoolMonitor', metricOrField: 'active_pool_connections_cap' },
      { nameAr: 'فحص سلامة المفاتيح الأجنبية ومنع السجلات اليتيمة (Referential Integrity)', entityKey: 'ForeignKeyCascadeGuard', metricOrField: 'orphan_child_record_check' },
      { nameAr: 'إدارة اشتراكات البث اللحظي وتنظيف القنوات عند إغلاق المكون', entityKey: 'RealtimeSubscriptionManager', metricOrField: 'active_ws_channel_cleanup' },
      { nameAr: 'ضغط وتجزئة دفعات الإدخال الكبيرة (Chunked Bulk Upsert)', entityKey: 'BulkUpsertBatcher', metricOrField: 'batch_chunk_size_500' },
      { nameAr: 'حماية قاعدة البيانات من الاستعلامات البطيئة عبر مهلة التنفيذ (Statement Timeout)', entityKey: 'QueryTimeoutGuard', metricOrField: 'statement_timeout_ms_limit' },
      { nameAr: 'النسخ الاحتياطي التزايدي واختبار الاستعادة الزمنية (Point-in-Time Recovery)', entityKey: 'BackupRecoveryVerifier', metricOrField: 'wal_archive_rpo_lag_sec' },
      { nameAr: 'التحقق من مخططات البيانات بـ Zod قبل الحفظ في المخزن الهجين', entityKey: 'RuntimeZodSchemaGate', metricOrField: 'zod_safe_parse_contract' },
      { nameAr: 'منع الأقفال المتبادلة في المعاملات المتقاطعة (Deadlock Prevention)', entityKey: 'LockOrderingProtocol', metricOrField: 'canonical_resource_lock_order' },
      { nameAr: 'عزل أخطاء المشتركين في ناقل الأحداث حتى لا يفشل الحدث الأصلي', entityKey: 'EventSubscriberSandbox', metricOrField: 'isolated_handler_try_catch' },
      { nameAr: 'تطهير البيانات التالفة في LocalStorage وإعادة البذر التلقائي الآمن', entityKey: 'StorageCorruptionHealer', metricOrField: 'storage_json_integrity_crc' },
      { nameAr: 'مزامنة الجداول المرجعية والبيانات الأساسية عند بدء التشغيل (Seed Hydration)', entityKey: 'MasterDataHydrator', metricOrField: 'seed_version_manifest_sync' },
      { nameAr: 'حساب بصمات التحقق لملفات الاستيراد والتصدير الضخمة (SHA-256 Checksum)', entityKey: 'DataImportIntegrityCheck', metricOrField: 'import_file_row_hash' },
      { nameAr: 'إدارة الحذف المنطقي واستعادة السجلات المؤرشفة (Soft Delete & Restore)', entityKey: 'SoftDeleteLifecycle', metricOrField: 'deleted_at_partial_filter' },
      { nameAr: 'توحيد صيغ التواريخ والمناطق الزمنية بصيغة ISO-8601 UTC/AST', entityKey: 'TimezoneNormalization', metricOrField: 'timestamptz_utc_offset' },
      { nameAr: 'منع تضخم جداول السجلات عبر التجزئة الشهرية والأرشفة (Table Partitioning)', entityKey: 'LogTablePartitioner', metricOrField: 'monthly_range_partition_key' },
      { nameAr: 'مراقبة زمن استجابة نقاط النهاية وتفعيل قاطع الدائرة (Circuit Breaker)', entityKey: 'ApiCircuitBreaker', metricOrField: 'failure_threshold_open_state' },
      { nameAr: 'ضمان ترتيب معالجة أحداث العقد الواحد حسب الرقم التسلسلي (Ordered Events)', entityKey: 'AggregateSequenceGuard', metricOrField: 'aggregate_event_version_seq' },
      { nameAr: 'إدارة الأقفال الموزعة للعمليات المجدولة في الخلفية (Distributed Cron Lock)', entityKey: 'AdvisoryCronLock', metricOrField: 'pg_try_advisory_lock_key' },
      { nameAr: 'رفع سجلات الأخطاء الحرجة إلى جدول system_error_logs في Supabase', entityKey: 'CloudErrorLogSync', metricOrField: 'telemetry_flush_batch_status' },
    ],
  },
  {
    code: 'UI_PDPL_PERF',
    nameAr: '10. الواجهات الأمامية، حماية البيانات الشخصية، والأداء (React 19, PDPL & SAMA)',
    rangeStart: 2701,
    rangeEnd: 3000,
    defaultCategory: 'react_render',
    guardianModule: 'src/utils/pdplMasking.ts',
    subModules: [
      { nameAr: 'حماية شجرة React 19 Fiber من التعديل المباشر على عقد DOM (removeChild)', entityKey: 'ReactFiberDomShield', metricOrField: 'data_dyn_state_css_isolation' },
      { nameAr: 'تعتيم الهوية الوطنية والجواز والآيبان والجوال وفق نظام PDPL السعودي', entityKey: 'PdplSensitiveMasker', metricOrField: 'masked_pii_display_pattern' },
      { nameAr: 'الالتزام برمز الريال السعودي الرسمي (⃁ U+20C1) يسار الرقم ومنع ر.س', entityKey: 'SamaCurrencyFormatter', metricOrField: 'sama_srs_symbol_placement' },
      { nameAr: 'تحميل حزم التصدير الثقيلة (jsPDF / XLSX) بشكل كسول ومتوازٍ عند الطلب', entityKey: 'LazyExportBundleLoader', metricOrField: 'dynamic_import_chunk_split' },
      { nameAr: 'التعافي التلقائي عند تغير بصمة الحزم البرمجية بعد النشر (Chunk Load Recovery)', entityKey: 'StaleChunkAutoReloader', metricOrField: 'vite_preload_error_recovery' },
      { nameAr: 'الالتزام الصارم بنظام تصميم Mobbin الأحادي ومنع الألوان العشوائية', entityKey: 'MobbinMonochromeTokens', metricOrField: 'monochrome_palette_compliance' },
      { nameAr: 'ضبط الاتجاه العربي الأصيل (RTL Logical Properties) في الجداول والنماذج', entityKey: 'RtlLayoutEngine', metricOrField: 'logical_margin_padding_dir' },
      { nameAr: 'منع تسرب البيانات الحساسة في سجلات المتصفح أو تقارير Sentry', entityKey: 'TelemetryPiiScrubber', metricOrField: 'redacted_breadcrumb_payload' },
      { nameAr: 'عزل أخطاء المكونات الفرعية عبر حدود الأخطاء الذكية (ErrorBoundary)', entityKey: 'ComponentErrorBoundary', metricOrField: 'fallback_recovery_reset_key' },
      { nameAr: 'منع الحلقات اللانهائية في خطافات useEffect وuseMemo وتحديثات المتجر', entityKey: 'HookDependencyGuard', metricOrField: 'render_cycle_depth_limit' },
      { nameAr: 'تحسين رندرة الجداول الضخمة عبر التمرير الافتراضي وتثبيت الصفوف', entityKey: 'VirtualizedTableRenderer', metricOrField: 'visible_viewport_row_window' },
      { nameAr: 'إمكانية الوصول القياسية والتنقل بلوحة المفاتيح والتباين (WCAG 2.1 AA)', entityKey: 'AccessibilityAriaGuard', metricOrField: 'contrast_ratio_aria_label' },
      { nameAr: 'منع إرسال النماذج المتكرر وتعطيل الأزرار أثناء المعالجة (Submit Lock)', entityKey: 'FormSubmissionGuard', metricOrField: 'is_submitting_button_lock' },
      { nameAr: 'التحقق الفوري من مدخلات المستخدم وتنسيق الأرقام والتواريخ العربية', entityKey: 'LocaleInputSanitizer', metricOrField: 'arabic_indic_numeral_normalizer' },
      { nameAr: 'حماية المخرجات النصية ومعاينات المستندات من ثغرات حقن XSS (DOMPurify)', entityKey: 'XssDomSanitizer', metricOrField: 'dompurify_sanitized_html' },
      { nameAr: 'منع تكرار الترويسة العلوية أو القائمة الجانبية داخل الصفحات الفرعية', entityKey: 'SingleAppShellInvariant', metricOrField: 'app_shell_single_instance' },
      { nameAr: 'إدارة نوافذ الحوار المنبثقة وترتيب طبقات العرض (Z-Index & Focus Trap)', entityKey: 'ModalLayerOrchestrator', metricOrField: 'modal_focus_trap_zindex' },
      { nameAr: 'تصدير التقارير العربية بصيغة PDF وExcel مع دعم الخطوط واتجاه RTL', entityKey: 'ArabicReportExporter', metricOrField: 'rtl_sheet_view_encoding' },
      { nameAr: 'تنظيف المؤقتات ومستمعي الأحداث عند إلغاء تركيب المكون (Memory Leak Guard)', entityKey: 'EffectCleanupDisposer', metricOrField: 'abort_controller_unmount' },
      { nameAr: 'توحيد حالة البحث والفلاتر بين شريط العنوان ومخزن الحالة (Zustand Sync)', entityKey: 'FilterStateSynchronizer', metricOrField: 'debounced_search_query_ms' },
      { nameAr: 'حماية المساعد الصوتي الذكي (فارس ونُورة) من تداخل المقاطع الصوتية', entityKey: 'VoiceSynthesisQueue', metricOrField: 'tts_audio_buffer_mutex' },
      { nameAr: 'ضبط استجابة الشاشات للأجهزة اللوحية والهواتف دون اقتطاع الجداول', entityKey: 'ResponsiveViewportGrid', metricOrField: 'horizontal_scroll_container' },
      { nameAr: 'منع فقدان البيانات المدخلة في النماذج الطويلة عند تحديث الصفحة العارض', entityKey: 'FormDraftAutoSaver', metricOrField: 'draft_session_recovery_key' },
      { nameAr: 'التحقق من نوع وحجم الملفات المرفوعة وفحص التوقيع السحري للملف (MIME Magic)', entityKey: 'FileUploadSecurityGate', metricOrField: 'magic_bytes_mime_whitelist' },
      { nameAr: 'إدارة الإشعارات اللحظية ومنع إغراق الشاشة بالتنبيهات المتكررة (Toast Dedup)', entityKey: 'NotificationThrottleEngine', metricOrField: 'toast_dedup_cooldown_ms' },
      { nameAr: 'تزامن حالة الجلسة النشطة بين النوافذ والتبويبات المفتوحة في المتصفح', entityKey: 'CrossTabSessionSync', metricOrField: 'storage_event_tab_broadcast' },
      { nameAr: 'عرض حالات التحميل الهيكلية وحالات الفراغ الواضحة بدلاً من الشاشات البيضاء', entityKey: 'SkeletonEmptyStateUX', metricOrField: 'zero_blank_screen_fallback' },
      { nameAr: 'تطبيق الصرامة النوعية الكاملة في TypeScript ومنع الوصول لخصائص undefined', entityKey: 'StrictNullSafetyGuard', metricOrField: 'optional_chaining_nullish_guard' },
      { nameAr: 'قياس مؤشرات أداء الويب الحيوية (LCP, INP, CLS) ورصد التراجع', entityKey: 'WebVitalsPerformanceMonitor', metricOrField: 'interaction_to_next_paint_ms' },
      { nameAr: 'إغلاق جلسة المستخدم تلقائياً عند الخمول لحماية الشاشات المفتوحة في المكاتب', entityKey: 'IdleSessionAutoLock', metricOrField: 'inactivity_timeout_lock_min' },
    ],
  },
];

/**
 * أنماط الفشل البرمجي العشرة الأكثر شهرة في هندسة أنظمة ERP (10 Failure Patterns)
 * 10 Domains × 30 Sub-Modules × 10 Patterns = 3,000 Unique ERP Programming Errors
 */
export const ERP_FAILURE_PATTERNS_10: ErpFailurePatternDefinition[] = [
  {
    code: 'PAT_01_PRECISION_MATH',
    nameAr: 'انحراف الدقة الحسابية والتقريب المالي (Floating-Point & Rounding Drift)',
    severity: 'critical',
    categoryOverride: 'data_validation',
    standardRef: 'CWE-682 / IEEE-754',
    buildTitle: (sub, field) =>
      `خطأ حسابات الفاصلة العائمة والتقريب في «${sub}» عند معالجة حقل (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `PrecisionDriftError [${dom}::${ent}#${seq}]: IEEE-754 floating-point discrepancy detected on '${field}' (expected exact integer halalas, got fractional residue 0.000000000004)`,
    buildRootCause: (sub, field) =>
      `استخدام العمليات الحسابية العشرية المباشرة في JavaScript/SQL داخل وحدة «${sub}» لحساب (${field}) دون التحويل إلى هللات صحيحة أو استخدام تقريب محاسبي موحد، مما يولد فروقات تراكمية تكسر توازن القيد أو الفاتورة.`,
    buildRemediation: (sub, guardian, field) =>
      `تحويل جميع القيم المالية والكمية في (${field}) إلى أعداد صحيحة بالهللات (` +
      '`Math.round(val * 100)`' +
      `) والتحقق من توازن الأطراف عبر المحرك الحارس (${guardian}) قبل اعتماد العملية في «${sub}».`,
  },
  {
    code: 'PAT_02_RACE_CONCURRENCY',
    nameAr: 'تضارب التزامن والسباق الزمني (Race Condition & Lost Update)',
    severity: 'critical',
    categoryOverride: 'runtime_exception',
    standardRef: 'CWE-362 / ACID-Isolation',
    buildTitle: (sub, field) =>
      `تضارب تزامن (Race Condition) والكتابة الفوقية المتزامنة في «${sub}» على (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `ConcurrencyConflictError [${dom}::${ent}#${seq}]: Optimistic lock version mismatch on '${field}' during parallel transaction execution`,
    buildRootCause: (sub, field) =>
      `تنفيذ عمليتي قراءة ثم تعديل (` +
      '`Read-Modify-Write`' +
      `) في نفس اللحظة من مستخدمين أو طلبين متوازيين داخل «${sub}» دون قفل تفاؤلي أو تشاؤمي على (${field})، مما يؤدي إلى ضياع أحد التحديثين أو الحجز المزدوج.`,
    buildRemediation: (sub, guardian, field) =>
      `تطبيق القفل التفاؤلي برقم النسخة (` +
      '`version / updated_at`' +
      `) أو الحجز المؤقت المحدد بمهلة (` +
      '`Soft Lock TTL`' +
      `) عبر (${guardian}) لضمان تسلسل التعديلات على (${field}) في «${sub}».`,
  },
  {
    code: 'PAT_03_IDEMPOTENCY_DUP',
    nameAr: 'غياب درع عدم التكرار والازدواج التنفيذي (Missing Idempotency & Duplicate Execution)',
    severity: 'critical',
    categoryOverride: 'network_api',
    standardRef: 'RFC-Draft-Idempotency / CWE-841',
    buildTitle: (sub, field) =>
      `تكرار تنفيذ العملية مرتين في «${sub}» بسبب غياب مفتاح عدم التكرار على (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `DuplicateExecutionError [${dom}::${ent}#${seq}]: Non-idempotent retry created duplicate state mutation on '${field}' after network timeout`,
    buildRootCause: (sub, field) =>
      `إعادة إرسال الطلب تلقائياً عند تذبذب الشبكة أو النقر المزدوج من الموظف في «${sub}» دون التحقق من بصمة الطلب (` +
      '`Idempotency-Key`' +
      `) على (${field})، مما ينشئ قيداً أو خصماً أو عقداً مكرراً.`,
    buildRemediation: (sub, guardian, field) =>
      `إلزام تمرير كل عملية كتابة في «${sub}» عبر درع عدم التكرار (` +
      '`executeWithIdempotency`' +
      `) وحفظ بصمة ` +
      '`FNV-1a`' +
      ` لحقل (${field}) في (${guardian}) لمنع التنفيذ المزدوج.`,
  },
  {
    code: 'PAT_04_TENANT_RLS_LEAK',
    nameAr: 'خرق عزل الشركات أو قصور فحص الصلاحيات (Cross-Tenant Leakage & RBAC Bypass)',
    severity: 'critical',
    categoryOverride: 'auth_permission',
    standardRef: 'OWASP-A01 / CWE-284',
    buildTitle: (sub, field) =>
      `تسرب بيانات عابر للشركات أو تجاوز صلاحية الوصول في «${sub}» عند استعلام (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `TenantIsolationViolation [${dom}::${ent}#${seq}]: Missing 'company_id' RLS predicate or DataScopeLevel check on '${field}'`,
    buildRootCause: (sub, field) =>
      `الاعتماد على إخفاء عناصر الواجهة فقط أو تنفيذ استعلام في «${sub}» دون تصفية إلزامية بمعرف الشركة (` +
      '`company_id`' +
      `) ومستوى النطاق (` +
      '`DataScopeLevel`' +
      `) على (${field})، مما يسمح بكشف أو تعديل سجلات شركة شقيقة.`,
    buildRemediation: (sub, guardian, field) =>
      `فرض سياسة المنع الافتراضي (` +
      '`Deny by Default`' +
      `) في (${guardian}) وتطبيق سياسة ` +
      '`PostgreSQL RLS`' +
      ` المقترنة بـ ` +
      '`auth.jwt() -> app_metadata ->> company_id`' +
      ` على (${field}) في «${sub}».`,
  },
  {
    code: 'PAT_05_STATE_MACHINE_JUMP',
    nameAr: 'القفز غير النظامي في آلة الحالة أو تعديل سجل مقفل (Illegal State Transition & Immutability Breach)',
    severity: 'high',
    categoryOverride: 'data_validation',
    standardRef: 'CWE-840 / FSM-Invariant',
    buildTitle: (sub, field) =>
      `انتقال غير نظامي في دورة الحياة أو محاولة تعديل سجل معتمد في «${sub}» (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `IllegalStateTransitionError [${dom}::${ent}#${seq}]: Attempted forbidden state jump or mutation on immutable field '${field}'`,
    buildRootCause: (sub, field) =>
      `السماح بتحديث حقل الحالة أو القيمة (${field}) مباشرة في «${sub}» دون المرور عبر حارس آلة الحالة المنتهية (` +
      '`State Machine Guard`' +
      `)، أو السماح بتعديل سجل مرحّل بدلاً من إصدار حركة عكسية.`,
    buildRemediation: (sub, guardian, field) =>
      `تفعيل مصفوفة الانتقالات الحتمية (` +
      '`validateStageTransition`' +
      `) ومنع التعديل المباشر بعد الاعتماد في (${guardian}) لحماية (${field}) داخل «${sub}».`,
  },
  {
    code: 'PAT_06_DUAL_WRITE_OUTBOX',
    nameAr: 'انفصال الكتابة المزدوجة وفقدان الأحداث النطاقية (Dual-Write Inconsistency & Dropped Event)',
    severity: 'high',
    categoryOverride: 'network_api',
    standardRef: 'Outbox-Pattern / CWE-400',
    buildTitle: (sub, field) =>
      `عدم اتساق البيانات بين الأقسام بسبب فشل الكتابة المزدوجة في «${sub}» (${field})`,
    buildSignature: (dom, ent, field, seq) =>
      `DualWriteDesyncError [${dom}::${ent}#${seq}]: Primary entity persisted '${field}' but downstream domain event publication failed mid-flight`,
    buildRootCause: (sub, field) =>
      `حفظ السجل الأساسي في «${sub}» ثم استدعاء خدمة أخرى (مثل القيد المحاسبي أو إشعار مساند أو تحديث المخزون) مباشرة عبر الشبكة دون طابور صندوق صادر، فينقطع الاتصال وتبقى (${field}) غير متطابقة بين الوحدتين.`,
    buildRemediation: (sub, guardian, field) =>
      `تسجيل الحدث النطاقي في صندوق الصادر التبادلي (` +
      '`domain_outbox_events`' +
      `) وطابور عدم الاتصال عبر (${guardian}) مع إعادة المحاولة التلقائية حتى تتطابق (${field}) في «${sub}».`,
  },
  {
    code: 'PAT_07_SCHEMA_CRYPTO_COMPLIANCE',
    nameAr: 'قصور التحقق من المخطط أو التوقيع الرقمي التنظيمي (Schema Validation & Cryptographic Failure)',
    severity: 'high',
    categoryOverride: 'data_validation',
    standardRef: 'ZATCA-UBL / CWE-347',
    buildTitle: (sub, field) =>
      `فشل التحقق القياسي أو انكسار البصمة التشفيرية لحقل (${field}) في «${sub}»`,
    buildSignature: (dom, ent, field, seq) =>
      `SchemaCryptoValidationError [${dom}::${ent}#${seq}]: Malformed payload or invalid SHA-256/TLV signature on '${field}'`,
    buildRootCause: (sub, field) =>
      `قبول مدخلات غير مهيكلة أو بناء حقل (${field}) في «${sub}» نصياً دون التحقق بمخطط ` +
      '`Zod`' +
      ` الصارم أو دون تطبيق خوارزمية الهاش والتوقيع القياسية المعتمدة من الجهات التنظيمية.`,
    buildRemediation: (sub, guardian, field) =>
      `تطبيق التحقق المسبق عبر عقود ` +
      '`Zod`' +
      ` والتوقيع التشفيري الحتمي (` +
      '`SHA-256 / HMAC / TLV Base64`' +
      `) داخل (${guardian}) قبل قبول أو إرسال (${field}) في «${sub}».`,
  },
  {
    code: 'PAT_08_QUERY_PERF_INDEX',
    nameAr: 'استعلامات N+1 أو غياب الفهارس واستنزاف الذاكرة (N+1 Queries, Unindexed Scan & Memory Bloat)',
    severity: 'medium',
    categoryOverride: 'network_api',
    standardRef: 'CWE-405 / PG-Perf',
    buildTitle: (sub, field) =>
      `بطء الأداء واستعلام متكرر (N+1) أو مسح كامل للجدول بدون فهرس على (${field}) في «${sub}»`,
    buildSignature: (dom, ent, field, seq) =>
      `QueryPerformanceDegradation [${dom}::${ent}#${seq}]: Sequential scan & N+1 query waterfall detected on unindexed attribute '${field}'`,
    buildRootCause: (sub, field) =>
      `تنفيذ استعلامات فرعية داخل حلقة تكرار (` +
      '`for / map`' +
      `) أو جلب آلاف السجلات دفعة واحدة في «${sub}» دون فهرس مركب أو جزئي على (${field}) ودون ترقيم صفحات بالمؤشر.`,
    buildRemediation: (sub, guardian, field) =>
      `استبدال الحلقات باستعلام مجمع (` +
      '`Batch Query`' +
      `) وإضافة فهرس ` +
      '`B-Tree / GIN`' +
      ` مخصص لحقل (${field}) مع تفعيل التخزين المؤقت متعدد الطبقات في (${guardian}) لوحدة «${sub}».`,
  },
  {
    code: 'PAT_09_UI_FIBER_RTL_UX',
    nameAr: 'تعارض شجرة React 19 Fiber أو خلل اتجاه RTL وتجربة المستخدم (DOM Reconciliation & RTL/UX Defect)',
    severity: 'medium',
    categoryOverride: 'react_render',
    standardRef: 'React-19-Fiber / WCAG-2.1',
    buildTitle: (sub, field) =>
      `تعارض رندرة شجرة React 19 أو خلل عرض البيانات والاتجاه العربي لحقل (${field}) في «${sub}»`,
    buildSignature: (dom, ent, field, seq) =>
      `ReactFiberDomConflict [${dom}::${ent}#${seq}]: Direct DOM mutation or unguarded null reference during render of '${field}'`,
    buildRootCause: (sub, field) =>
      `التلاعب المباشر بعقد DOM خارج دورة React 19 أو قراءة خاصية فرعية من كائن غير معرّف لعرض (${field}) في شاشة «${sub}»، أو استخدام خصائص اتجاه فيزيائية تكسر محاذاة العربية ورمز الريال (⃁).`,
    buildRemediation: (sub, guardian, field) =>
      `عزل حالة العرض عبر خصائص React التفاعلية وحدود الأخطاء (` +
      '`ErrorBoundary`' +
      `) مع التزام قواعد ` +
      '`RTL`' +
      ` ورمز الريال السعودي (⃁) في (${guardian}) لوحدة «${sub}».`,
  },
  {
    code: 'PAT_10_PDPL_AUDIT_SECURITY',
    nameAr: 'كشف البيانات الشخصية (PDPL) أو نقص سجل التدقيق الأمني (PII Exposure & Missing Audit Trail)',
    severity: 'high',
    categoryOverride: 'auth_permission',
    standardRef: 'SDAIA-PDPL / CWE-359',
    buildTitle: (sub, field) =>
      `كشف بيانات حساسة دون تعتيم (PDPL) أو إغفال توثيق العملية في سجل التدقيق لـ (${field}) داخل «${sub}»`,
    buildSignature: (dom, ent, field, seq) =>
      `PdplComplianceAlert [${dom}::${ent}#${seq}]: Unmasked PII field or unaudited sensitive operation on '${field}'`,
    buildRootCause: (sub, field) =>
      `عرض أو تصدير أو تسجيل قيمة (${field}) كاملة في واجهة «${sub}» أو في ملفات السجل (` +
      '`Console / Logs`' +
      `) للأدوار غير المخولة دون تمريرها على دالة التعتيم، أو تنفيذ العملية دون كتابة أثر تدقيقي.`,
    buildRemediation: (sub, guardian, field) =>
      `تطبيق التعتيم التلقائي (` +
      '`maskSensitiveRecord`' +
      `) حسب صلاحية الدور الوظيفي وتوثيق العملية في السجل الأمني غير القابل للتعديل عبر (${guardian}) لحماية (${field}) في «${sub}».`,
  },
];

let cachedCatalog3000: ErpCatalogErrorItem[] | null = null;

/**
 * توليد واسترجاع الموسوعة الكاملة لـ 3,000 خطأ برمجي مشهور في أنظمة ERP
 * (10 مجالات × 30 وحدة فرعية × 10 أنماط خلل برمجي = 3,000 خطأ فريد ومفصل)
 */
export function getErp3000ErrorCatalog(): ErpCatalogErrorItem[] {
  if (cachedCatalog3000) {
    return cachedCatalog3000;
  }

  const catalog: ErpCatalogErrorItem[] = [];
  let seq = 1;

  for (const domain of ERP_DOMAINS_10) {
    for (const sub of domain.subModules) {
      for (const pattern of ERP_FAILURE_PATTERNS_10) {
        const code = `ERP-ERR-${String(seq).padStart(4, '0')}`;
        const category: ErrorCategory = pattern.categoryOverride || domain.defaultCategory;

        catalog.push({
          seq,
          code,
          domainCode: domain.code,
          domainNameAr: domain.nameAr,
          subModuleAr: sub.nameAr,
          guardianModule: domain.guardianModule,
          patternCode: pattern.code,
          patternNameAr: pattern.nameAr,
          titleAr: pattern.buildTitle(sub.nameAr, sub.metricOrField),
          technicalSignature: pattern.buildSignature(
            domain.code,
            sub.entityKey,
            sub.metricOrField,
            seq
          ),
          rootCauseAr: pattern.buildRootCause(sub.nameAr, sub.metricOrField),
          remediationAr: pattern.buildRemediation(
            sub.nameAr,
            domain.guardianModule,
            sub.metricOrField
          ),
          category,
          severity: pattern.severity,
          standardRef: pattern.standardRef,
        });

        seq += 1;
      }
    }
  }

  cachedCatalog3000 = catalog;
  return catalog;
}

export interface ErpCatalogStats {
  totalErrors: number;
  domainCount: number;
  subModuleCount: number;
  patternCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  byDomain: Array<{
    code: string;
    nameAr: string;
    rangeLabel: string;
    count: number;
    guardianModule: string;
  }>;
}

export function getErp3000CatalogStats(): ErpCatalogStats {
  const all = getErp3000ErrorCatalog();
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  for (const item of all) {
    if (item.severity === 'critical') criticalCount += 1;
    else if (item.severity === 'high') highCount += 1;
    else mediumCount += 1;
  }

  return {
    totalErrors: all.length,
    domainCount: ERP_DOMAINS_10.length,
    subModuleCount: ERP_DOMAINS_10.reduce((acc, d) => acc + d.subModules.length, 0),
    patternCount: ERP_FAILURE_PATTERNS_10.length,
    criticalCount,
    highCount,
    mediumCount,
    byDomain: ERP_DOMAINS_10.map((d) => ({
      code: d.code,
      nameAr: d.nameAr,
      rangeLabel: `ERP-ERR-${String(d.rangeStart).padStart(4, '0')} .. ERP-ERR-${String(
        d.rangeEnd
      ).padStart(4, '0')}`,
      count: d.rangeEnd - d.rangeStart + 1,
      guardianModule: d.guardianModule,
    })),
  };
}
