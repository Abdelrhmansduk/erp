import fs from 'node:fs';
import path from 'node:path';

// Compile-free runner using Vite/TS or direct import of the catalog structure
const tsSource = fs.readFileSync(
  path.resolve('src/services/erp3000ErrorCatalog.ts'),
  'utf8'
);

// Strip TypeScript type annotations to evaluate cleanly in Node
const jsCode = tsSource
  .replace(/import type .*?;\r?\n/g, '')
  .replace(/export interface [\s\S]*?\r?\n\}\r?\n/g, '')
  .replace(/: ErpDomainDefinition\[\]/g, '')
  .replace(/: ErpFailurePatternDefinition\[\]/g, '')
  .replace(/: ErpCatalogErrorItem\[\] \| null/g, '')
  .replace(/: ErpCatalogErrorItem\[\]/g, '')
  .replace(/: ErpCatalogStats/g, '')
  .replace(/: ErrorCategory/g, '')
  .replace(/\(sub: string, field: string\)/g, '(sub, field)')
  .replace(/\(dom: string, ent: string, field: string, seq: number\)/g, '(dom, ent, field, seq)')
  .replace(/\(sub: string, guardian: string, field: string\)/g, '(sub, guardian, field)')
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ');

const fn = new Function(`${jsCode}\nreturn { getErp3000ErrorCatalog, getErp3000CatalogStats, ERP_DOMAINS_10, ERP_FAILURE_PATTERNS_10 };`);
const { getErp3000ErrorCatalog, getErp3000CatalogStats, ERP_DOMAINS_10, ERP_FAILURE_PATTERNS_10 } = fn();

const catalog = getErp3000ErrorCatalog();
const stats = getErp3000CatalogStats();

const lines = [];
lines.push('# موسوعة الأخطاء البرمجية المشهورة في أنظمة تخطيط الموارد المؤسسية (3,000 خطأ برمجي مصنّف)');
lines.push('## Enterprise ERP 3,000 Famous Programming Errors & Architectural Safeguards Catalog');
lines.push('');
lines.push(`- **إجمالي الأخطاء الموثقة:** \`${stats.totalErrors}\` خطأ برمجي وتشغيلي (\`ERP-ERR-0001\` إلى \`ERP-ERR-3000\`)`);
lines.push(`- **عدد المجالات المؤسسية الكبرى:** \`${stats.domainCount}\` مجالات رئيسية`);
lines.push(`- **عدد الوحدات والعمليات الفرعية:** \`${stats.subModuleCount}\` وحدة وسيناريو تشغيلي`);
lines.push(`- **عدد أنماط الفشل البرمجي القياسية:** \`${stats.patternCount}\` أنماط هندسية`);
lines.push(`- **توزيع الخطورة:** حرج جداً (\`${stats.criticalCount}\`) • مرتفع (\`${stats.highCount}\`) • متوسط (\`${stats.mediumCount}\`)`);
lines.push('');
lines.push('---');
lines.push('');
lines.push('## أولاً: ملخص المجالات العشرة الكبرى (10 Core ERP Domains)');
lines.push('');
lines.push('| # | كود المجال | المجال المؤسسي | نطاق الأكواد | عدد الأخطاء | المحرك الحارس في المنظومة |');
lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
stats.byDomain.forEach((d, idx) => {
  lines.push(`| ${idx + 1} | \`${d.code}\` | **${d.nameAr}** | \`${d.rangeLabel}\` | ${d.count} | \`${d.guardianModule}\` |`);
});
lines.push('');
lines.push('---');
lines.push('');
lines.push('## ثانياً: أنماط الخلل البرمجي العشرة المتكررة في أنظمة ERP (10 Failure Archetypes)');
lines.push('');
lines.push('| # | كود النمط | نمط الخلل البرمجي | درجة الخطورة | المرجع القياسي |');
lines.push('| :--- | :--- | :--- | :--- | :--- |');
ERP_FAILURE_PATTERNS_10.forEach((p, idx) => {
  lines.push(`| ${idx + 1} | \`${p.code}\` | **${p.nameAr}** | \`${p.severity.toUpperCase()}\` | \`${p.standardRef}\` |`);
});
lines.push('');
lines.push('---');
lines.push('');
lines.push('## ثالثاً: السجل الكامل للـ 3,000 خطأ برمجي (`ERP-ERR-0001` إلى `ERP-ERR-3000`)');
lines.push('');

for (const domain of ERP_DOMAINS_10) {
  const domainItems = catalog.filter((item) => item.domainCode === domain.code);
  lines.push(`### ${domain.nameAr} (\`ERP-ERR-${String(domain.rangeStart).padStart(4, '0')}\` – \`ERP-ERR-${String(domain.rangeEnd).padStart(4, '0')}\`)`);
  lines.push(`> **المحرك الحارس في المنظومة:** \`${domain.guardianModule}\` | **إجمالي أخطاء هذا المجال:** \`${domainItems.length}\``);
  lines.push('');
  lines.push('| # | الكود | الوحدة الفرعية | نمط الخطأ | وصف الخطأ البرمجي | التشخيص الجذري | الحل الهندسي والوقاية | الخطورة |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const item of domainItems) {
    lines.push(
      `| ${item.seq} | \`${item.code}\` | ${item.subModuleAr} | ${item.patternNameAr} | **${item.titleAr}** | ${item.rootCauseAr} | ${item.remediationAr} | \`${item.severity.toUpperCase()}\` |`
    );
  }
  lines.push('');
}

const outPath = path.resolve('docs/ERP_3000_PROGRAMMING_ERRORS_CATALOG.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Generated ${catalog.length} errors at ${outPath}`);
