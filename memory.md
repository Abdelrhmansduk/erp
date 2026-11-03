# دليل الذاكرة والأداء العالي والتنفيذ الخلفي (High-Performance, Memory & Resilience Architecture)
## ISR • Multi-Tier Caching • CDN • Database Tuning • Offline Queue • Background Worker Sync
### منظومة ERP مجموعة خالد السليم القابضة (`خالد السليم | Al-Sulaim`)

---

### 1. التوليد المتزايد للصفحات العامة (Public Pages ISR Architecture)

#### 1.1. المفهوم والهدف (Incremental Static Regeneration)
تعتمد الصفحات العامة وبوابات الخدمة الذاتية (صفحة الهبوط المؤسسية، بوابة تتبع العقد للعميل، وبوابة الوكالات الخارجية) على نموذج **التوليد المسبق مع التحديث اللحظي في الخلفية (ISR)** لضمان:
- سرعة تحميل أولية فائقة (`TTFB < 50ms`) من أقرب نقطة تواجد (`Edge CDN`).
- استهلاك شبه منعدم لموارد خادم قاعدة البيانات عند تصفح آلاف العملاء المتزامنين.

#### 1.2. إعدادات التوليد وإعادة التنشيط (Revalidation Strategy)
```typescript
export const revalidateConfig = {
  landingPage: 3600,        // كل ساعة للصفحة التعريفية
  portalStatus: 60,         // كل 60 ثانية لحالات تتبع العقود
  agencyVerify: 300,        // كل 5 دقائق لبوابات الوكلاء
  headers: {
    'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    'CDN-Cache-Control': 'max-age=3600',
    'Vary': 'Accept-Encoding, Accept-Language'
  }
};
```

#### 1.3. إعادة التوليد الفوري المبني على الأحداث (On-Demand Event Revalidation)
عند نشر حدث نطاقي عبر [`domainEventBus.publishDomainEvent`](src/services/domainEventBus.ts) (مثل `CONTRACT_STAGE_CHANGED` أو `INVOICE_CLEARED`):
1. يُسجل الحدث في `domain_outbox_events` ويُبث للمشتركين اللحظيين عبر [`realtimeSubscriptionService.ts`](src/services/realtimeSubscriptionService.ts).
2. تُبطل الذاكرة المؤقتة لمسار العقد المتأثر فوراً ليرى العميل التحديث دون تأخير.

---

### 2. هرمية التخزين المؤقت متعدد المستويات (Multi-Tier Caching Taxonomy)

```
[المستخدم] ──► [L1: متصفح العميل (Zustand / Local Persistence + Lazy Chunks)]
                    │
                    ▼
          [L2: طابور عدم الاتصال وصندوق الصادر (OfflineQueue + Outbox)]
                    │
                    ▼
          [L3: شبكة الحافة والـ CDN (Edge Cache / Brotli / Immutable Bundles)]
                    │
                    ▼
          [L4: مجمّع اتصالات وقاموس قاعدة البيانات (Supabase Supavisor + PostgreSQL)]
```

#### 2.1. التحميل الكسول المتوازي للحزم الثقيلة (Lazy Chunk Preloading)
- تُفصل حزم التصدير الثقيلة (`jspdf`, `html2canvas`, `xlsx`) عن الحزمة الرئيسية وتُحمّل عند الطلب عبر `Promise.all([import('jspdf'), import('html2canvas')])` في [`src/services/exportService.ts`](src/services/exportService.ts)، مما يخفض حجم الإقلاع الأولي بأكثر من `550 KB`.

#### 2.2. طابور العمليات دون اتصال والتراجع الأسي ([`src/services/offlineQueueService.ts`](src/services/offlineQueueService.ts))
- يدعم السائقين الميدانيين (`YAQ`) ومشرفي الإيواء (`DAR`) في المناطق ضعيفة التغطية:
  - تُحفظ العمليات في `ALSULAIM_ERP_OFFLINE_MUTATION_QUEUE_V1` بحالة `QUEUED`.
  - تُحسب فترات إعادة المحاولة الأسية عبر `computeExponentialBackoffMs(attempt)`:
    `1000ms -> 2000ms -> 4000ms -> 8000ms -> 16000ms`.
  - بعد استنفاد الحد الأقصى للمحاولات (`maxAttempts = 5`)، تنتقل العملية إلى `DEAD_LETTER` للمراجعة الرقابية دون فقدان البيانات.

#### 2.3. محرك التنفيذ الخلفي ونبض Web Worker ([`src/services/backgroundExecutionService.ts`](src/services/backgroundExecutionService.ts))
- يشغل `Web Worker` مستقل غير قابل للإبطاء في الخلفية (`HEARTBEAT_TICK` كل 25 ثانية) مع:
  - تكامل `Service Worker Background Sync` (`alsulaim-erp-offline-sync`).
  - استرداد فوري عند عودة الشبكة (`online`) أو عودة التطبيق للواجهة (`visibilitychange` / `pageshow`).
  - دعم قفل الشاشة (`navigator.wakeLock`) أثناء جولات التوصيل الميدانية.

---

### 3. تحسين استعلامات قواعد البيانات وفهارس الأداء (Database & RLS Tuning)

#### 3.1. تحسين قواعد أمان الصفوف (RLS Subselect Optimization Invariant)
> **قاعدة ذهبية**: تغليف دوال جلسة المصادقة داخل `(SELECT ...)` لضمان تقييمها مرة واحدة لكل استعلام (`InitPlan`) بدلاً من تقييمها لكل صف:
```sql
CREATE POLICY "Optimal_Tenant_Isolation" ON recruitment_contracts
FOR SELECT TO authenticated
USING (
  company_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id'))
);
```

#### 3.2. استراتيجية الفهارس المركبة والجزئية (Composite & Partial Indexing)
```sql
-- فهرس مركب للاستعلامات التشغيلية اليومية لخطوط أنابيب مساند
CREATE INDEX idx_contracts_lookup ON recruitment_contracts (company_id, stage, created_at DESC);

-- فهرس جزئي سريع للطلبات المتأخرة فقط
CREATE INDEX idx_delayed_orders ON orders (company_id, deadline)
WHERE status = 'تحت الإجراء' AND timer_status = 'متأخر';

-- فهرس GIN للبحث السريع داخل وثائق وجداول الكميات
CREATE INDEX idx_boq_items_gin ON tenders_boq_items USING GIN (specifications jsonb_path_ops);
```

---

### 4. أهداف ومؤشرات الأداء المستهدفة (SLOs & Self-Healing Observability)
- **المستخدمون المتزامنون (Concurrency)**: `5,000` مستخدم نشط متزامن.
- **معدل الطلبات المستهدف (Throughput)**: `1,200` طلب/ثانية.
- **أزمنة الاستجابة (Latency SLOs)**: `p50 < 80ms`، `p95 < 250ms`، `p99 < 500ms`.
- **الاستشفاء الذاتي اللحظي ([`src/services/errorMonitorService.ts`](src/services/errorMonitorService.ts))**:
  - رصد وتصنيف أخطاء `React Fiber DOM`, `Chunk Load`, `Network/Supabase Timeout`, `IAM/RBAC`, و`ZATCA/Musaned Validation` مع تفعيل إجراءات الإصلاح التلقائي (`autoHealed`) بمتوسط زمن استعادة أقل من `50ms`.
- **اعتماد رمز الريال السعودي الرسمي (SAMA SRS Guidelines)**:
  - توحيد عرض العملة الوطنية عبر [`src/utils/saudiRiyal.ts`](src/utils/saudiRiyal.ts) و[`src/components/common/SaudiRiyalSymbol.tsx`](src/components/common/SaudiRiyalSymbol.tsx) وخط `saudi_riyal` المدمج (`U+20C1` `⃁`) على يسار القيمة العددية مع مسافة فاصلة في كافة الشاشات والمستندات.
