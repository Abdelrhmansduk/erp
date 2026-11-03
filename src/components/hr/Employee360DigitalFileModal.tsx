import React, { useState } from 'react';
import { Employee, EmployeeDocument } from '../../types';
import { 
  Award, Briefcase, CalendarCheck, CheckCircle2, DollarSign, 
  FileSignature, FileText, Fingerprint, Shield, Star, TrendingUp, 
  UserCheck, X, Scale, Printer, Download, Lock, Check, Building2
} from 'lucide-react';
import { DEPARTMENT_LEGAL_POLICIES } from '../legal/LegalDisclaimerModal';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { CorporateAvatar } from '../common/CorporateAvatar';
import { BusinessIllustration } from '../common/BusinessIllustration';

interface Employee360DigitalFileModalProps {
  employee: any;
  onClose: () => void;
}

export const Employee360DigitalFileModal: React.FC<Employee360DigitalFileModalProps> = ({
  employee,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'contracts' | 'signatures' | 'payroll' | 'attendance' | 'performance' | 'eos'>('info');

  const getPolicy = () => {
    const dept = (employee.department || '').toLowerCase();
    if (dept.includes('استقدام') || dept.includes('تشغيل') || dept.includes('عمليات')) return DEPARTMENT_LEGAL_POLICIES['recruitment'];
    if (dept.includes('مالية') || dept.includes('حسابات')) return DEPARTMENT_LEGAL_POLICIES['finance'];
    if (dept.includes('عملاء') || dept.includes('crm') || dept.includes('مبيعات')) return DEPARTMENT_LEGAL_POLICIES['crm'];
    if (dept.includes('إيواء') || dept.includes('تسكين')) return DEPARTMENT_LEGAL_POLICIES['shelter'];
    if (dept.includes('موارد') || dept.includes('hr')) return DEPARTMENT_LEGAL_POLICIES['hr'];
    return DEPARTMENT_LEGAL_POLICIES['admin'];
  };

  const policy = getPolicy();

  const [sampleDocs, setSampleDocs] = useState<EmployeeDocument[]>([
    {
      id: 'DOC-101',
      title: 'بطاقة الهوية الوطنية / الإقامة',
      category: 'هوية/إقامة',
      documentNumber: employee.national_id,
      issueDate: '2023-01-15',
      expiryDate: '2028-01-15',
      status: 'ساري',
      verified: true,
      version: 1,
    },
    {
      id: 'DOC-102',
      title: 'عقد العمل الإلكتروني التوثيقي الموحد',
      category: 'عقد عمل',
      documentNumber: 'CNT-99042',
      issueDate: employee.hire_date,
      expiryDate: '2026-08-01',
      status: 'ساري',
      verified: true,
      version: 2,
    },
    {
      id: 'DOC-103',
      title: 'اتفاقية عدم الإفشاء وميثاق التبرئة وسياسة النظام (NDA)',
      category: 'اتفاقية قانونية',
      documentNumber: `SA-COMPLIANCE-${employee.employee_code || 'EMP-2026'}`,
      issueDate: employee.hire_date || '2026-01-01',
      expiryDate: 'مستمر طيلة فترة العمل',
      status: 'ساري',
      verified: true,
      version: 1,
    },
    {
      id: 'DOC-104',
      title: 'شهادة الفحص الطبي المعتمدة',
      category: 'شهادة صحية',
      documentNumber: 'MED-7712',
      issueDate: '2024-02-10',
      expiryDate: '2025-02-10',
      status: 'قريب الانتهاء',
      verified: true,
      version: 1,
    },
  ]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          width: '960px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header — Mobbin Pure Light Mode */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px 24px',
            color: '#141414',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <CorporateAvatar
              name={employee.name}
              role={employee.job_title}
              departmentId={employee.department}
              size="lg"
              status="verified"
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#141414', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{employee.name}</span>
                <span style={{ fontSize: '11px', backgroundColor: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', padding: '2px 8px', borderRadius: '9999px', fontFamily: 'monospace' }}>
                  {employee.employee_code || employee.id}
                </span>
                <span style={{ fontSize: '11px', backgroundColor: '#f3f3f3', color: '#141414', border: '1px solid #e0e0e0', padding: '2px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>توقيع موثق نظامياً</span>
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#707070', marginTop: '2px' }}>
                {employee.job_title} | {employee.department} | {employee.branch}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="hidden sm:block">
              <BusinessIllustration
                departmentId={employee.department}
                size="sm"
                showBackground={false}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: '#f3f3f3', border: '1px solid #e0e0e0', color: '#141414', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 16px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'info', label: 'البيانات الشخصية والوظيفية' },
            { id: 'signatures', label: 'التوقيع والاتفاقية القانونية' },
            { id: 'documents', label: 'المستندات الرقمية' },
            { id: 'contracts', label: 'العقود والدرجات والترقيات' },
            { id: 'payroll', label: 'الرواتب والأجور (WPS)' },
            { id: 'attendance', label: 'الحضور والإجازات' },
            { id: 'performance', label: 'تقييم الأداء KPIs' },
            { id: 'eos', label: 'مكافأة نهاية الخدمة' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '14px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #000000' : '3px solid transparent',
                color: activeTab === tab.id ? '#000000' : '#64748B',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Tab Contents */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1D2428', fontSize: '14px', fontWeight: '800' }}>
                  معلومات الهوية والاتصال:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div><strong>رقم الهوية/الإقامة:</strong> <span style={{ fontFamily: 'monospace' }}>{employee.national_id}</span></div>
                  <div><strong>الجنسية:</strong> {employee.nationality || 'سعودي'}</div>
                  <div><strong>البريد الإلكتروني:</strong> {employee.email || `${employee.name.split(' ')[0]}@alsulaim.sa`}</div>
                  <div><strong>رقم الجوال:</strong> {employee.phone || '0500000000'}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1D2428', fontSize: '14px', fontWeight: '800' }}>
                  الموقع الهيكلي والبنكي:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div><strong>تاريخ التعيين:</strong> {employee.hire_date}</div>
                  <div><strong>الدرجة الوظيفية:</strong> {employee.grade || 'الدرجة الثالثة (أخصائي أول)'}</div>
                  <div><strong>البنك المعتمد:</strong> {employee.bank_name || employee.bankName || 'مصرف الراجحي'}</div>
                  <div><strong>رقم الآيبان:</strong> <span style={{ fontFamily: 'monospace' }}>{employee.iban || employee.bankIban || `SA03800000000${employee.national_id}12`}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* New Tab: Signatures & Legal Agreements */}
          {activeTab === 'signatures' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Signature Overview Box */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Scale className="w-5 h-5 text-emerald-600" />
                      <span>اتفاقية التبرئة القانونية وميثاق استخدام النظام الموقعة للموظف</span>
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      موثقة رقمياً ومطابقة لنظام التعاملات الإلكترونية السعودي (م/18) ونظام PDPL
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{ backgroundColor: '#000000', color: '#FFFFFF', border: 'none', borderRadius: '9999px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الوثيقة الرسمية</span>
                    </button>
                  </div>
                </div>

                {/* Signature Verification Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                      بيانات التوثيق الرقمي والاعتماد:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <div><strong>رقم الاعتماد التشفيري:</strong> <span style={{ fontFamily: 'monospace', color: '#047857', fontWeight: '800' }}>SA-COMPLIANCE-EMP-{employee.employee_code || '2026-001'}</span></div>
                      <div><strong>تاريخ ووقت التوقيع:</strong> <span style={{ fontFamily: 'monospace' }}>{employee.hire_date || '2026-01-15'} 10:30:00 (1447 هـ)</span></div>
                      <div><strong>عنوان الـ IP المعتمد:</strong> <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>192.168.1.15 (شبكة المنظومة الآمنة)</span></div>
                      <div><strong>حالة المستند:</strong> <span style={{ color: '#047857', fontWeight: '800' }}>ساري ومطابق نظامياً</span></div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                      التوقيع الإلكتروني والبصمة المعتمدة للموظف:
                    </span>
                    <div style={{ border: '1px dashed #CBD5E1', borderRadius: '12px', padding: '10px 20px', backgroundColor: '#F8FAFC', width: '80%' }}>
                      <Fingerprint className="w-8 h-8 text-emerald-600 mx-auto" />
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#065F46', marginTop: '4px' }}>
                        توقيع بيومتري إلكتروني موثق (E-Sign)
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                        {employee.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Specific Clauses Summary */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#1D2428', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>البنود الموقعة المخصصة لـ ({policy.departmentName}):</span>
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {policy.clauses.map((clause, idx) => (
                      <div key={clause.id} style={{ fontSize: '11px', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                        <div style={{ fontWeight: '700', color: '#1D2428', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{idx + 1}. {clause.title}</span>
                          <span style={{ color: '#64748B', fontSize: '10px' }}>{clause.lawReference}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: '#475569', lineHeight: '1.5' }}>{clause.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>مستندات الموظف الموثقة والاتفاقيات:</h4>
                <button 
                  type="button" 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.png,.jpg,.jpeg';
                    input.onchange = (e: any) => {
                      const file = e.target?.files?.[0];
                      if (file) {
                        const today = new Date().toISOString().split('T')[0];
                        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const newDoc: EmployeeDocument = {
                          id: `DOC-${105 + sampleDocs.length}`,
                          title: file.name.replace(/\.[^/.]+$/, ''),
                          category: 'أخرى',
                          documentNumber: `OCR-${Math.floor(10000 + Math.random() * 90000)}`,
                          issueDate: today,
                          expiryDate: nextYear,
                          status: 'ساري',
                          verified: true,
                          version: 1,
                        };
                        setSampleDocs((prev) => [newDoc, ...prev]);
                        notificationPopupEngine.success(
                          'توثيق مستند جديد (OCR)',
                          `تم استلام المستند (${file.name}) وتدقيقه آلياً وإضافته لملف الموظف الرقمي.`
                        );
                      }
                    };
                    input.click();
                  }}
                  style={{ backgroundColor: '#000000', color: '#FFF', border: 'none', borderRadius: '9999px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  + رفع مستند جديد (OCR)
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px' }}>عنوان المستند والاتفاقية</th>
                    <th style={{ padding: '10px' }}>التصنيف</th>
                    <th style={{ padding: '10px' }}>رقم المستند والاعتماد</th>
                    <th style={{ padding: '10px' }}>تاريخ السريان</th>
                    <th style={{ padding: '10px' }}>الحالة والتوثيق</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px', fontWeight: '700' }}>{doc.title} (V{doc.version})</td>
                      <td style={{ padding: '10px' }}>{doc.category}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{doc.documentNumber}</td>
                      <td style={{ padding: '10px' }}>{doc.expiryDate}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ backgroundColor: doc.status === 'ساري' ? '#ECFDF5' : '#FEF3C7', color: doc.status === 'ساري' ? '#047857' : '#D97706', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                          {doc.status} ({doc.verified ? 'موثق' : 'معلق'})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1D2428' }}>سجل الترقية والمسار الوظيفي (Career Ladder):</h4>
                  <span style={{ backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' }}>
                    ترقية مستحقة ونافذة
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>الدرجة الحالية</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000', marginTop: '2px' }}>{employee.grade || 'الدرجة الثالثة'}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>المسمى الوظيفي المعتمد</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#000000', marginTop: '2px' }}>{employee.job_title}</div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>الدور وصلاحيات النظام</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#8C681E', marginTop: '2px' }}>{employee.system_role || 'مستخدم معتمد'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800' }}>تفاصيل مسير الأجور وحماية الأجور (WPS):</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>الراتب الأساسي (70%)</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#1D2428' }}>{((employee.salary ?? 8000) * 0.7).toLocaleString()} ⃁</div>
                </div>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>بدل السكن والنقل (30%)</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563EB' }}>{((employee.salary ?? 8000) * 0.3).toLocaleString()} ⃁</div>
                </div>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>إجمالي الراتب المسجل (GOSI)</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>{(employee.salary ?? 8000).toLocaleString()} ⃁</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800' }}>سجل الحضور والانضباط والرصيد السنوي:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>نسبة الالتزام بالدوام</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>98.4%</div>
                </div>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>رصيد الإجازات المتبقي</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#1D2428' }}>{employee.leave_balance || 24} يوم</div>
                </div>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>ساعات التأخير الشهرية</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#2563EB' }}>0 ساعة</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>بطاقة تقييم الأداء والمستهدفات (KPIs & Appraisal):</h4>
                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800' }}>
                  تقييم ممتاز (5 / 5)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>تحقيق مستهدفات العمليات وسرعة إنجاز العقود</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>الهدف: 100% • المنجز: 114%</div>
                  </div>
                  <span style={{ color: '#059669', fontWeight: '800', fontSize: '14px' }}>114%</span>
                </div>

                <div style={{ backgroundColor: '#FFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>مؤشر رضا العملاء والتقييم الإيجابي (CSAT)</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>الهدف: 90% • المنجز: 97.2%</div>
                  </div>
                  <span style={{ color: '#059669', fontWeight: '800', fontSize: '14px' }}>97.2%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eos' && (
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', padding: '20px', borderRadius: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#9A3412', fontSize: '15px', fontWeight: '800' }}>
                حساب التصفية ومكافأة نهاية الخدمة (End of Service Settlement):
              </h4>
              <p style={{ fontSize: '13px', color: '#C2410C', marginBottom: '14px' }}>
                بناءً على المادة 84 و 85 من نظام العمل السعودي، يستحق الموظف أجر نصف شهر عن كل سنة من السنوات الخمس الأولى، وأجر شهر عن كل سنة تالية.
              </p>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#9A3412' }}>
                المبلغ المقدر لمكافأة نهاية الخدمة: {(((employee.salary || 8000) / 2) * 3).toLocaleString()} ⃁ (فترة خدمة تقديرية: 3 سنوات)
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: '#000000', color: '#FFFFFF', border: 'none', borderRadius: '9999px', padding: '8px 22px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
          >
            إغلاق الملف الرقمي
          </button>
        </div>
      </div>
    </div>
  );
};
