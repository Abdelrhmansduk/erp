import i18n from '../../i18n/config';
import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  FileText,
  ShoppingCart,
  RotateCcw,
  ChevronDown,
  Filter,
  BarChart2
} from 'lucide-react';

export const SmaccDashboardWidget: React.FC = () => {
  const [periodFilter, setPeriodFilter] = useState('الأيام الأخيرة');

  return (
    <div className="space-y-6 font-sans select-none dir-rtl text-right" style={{ fontFamily: 'var(--font-family-ui)', fontFeatureSettings: '"ss03" 1' }}>
      {/* Top Banner Header */}
      <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
            {i18n.t("finance.finCode", "FIN")}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#141414', margin: 0 }}>لوحة التحكم الهيكلية للنظام المالي والمحاسبي</h2>
              <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>
                مطابق 100%
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#707070', margin: '2px 0 0 0' }}>الصفحة الرئيسية • متابعة الحركة المالية والأقسام التشغيلية</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#71717a' }}>الفترة الزمنية:</span>
          <select
            aria-label="الفترة الزمنية"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="text-input"
            style={{ height: '36px', minHeight: '36px', borderRadius: '9999px', fontSize: '12px', padding: '0 14px' }}
          >
            <option value="الأيام الأخيرة">الأيام الأخيرة</option>
            <option value="هذا الشهر">هذا الشهر</option>
            <option value="الربع الحالي">الربع الحالي</option>
            <option value="السنة المالية 2026">السنة المالية 2026</option>
          </select>
        </div>
      </div>

      {/* Top 3 Stat Counter Cards — Mobbin 24px Uniform Surface & 30% Squircle Icons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: عدد البائعين */}
        <div className="card-pricing" style={{ padding: '22px 24px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#707070', display: 'block', marginBottom: '6px' }}>عدد البائعين</span>
            <span className="display-sm" style={{ fontSize: '32px', fontWeight: 652, color: '#141414', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>2</span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '30%', background: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: عدد العملاء */}
        <div className="card-pricing" style={{ padding: '22px 24px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#707070', display: 'block', marginBottom: '6px' }}>عدد العملاء</span>
            <span className="display-sm" style={{ fontSize: '32px', fontWeight: 652, color: '#141414', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>4</span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '30%', background: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: عدد محصلين المبيعات */}
        <div className="card-pricing" style={{ padding: '22px 24px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#707070', display: 'block', marginBottom: '6px' }}>عدد محصلين المبيعات</span>
            <span className="display-sm" style={{ fontSize: '32px', fontWeight: 652, color: '#141414', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>1</span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '30%', background: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid Section 1: Financial Movement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: مدفوعات (Payments) */}
        <div className="card-pricing" style={{ padding: '22px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#141414' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 550, color: '#141414', margin: 0 }}>مدفوعات (Payment Summary)</h3>
            </div>
            <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
              {periodFilter}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>إجمالي الدفعات</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>المدفوعات النقدية</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>مدفوعات الشيك</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>الدفعات المحولة</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
          </div>

          <div style={{ padding: '12px', background: '#fafafa', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#71717a', border: '1px dashed #e4e4e7', marginTop: '12px' }}>
            السجل غير موجود (جاهز لاستقبال سندات الصرف الجديدة)
          </div>
        </div>

        {/* Box 2: ايصالات استلام (Receipt Vouchers) */}
        <div className="card-pricing" style={{ padding: '22px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#141414' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 550, color: '#141414', margin: 0 }}>ايصالات استلام (Receipt Vouchers)</h3>
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              {periodFilter}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>إجمالي الايصالات</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>سند استلام نقدي</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>ايصالات الشيك</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>الايصالات المحولة</span>
              <span style={{ fontSize: '15px', fontWeight: 550, color: '#141414', marginTop: '2px', display: 'block' }}>0.00 ⃁</span>
            </div>
          </div>

          <div style={{ padding: '12px', background: '#fafafa', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#71717a', border: '1px dashed #e4e4e7', marginTop: '12px' }}>
            السجل غير موجود (جاهز لاستقبال سندات القبض والإيداعات)
          </div>
        </div>
      </div>

      {/* Grid Section 2: Purchasing & Orders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 3: عرض اسعار المشتروات */}
        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '10px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 550, color: '#141414', margin: 0 }}>عرض اسعار المشتروات</h3>
            <span className="pill-tag-shade" style={{ fontSize: '10.5px' }}>{periodFilter}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '10px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '10.5px', color: '#71717a', display: 'block' }}>عدد عروض الاسعار</span>
              <span style={{ fontWeight: 550, color: '#141414' }}>0.00</span>
            </div>
            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '10px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '10.5px', color: '#71717a', display: 'block' }}>إجمالي عروض الاسعار</span>
              <span style={{ fontWeight: 550, color: '#141414' }}>0.00</span>
            </div>
            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '10px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '10.5px', color: '#71717a', display: 'block' }}>كمية عروض الاسعار</span>
              <span style={{ fontWeight: 550, color: '#141414' }}>0.00</span>
            </div>
            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '10px', border: '1px solid #e4e4e7' }}>
              <span style={{ fontSize: '10.5px', color: '#71717a', display: 'block' }}>الكمية المعالجة</span>
              <span style={{ fontWeight: 550, color: '#141414' }}>0.00</span>
            </div>
          </div>

          <div style={{ padding: '10px', background: '#fafafa', borderRadius: '10px', textAlign: 'center', fontSize: '11px', color: '#71717a', marginTop: '12px', border: '1px solid #e4e4e7' }}>
            السجل غير موجود
          </div>
        </div>

        {/* Box 4: فاتورة الشراء */}
        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '10px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 550, color: '#141414', margin: 0 }}>فاتورة الشراء</h3>
            <span className="pill-tag-shade" style={{ fontSize: '10.5px' }}>{periodFilter}</span>
          </div>

          <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>إجمالي قيمة فواتير الشراء</span>
            <span className="display-sm" style={{ fontSize: '24px', fontWeight: 330, color: '#141414', marginTop: '4px', display: 'block' }}>0.00 ⃁</span>
          </div>

          <div style={{ padding: '10px', background: '#fafafa', borderRadius: '10px', textAlign: 'center', fontSize: '11px', color: '#71717a', marginTop: '12px', border: '1px solid #e4e4e7' }}>
            السجل غير موجود
          </div>
        </div>

        {/* Box 5: أمر الشراء */}
        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '10px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 550, color: '#141414', margin: 0 }}>أمر الشراء</h3>
            <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>{periodFilter}</span>
          </div>

          <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: '11px', color: '#71717a', display: 'block' }}>إجمالي أوامر الشراء المعتمدة</span>
            <span className="display-sm" style={{ fontSize: '24px', fontWeight: 330, color: '#141414', marginTop: '4px', display: 'block' }}>0.00 ⃁</span>
          </div>

          <div style={{ padding: '10px', background: '#fafafa', borderRadius: '10px', textAlign: 'center', fontSize: '11px', color: '#71717a', marginTop: '12px', border: '1px solid #e4e4e7' }}>
            السجل غير موجود
          </div>
        </div>
      </div>
    </div>
  );
};
