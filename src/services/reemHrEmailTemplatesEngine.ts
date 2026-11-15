/**
 * Official Bilingual HR Email & Outlook Correspondence Engine
 * Modeled verbatim on Ms. Reem Ahmed Bin Hussein's (ريم احمد بن حسين — HR@kas.sa)
 * official Khalid Al-Sulaim Trading Group corporate correspondence (@kas.sa).
 *
 * Strict invariants:
 * - Monochrome Mobbin palette (#141414, #ffffff, #f3f3f3, #e0e0e0)
 * - Official SAMA Saudi Riyal symbol (⃁ / \u20C1)
 * - Strict exclusion of any email listed in EXCLUDED_KAS_EMAILS
 * - Valid RFC 5322 .eml output with X-Unsent: 1 + multipart/related inline PNG logo (cid:kas-group-logo@kas.sa)
 */

import {
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  type KasAllowedEmployee,
} from '../config/kasAllowedEmails';

export type ReemHrTemplateId =
  | 'CUSTOM_OFFICIAL_CORRESPONDENCE'
  | 'EMPLOYMENT_TRANSACTION_DECISION'
  | 'ADMINISTRATIVE_WARNING_ART71'
  | 'PROACTIVE_COMPLIANCE_ALERT'
  | 'ONBOARDING_WELCOME_PACKAGE'
  | 'INTERDEPARTMENTAL_WORK_TASK'
  | 'PAYROLL_WPS_PAYSLIP_NOTICE'
  | 'GENERAL_HR_CIRCULAR';

export interface ReemHrSignatory {
  nameAr: string;
  fullNameAr: string;
  titleAr: string;
  departmentAr: string;
  nameEn: string;
  signatureNameEn: string;
  titleEn: string;
  consultantTitleEn: string;
  email: string;
  mobile: string;
  defaultCc: string[];
  groupNameAr: string;
  groupNameEn: string;
  groupBannerText: string;
}

export const REEM_HR_SIGNATORY: ReemHrSignatory = {
  nameAr: 'ريم بن حسين',
  fullNameAr: 'ريم احمد بن حسين',
  titleAr: 'مديرة الموارد البشرية',
  departmentAr: 'إدارة الموارد البشرية وشؤون الموظفين',
  nameEn: 'Reem Bin Hussein',
  signatureNameEn: 'Reem Bin Hussain',
  titleEn: 'HR Manager',
  consultantTitleEn: 'International HR & Talent Acquisition Consultant',
  email: 'HR@kas.sa',
  mobile: '+966 553452122',
  defaultCc: ['Khalid@kas.sa'],
  groupNameAr: 'مجموعة الخالد السليم',
  groupNameEn: 'KHALID AL-SULAIM TRADING GROUP',
  groupBannerText: 'مجموعة الخالد السليم — KHALID AL-SULAIM TRADING GROUP',
};

export const KAS_GROUP_LOGO_CID = 'kas-group-logo@kas.sa';

/**
 * Official Khalid Al-Sulaim Trading Group PNG Logo (public/logos/khalid-alsulaim-trading-group.png)
 * Exact Base64 payload used for rich HTML clipboard/preview and inline CID MIME attachment in Outlook .eml.
 */
export const KAS_TRADING_GROUP_LOGO_BASE64: string = [
  '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',
].join('');

export const KAS_TRADING_GROUP_LOGO_DATA_URI = `data:image/png;base64,${KAS_TRADING_GROUP_LOGO_BASE64}`;

export interface ReemEmailAttachment {
  fileName: string;
  mimeType: string;
  base64Content: string; // raw base64 without data:...;base64, prefix
  sizeBytes: number;
}

export interface ReemHrTemplateContext {
  recipientNameAr?: string;
  recipientNameEn?: string;
  customBodyAr?: string;
  customBodyEn?: string;
  customDetailsAr?: string;
  customDetailsEn?: string;
  referenceUrl?: string;
}

export interface ReemHrEmailTemplate {
  id: ReemHrTemplateId;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  defaultSubjectEn: string;
  defaultSubjectAr: string;
  buildArabicParagraphs: (ctx?: ReemHrTemplateContext) => string[];
  buildEnglishParagraphs: (ctx?: ReemHrTemplateContext) => string[];
}

export const REEM_HR_EMAIL_TEMPLATES: ReemHrEmailTemplate[] = [
  // 1. Custom Official HR Correspondence (Free Editing inside Official Bilingual Frame)
  {
    id: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
    categoryAr: 'مراسلة رسمية مخصصة (تحرير حر)',
    categoryEn: 'Custom Official Correspondence',
    titleAr: 'خطاب / مراسلة رسمية مخصصة (تحرير حر بالقالب المعتمد)',
    titleEn: 'Custom Official HR Correspondence (Structured Bilingual Frame)',
    defaultSubjectEn: 'Official Human Resources Correspondence - Khalid Al-Sulaim Group',
    defaultSubjectAr: 'مراسلة رسمية صادرة عن إدارة الموارد البشرية — مجموعة الخالد السليم',
    buildArabicParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'تهديكم إدارة الموارد البشرية في مجموعة الخالد السليم أطيب التحيات، ونود إحاطتكم بمضمون هذه المراسلة الرسمية لاتخاذ ما يلزم وفق الضوابط والإجراءات الإدارية المعتمدة.',
        '• الموضوع والبيان الإداري: يرجى الاطلاع على التفاصيل الموضحة في هذه المراسلة واستكمال الإجراء المطلوب ضمن المهلة المحددة.',
        '• التنسيق والمتابعة: في حال وجود أي استفسار أو مستندات ذات صلة، يرجى الرد المباشر عبر البريد الرسمي لإدارة الموارد البشرية HR@kas.sa.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(ctx.customDetailsAr.trim());
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'The Human Resources Department at Khalid Al-Sulaim Trading Group extends its best regards and shares this official correspondence for your review and necessary action in accordance with approved corporate procedures.',
        '• Subject & Operational Summary: Kindly review the details outlined in this message and complete any required action within the designated timeframe.',
        '• Coordination & Follow-up: For any inquiries or supporting documentation, please reply directly to the official Human Resources email HR@kas.sa.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(ctx.customDetailsEn.trim());
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Reference Details: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 2. Employment Transaction & HR Decision
  {
    id: 'EMPLOYMENT_TRANSACTION_DECISION',
    categoryAr: 'المعاملات الوظيفية',
    categoryEn: 'Employment Transactions',
    titleAr: 'قرار إداري واعتماد معاملة وظيفية رسمية',
    titleEn: 'Official Employment Transaction & HR Decision',
    defaultSubjectEn: 'Official Employment Transaction Decision and HR Approval',
    defaultSubjectAr: 'اعتماد قرار ومعاملة وظيفية رسمية — إدارة الموارد البشرية',
    buildArabicParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameAr?.trim() || 'الموظف المختص';
      const paragraphs: string[] = [
        `إشارةً إلى المعاملة الوظيفية المرفوعة لإدارة الموارد البشرية بشأن (${target})، نفيدكم بصدور الاعتماد الإداري الرسمي وتوثيق القرار في السجل الوظيفي الموحد للمجموعة وفق لوائح نظام العمل السعودي.`,
        '• نوع الإجراء المعتمد: قرار إداري لمعاملة وظيفية (تعديل تعاقدي / ترقية / إجازة / تمديد فترة تجربة وفق المادة 53).',
        '• الأثر المالي والإداري: يُعمل بهذا القرار اعتباراً من تاريخ سريانه الموضح أدناه، وتُحتسب أي فروقات أو بدلات مالية بالعملة الرسمية المعتمدة (\u20C1) ضمن مسير الرواتب.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`تفاصيل القرار المعتمدة: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameEn?.trim() || ctx.recipientNameAr?.trim() || 'Concerned Employee';
      const paragraphs: string[] = [
        `Further to the employment transaction submitted to the Human Resources Department regarding (${target}), please be informed that the official HR decision has been approved and archived in the Group HR Registry in accordance with Saudi Labor Law.`,
        '• Approved Action: Official Employment Transaction Decision (Contract Amendment / Promotion / Leave / Probation Extension under Art. 53).',
        '• Administrative & Financial Effect: Effective from the designated date, with any applicable financial entitlements settled in Saudi Riyals (\u20C1) via official payroll.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Approved Decision Details: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Reference Details: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 3. Administrative Warning & Disciplinary Notice (Saudi Labor Law Art. 71)
  {
    id: 'ADMINISTRATIVE_WARNING_ART71',
    categoryAr: 'الإجراءات الإدارية والجزاءات',
    categoryEn: 'Administrative Procedures & Disciplinary',
    titleAr: 'إشعار إجراء إداري وإنذار رسمي (المادة 71 من نظام العمل)',
    titleEn: 'Official Administrative Warning & Disciplinary Notice (Art. 71)',
    defaultSubjectEn: 'Official Administrative Notice and Disciplinary Action (Labor Law Art. 71)',
    defaultSubjectAr: 'إشعار إجراء إداري وإنذار رسمي وفق المادة (71) من نظام العمل',
    buildArabicParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameAr?.trim() || 'الموظف المعني';
      const paragraphs: string[] = [
        `استناداً إلى صلاحيات إدارة الموارد البشرية وأحكام المواد (66 إلى 72) من نظام العمل السعودي ولائحة تنظيم العمل المعتمدة في مجموعة الخالد السليم، يوجه هذا الإشعار الإداري الرسمي إلى (${target}).`,
        '• السند النظامي والتحقيق (المادة 71): تم استيفاء إجراءات المساءلة وسماع الإفادة وتوثيق محضر التحقيق الرسمي قبل قيد الجزاء الإداري.',
        '• الضوابط المالية والنظامية (المادة 67): في حال تضمن القرار حسم أجر، لا يتجاوز الحسم أجر خمسة أيام في الشهر الواحد بالريال السعودي (\u20C1)، مع حفظ حق الاعتراض النظامي كتابياً عبر البريد الرسمي HR@kas.sa.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`بيان المخالفة والقرار التأديبي المعتمد: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameEn?.trim() || ctx.recipientNameAr?.trim() || 'Concerned Employee';
      const paragraphs: string[] = [
        `Pursuant to Articles 66 through 72 of the Saudi Labor Law and the approved Internal Work Regulations of Khalid Al-Sulaim Trading Group, this official administrative notice is formally issued to (${target}).`,
        '• Statutory Due Process (Article 71): Formal investigation procedures and right-of-defense minutes have been completed and documented prior to recording this disciplinary measure.',
        '• Statutory Deduction Cap (Article 67): Where wage deduction applies, deductions strictly adhere to the maximum five-day monthly cap (\u20C1), preserving the right to submit written feedback to HR@kas.sa.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Recorded Violation & Disciplinary Decision: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Official Record Summary: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 4. Proactive Compliance & Statutory Renewal Alert
  {
    id: 'PROACTIVE_COMPLIANCE_ALERT',
    categoryAr: 'الامتثال الحكومي والوثائق',
    categoryEn: 'Proactive HR & Statutory Compliance',
    titleAr: 'تنبيه استباقي لتجديد الوثائق والامتثال النظامي (قوى • مقيم • التأمين)',
    titleEn: 'Proactive HR Compliance & Statutory Document Renewal Alert',
    defaultSubjectEn: 'Urgent Proactive HR Compliance and Document Renewal Notice',
    defaultSubjectAr: 'تنبيه استباقي عاجل: تحديث الوثائق النظامية والامتثال عبر قوى ومقيم',
    buildArabicParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameAr?.trim() || 'الزميل / القسم المعني';
      const paragraphs: string[] = [
        `في إطار الرقابة الاستباقية لإدارة الموارد البشرية لضمان استمرارية الامتثال النظامي بنسبة 100% لكافة منشآت مجموعة الخالد السليم، نود تنبيه (${target}) بقرب استحقاق إجراء نظامي عاجل يتطلب المعالجة الفورية.`,
        '• نطاق التنبيه الرقابي: تحديث وتجديد الوثائق الثبوتية (هوية مقيم / جواز السفر / توثيق عقود قوى / وثيقة التأمين الطبي CCHI / فترة التجربة م53 / اعتماد طلبات SLA).',
        '• الإجراء المطلوب: يرجى تزويد إدارة الموارد البشرية بالمستندات المحدثة أو تأكيد الإجراء عبر الرد المباشر على هذا البريد الرسمي خلال (48) ساعة عمل لتفادي أي إيقاف للخدمات الحكومية.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`بيانات التنبيه والاستحقاق الفعلي: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameEn?.trim() || ctx.recipientNameAr?.trim() || 'Colleague / Department';
      const paragraphs: string[] = [
        `As part of the Human Resources Department's proactive statutory governance across Khalid Al-Sulaim Trading Group, please be advised that an upcoming compliance milestone concerning (${target}) requires immediate action.`,
        '• Compliance Scope: Statutory document validity & portal synchronization (Muqeem Iqama / Passport / Qiwa Contract / CCHI Medical Insurance / Art. 53 Probation / Approval SLA).',
        '• Required Action: Kindly submit the updated documents or confirmation by replying directly to HR@kas.sa within 48 business hours to maintain uninterrupted government portal eligibility.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Compliance Alert Specifics: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Alert Reference Details: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 5. Onboarding Welcome Package
  {
    id: 'ONBOARDING_WELCOME_PACKAGE',
    categoryAr: 'التعيين والمباشرة',
    categoryEn: 'Onboarding & Talent Integration',
    titleAr: 'ترحيب انضمام ومباشرة عمل جديدة في المجموعة',
    titleEn: 'Official Onboarding Welcome & Work Commencement Notice',
    defaultSubjectEn: 'Welcome to Khalid Al-Sulaim Trading Group - Official Onboarding and Work Commencement',
    defaultSubjectAr: 'مرحباً بانضمامكم إلى مجموعة الخالد السليم — اعتماد المباشرة وخطة التأهيل الوظيفي',
    buildArabicParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameAr?.trim() || 'الزميل الجديد';
      const paragraphs: string[] = [
        `يسر إدارة الموارد البشرية الترحيب بانضمام (${target}) إلى فريق العمل في مجموعة الخالد السليم، متمنين لكم مسيرة مهنية حافلة بالعطاء والنجاح والتميز المؤسسي.`,
        'يرجى استكمال متطلبات المباشرة والتأهيل المؤسسي (خطة 30 / 60 / 90 يوماً) وفق الضوابط التالية:',
        '• توثيق العقد والتأمينات: قبول العقد الموحد عبر منصة (قوى) والتحقق من التسجيل في التأمينات الاجتماعية (GOSI) والتأمين الطبي.',
        '• الحضور والهوية المؤسسية: استلام بيانات الدخول لبوابة الخدمة الذاتية (@kas.sa) واعتماد البصمة الجغرافية للحضور والانصراف.',
        '• اللوائح والسياسات التنظيمية: الاطلاع على لائحة تنظيم العمل المعتمدة وضوابط السلوك الوظيفي والالتزام بها.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`بيانات المباشرة والتعيين: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const target = ctx.recipientNameEn?.trim() || ctx.recipientNameAr?.trim() || 'New Colleague';
      const paragraphs: string[] = [
        `The Human Resources Department is delighted to welcome (${target}) to Khalid Al-Sulaim Trading Group, wishing you a rewarding and successful career with our organization.`,
        'Kindly complete your onboarding milestones (30 / 60 / 90-Day Plan) according to the following guidelines:',
        '• Qiwa & GOSI Registration: Confirm your authenticated employment contract on Qiwa and verify GOSI & medical insurance enrollment.',
        '• Employee Portal & Attendance: Access your corporate self-service profile (@kas.sa) and register for geo-verified attendance check-in.',
        '• Corporate Policies & Regulations: Review and adhere to the approved Internal Work Regulations and Code of Conduct.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Onboarding Assignment Details: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Onboarding Reference: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 6. Interdepartmental Work Task Assignment
  {
    id: 'INTERDEPARTMENTAL_WORK_TASK',
    categoryAr: 'مهام العمل بين الأقسام',
    categoryEn: 'Interdepartmental Work Tasks',
    titleAr: 'تكليف مهمة عمل رسمية وتنسيق مشترك بين الأقسام',
    titleEn: 'Official Interdepartmental Work Task & Deliverable Assignment',
    defaultSubjectEn: 'Official Interdepartmental Work Task Assignment and Deliverables',
    defaultSubjectAr: 'تكليف مهمة عمل رسمية وتبادل الملفات المعتمدة بين الأقسام',
    buildArabicParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'عملاً بآلية التواصل الرسمي المعتمدة بين إدارات وأقسام مجموعة الخالد السليم، نحيل إليكم مهمة العمل الموضحة أدناه لاستكمال الإجراءات اللازمة وإرسال المخرجات والملفات المطلوبة عبر البريد الرسمي (@kas.sa).',
        '• ضوابط التسليم والمتابعة: الالتزام بالمهلة الزمنية المحددة، وإرفاق التقارير بصيغها الرسمية المعتمدة مع إبقاء الإدارة في نسخة البريد (CC).',
        '• التنسيق والتوثيق المؤسسي: توثيق كافة المخرجات والبيانات الرسمية وإشعار الإدارة المعنية فور إتمام المهمة.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`نطاق المهمة والمطلوب تنفيذه: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'In accordance with the approved interdepartmental communication protocol at Khalid Al-Sulaim Trading Group, please find the assigned work task below for execution and formal file submission via (@kas.sa).',
        '• Submission & Follow-up Standards: Adhere to the designated timeline and attach verified deliverables while keeping executive management copied (CC).',
        '• Institutional Coordination & Documentation: Document all official outputs and notify the concerned department upon task completion.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Task Scope & Required Deliverables: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Assigned Task Summary: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 7. Payroll WPS & Payslip Official Notice
  {
    id: 'PAYROLL_WPS_PAYSLIP_NOTICE',
    categoryAr: 'الرواتب وحماية الأجور WPS',
    categoryEn: 'WPS Payroll & Compensation',
    titleAr: 'إشعار صرف مسير الرواتب الشهري وكشف الاستحقاقات (مدد WPS)',
    titleEn: 'Monthly WPS Payroll Disbursement & Official Payslip Notice',
    defaultSubjectEn: 'Monthly WPS Salary Disbursement and Official Payslip Notification',
    defaultSubjectAr: 'إشعار إيداع مسير الرواتب الشهري المعتمد عبر نظام حماية الأجور (WPS)',
    buildArabicParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'تود إدارة الموارد البشرية بالتنسيق مع الإدارة المالية إبلاغكم باعتماد وصرف مسير الرواتب والأجور الشهري عبر نظام حماية الأجور (مدد WPS) وإيداع صافي المستحقات في الحسابات البنكية المعتمدة (IBAN) بالريال السعودي (\u20C1).',
        '• تفاصيل الاستحقاق والالتزام: يشمل المسير الراتب الأساسي، بدل السكن، بدل النقل، تسويات العمل الإضافي، واستقطاعات التأمينات الاجتماعية (GOSI) والسلف المعتمدة وفق السجلات الفعلية.',
        '• المراجعة والملاحظات: يمكنكم الاطلاع على قسيمة الراتب التفصيلية عبر بوابة الموظف، وفي حال وجود أي استفسار يرجى مراسلة HR@kas.sa خلال (3) أيام عمل.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`بيانات المسير والفترة المالية: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'The Human Resources Department, in coordination with the Finance Department, is pleased to notify you that the monthly payroll run has been approved and disbursed via the Wage Protection System (Mudad WPS) to registered bank IBAN accounts in Saudi Riyals (\u20C1).',
        '• Compensation Breakdown: Reflects basic salary, housing allowance, transport allowance, verified overtime, GOSI statutory contributions, and approved deductions.',
        '• Payslip Inquiries: Detailed payslips are available on your Employee Portal. For any inquiries, please contact HR@kas.sa within (3) business days.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Payroll Period & Reference Notes: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Payroll Reference: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },

  // 8. General HR Policy & Organizational Circular
  {
    id: 'GENERAL_HR_CIRCULAR',
    categoryAr: 'التعاميم والسياسات الداخلية',
    categoryEn: 'General HR Policies & Circulars',
    titleAr: 'تعميم إداري تنظيمي عام لمنسوبي المجموعة',
    titleEn: 'General Human Resources Organizational Policy Circular',
    defaultSubjectEn: 'Official Human Resources Policy and Organizational Circular',
    defaultSubjectAr: 'تعميم إداري تنظيمي صادر عن إدارة الموارد البشرية — مجموعة الخالد السليم',
    buildArabicParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'تهديكم إدارة الموارد البشرية في مجموعة الخالد السليم أطيب التحيات، وتود إحاطة كافة الزميلات والزملاء في جميع الإدارات والفروع بالتنظيم الإداري المعتمد أدناه لتعزيز كفاءة العمل والانضباط المؤسسي.',
        '• نطاق السريان: يسري هذا التعميم على كافة منسوبي شركات وفروع المجموعة، ويُعد مرجعاً تنظيمياً واجب الاتباع اعتباراً من تاريخ صدوره.',
        '• التواصل والاستفسارات: تُستقبل كافة الاستفسارات والملاحظات المتعلقة بتطبيق هذا التعميم عبر البريد الإلكتروني الرسمي لإدارة الموارد البشرية HR@kas.sa.',
      ];
      if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`نص التعميم والضوابط المعتمدة: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`الرابط المرجعي المرفق: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
    buildEnglishParagraphs: (ctx = {}) => {
      const paragraphs: string[] = [
        'The Human Resources Department at Khalid Al-Sulaim Trading Group extends its best regards to all colleagues across all departments and branches, and announces the following organizational directive to enhance operational excellence and governance.',
        '• Effective Scope: This circular applies across all Group entities and branches effective immediately upon issuance.',
        '• Official Inquiries: Any questions regarding implementation should be directed exclusively to the official HR email address HR@kas.sa.',
      ];
      if (ctx.customDetailsEn?.trim()) {
        paragraphs.push(`Official Circular Directive: ${ctx.customDetailsEn.trim()}`);
      } else if (ctx.customDetailsAr?.trim()) {
        paragraphs.push(`Directive Summary: ${ctx.customDetailsAr.trim()}`);
      }
      if (ctx.referenceUrl?.trim()) {
        paragraphs.push(`Reference Link: ${ctx.referenceUrl.trim()}`);
      }
      return paragraphs;
    },
  },
];

export function getReemHrTemplateById(
  templateId: ReemHrTemplateId | string
): ReemHrEmailTemplate {
  return (
    REEM_HR_EMAIL_TEMPLATES.find((tpl) => tpl.id === templateId) ||
    REEM_HR_EMAIL_TEMPLATES[0]
  );
}

/**
 * Returns default editable multi-line Arabic & English message bodies for a given template,
 * suitable for initializing or resetting the Studio's bilingual free-text editors.
 */
export function getReemTemplateDefaultEditableBodies(
  templateId: ReemHrTemplateId | string,
  ctx?: ReemHrTemplateContext
): { bodyAr: string; bodyEn: string } {
  const template = getReemHrTemplateById(templateId);
  return {
    bodyAr: template.buildArabicParagraphs(ctx).join('\n'),
    bodyEn: template.buildEnglishParagraphs(ctx).join('\n'),
  };
}

const EXCLUDED_LOWERCASE_EMAILS = new Set(
  Object.keys(EXCLUDED_KAS_EMAILS).map((email) => email.trim().toLowerCase())
);

export function isExcludedKasEmailAddress(email: string): boolean {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return true;
  return EXCLUDED_LOWERCASE_EMAILS.has(clean);
}

export interface ResolveKasRecipientsFilter {
  departmentId?: string;
  companyId?: string;
  emails?: string[];
  searchQuery?: string;
}

/**
 * Resolves valid corporate recipients from KAS_ALLOWED_EMPLOYEES (@kas.sa)
 * while strictly excluding any email listed in EXCLUDED_KAS_EMAILS.
 */
export function resolveKasRecipients(filter?: ResolveKasRecipientsFilter): KasAllowedEmployee[] {
  let list = KAS_ALLOWED_EMPLOYEES.filter(
    (emp) => !isExcludedKasEmailAddress(emp.email)
  );

  if (!filter) {
    return list;
  }

  if (filter.departmentId && filter.departmentId !== 'all') {
    const targetDept = filter.departmentId.trim().toLowerCase();
    list = list.filter(
      (emp) =>
        emp.department_id.toLowerCase() === targetDept ||
        Boolean(emp.extraAllowedDepartments?.some((d) => d.toLowerCase() === targetDept))
    );
  }

  if (filter.companyId && filter.companyId !== 'all') {
    const targetComp = filter.companyId.trim().toUpperCase();
    list = list.filter(
      (emp) => emp.company_id.toUpperCase() === targetComp || emp.company_id === 'all'
    );
  }

  if (Array.isArray(filter.emails) && filter.emails.length > 0) {
    const requestedSet = new Set(
      filter.emails
        .map((e) => (e || '').trim().toLowerCase())
        .filter((e) => e.length > 0 && !isExcludedKasEmailAddress(e))
    );
    list = list.filter((emp) => requestedSet.has(emp.email.trim().toLowerCase()));
  }

  if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
    const q = filter.searchQuery.trim().toLowerCase();
    list = list.filter(
      (emp) =>
        emp.email.toLowerCase().includes(q) ||
        emp.nameAr.toLowerCase().includes(q) ||
        emp.nameEn.toLowerCase().includes(q) ||
        emp.titleAr.toLowerCase().includes(q)
    );
  }

  return list;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCorporateEmailCasing(rawEmail: string): string {
  const trimmed = rawEmail.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'khalid@kas.sa') return 'Khalid@kas.sa';
  if (lower === 'hr@kas.sa') return 'HR@kas.sa';
  return trimmed;
}

function sanitizeEmailArray(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    const trimmed = (raw || '').trim();
    if (!trimmed || !trimmed.includes('@')) continue;
    if (isExcludedKasEmailAddress(trimmed)) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(normalizeCorporateEmailCasing(trimmed));
  }
  return result;
}

/**
 * Encodes any UTF-8 string (including Arabic + SAMA Riyal symbol ⃁) into RFC 2045 Base64.
 */
export function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decodes RFC 2045 Base64 back into a UTF-8 string.
 */
export function decodeUtf8Base64(base64: string): string {
  const cleaned = base64.replace(/[\r\n\s]+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function wrapBase64MimeLines(base64: string, maxLen = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += maxLen) {
    lines.push(base64.slice(i, i + maxLen));
  }
  return lines.join('\r\n');
}

/**
 * Encodes a UTF-8 string into RFC 2045 Quoted-Printable format (<= 76 chars per line),
 * keeping ASCII tags and CID attributes intact while encoding UTF-8 Arabic & SAMA Riyal (⃁) bytes.
 */
export function encodeUtf8QuotedPrintable(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const outputLines: string[] = [];

  for (const rawLine of rawLines) {
    const bytes = new TextEncoder().encode(rawLine);
    const tokens: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      const isLastByte = i === bytes.length - 1;
      if ((b === 32 || b === 9) && !isLastByte) {
        tokens.push(String.fromCharCode(b));
      } else if (b >= 33 && b <= 126 && b !== 61) {
        tokens.push(String.fromCharCode(b));
      } else {
        tokens.push('=' + b.toString(16).toUpperCase().padStart(2, '0'));
      }
    }

    let current = '';
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const isLastTok = i === tokens.length - 1;
      const maxAllowed = isLastTok ? 76 : 75;

      if (current.length + tok.length > maxAllowed) {
        const lastSpace = current.lastIndexOf(' ');
        if (lastSpace > 16 && current.length - lastSpace + tok.length <= 75) {
          outputLines.push(current.slice(0, lastSpace) + '=');
          current = current.slice(lastSpace) + tok;
        } else {
          outputLines.push(current + '=');
          current = tok;
        }
      } else {
        current += tok;
      }
    }
    outputLines.push(current);
  }

  return outputLines.join('\r\n');
}

/**
 * Decodes an RFC 2045 Quoted-Printable string back into UTF-8 text.
 */
export function decodeUtf8QuotedPrintable(qp: string): string {
  const unwrapped = qp.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < unwrapped.length; i++) {
    const ch = unwrapped[i];
    if (ch === '=' && i + 2 < unwrapped.length) {
      const hex = unwrapped.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(unwrapped.charCodeAt(i));
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

/**
 * Builds Ms. Reem Bin Hussain's exact official Microsoft Outlook signature block:
 * - Left-aligned dir="ltr" table with official Khalid Al-Sulaim Trading Group PNG logo (135px)
 * - Exact 4-line serif typography ('Times New Roman', Times, Georgia, serif; 14.5px; line-height 1.75; #141414)
 */
export function enforceLtrPlainLine(line: string): string {
  const clean = line.replace(/^[\u200E\u200F]+|[\u200E\u200F]+$/g, '').trim();
  if (!clean) return '';
  return `\u200E${clean}\u200E`;
}

export function formatOfficialSalutationAr(rawNameAr?: string): string {
  const trimmed = (rawNameAr || '').trim().replace(/[،,:]+$/, '').trim();
  if (!trimmed) {
    return 'الزميلات والزملاء الكرام في جميع الأقسام،';
  }
  if (
    /^(الزميلات|الزملاء|السادة|الأستاذ|الأستاذة|سعادة|المكرم|المكرمة|فريق|إدارة|منسوبي)/.test(
      trimmed
    ) ||
    /(الكرام|المحترمين|المحترمات|المحترم\/ة|المحترم|المحترمة)$/.test(trimmed)
  ) {
    return `${trimmed}،`;
  }
  return `الأستاذ / الأستاذة ${trimmed} المحترم/ة،`;
}

export function formatOfficialSalutationEn(rawNameEn?: string): string {
  const trimmed = (rawNameEn || '')
    .replace(/[\u200E\u200F]/g, '')
    .trim()
    .replace(/[,:]+$/, '')
    .trim();
  if (!trimmed) {
    return 'Dear colleagues across all departments,';
  }
  const withoutLeadingDear = trimmed.replace(/^dear\s+/i, '').trim();
  return `Dear ${withoutLeadingDear || 'colleagues across all departments'},`;
}

/**
 * Official plain-text 4-line signature block for Ms. Reem Bin Hussain (HR@kas.sa)
 * Used across RFC 5322 text/plain parts, Outlook Web deeplinks, mailto: links, and HR notifications.
 * Each line is wrapped with Unicode LRM (\u200E) so Arabic Outlook Desktop renders punctuation and +966 strictly LTR.
 */
export const REEM_HR_PLAIN_SIGNATURE_BLOCK: string = [
  enforceLtrPlainLine(REEM_HR_SIGNATORY.signatureNameEn),
  enforceLtrPlainLine(REEM_HR_SIGNATORY.consultantTitleEn),
  enforceLtrPlainLine(`Email: ${REEM_HR_SIGNATORY.email}`),
  enforceLtrPlainLine(`Mobile: ${REEM_HR_SIGNATORY.mobile}`),
].join('\r\n');

/**
 * Builds Ms. Reem Bin Hussain's exact official Microsoft Outlook signature block:
 * - Left-aligned dir="ltr" table with official Khalid Al-Sulaim Trading Group PNG logo (135px)
 * - Exact 4-line serif typography ('Times New Roman', Times, Georgia, serif; 14.5px; line-height 1.75; #141414)
 */
export function buildReemSignatureBlockHtml(
  logoSrc: string = KAS_TRADING_GROUP_LOGO_DATA_URI
): string {
  const serifLineStyle =
    "margin:0;font-family:'Times New Roman', Times, Georgia, serif;font-size:14.5px;line-height:1.75;color:#141414;text-align:left;direction:ltr;";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="ltr" align="left" style="border-collapse:collapse;width:100%;text-align:left;direction:ltr;background-color:#FFFFFF;">
  <tr>
    <td align="left" dir="ltr" style="padding:0;text-align:left;direction:ltr;background-color:#FFFFFF;">
      <img src="${logoSrc}" alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP" width="135" style="display:block;width:135px;height:auto;border:0;margin:0 0 12px 0;" />
    </td>
  </tr>
  <tr>
    <td align="left" dir="ltr" style="padding:0;text-align:left;direction:ltr;font-family:'Times New Roman', Times, Georgia, serif;font-size:14.5px;line-height:1.75;color:#141414;background-color:#FFFFFF;">
      <div dir="ltr" align="left" style="${serifLineStyle}">${escapeHtml(REEM_HR_SIGNATORY.signatureNameEn)}</div>
      <div dir="ltr" align="left" style="${serifLineStyle}">${escapeHtml(REEM_HR_SIGNATORY.consultantTitleEn)}</div>
      <div dir="ltr" align="left" style="${serifLineStyle}">Email: ${escapeHtml(REEM_HR_SIGNATORY.email)}</div>
      <div dir="ltr" align="left" style="${serifLineStyle}">Mobile: ${escapeHtml(REEM_HR_SIGNATORY.mobile)}</div>
    </td>
  </tr>
</table>`;
}

function normalizeReemAttachments(attachments?: ReemEmailAttachment[]): ReemEmailAttachment[] {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }
  const normalized: ReemEmailAttachment[] = [];
  for (const raw of attachments) {
    if (!raw || typeof raw.fileName !== 'string' || typeof raw.base64Content !== 'string') {
      continue;
    }
    const fileName = raw.fileName.trim();
    const cleanBase64 = raw.base64Content
      .replace(/^data:[^;]*;base64,/i, '')
      .replace(/[\r\n\s]+/g, '');
    if (!fileName || !cleanBase64) {
      continue;
    }
    const safeMimeType =
      (raw.mimeType || '').trim().replace(/[\r\n";]/g, '') || 'application/octet-stream';
    const sizeBytes =
      typeof raw.sizeBytes === 'number' && Number.isFinite(raw.sizeBytes) && raw.sizeBytes >= 0
        ? raw.sizeBytes
        : Math.floor((cleanBase64.length * 3) / 4);
    normalized.push({
      fileName,
      mimeType: safeMimeType,
      base64Content: cleanBase64,
      sizeBytes,
    });
  }
  return normalized;
}

function renderParagraphHtml(p: string, dir: 'rtl' | 'ltr', referenceUrl?: string): string {
  const trimmed = p.replace(/^[\u200E\u200F]+|[\u200E\u200F]+$/g, '').trim();
  const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
  const cleanUrl = referenceUrl?.trim();
  const alignAttr = dir === 'rtl' ? 'right' : 'left';
  const dirStyle = `text-align:${alignAttr};direction:${dir};`;

  let escaped = escapeHtml(trimmed);
  if (cleanUrl && trimmed.includes(cleanUrl)) {
    const escapedUrl = escapeHtml(cleanUrl);
    escaped = escaped.replace(
      escapedUrl,
      `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" style="color:#141414;font-weight:700;text-decoration:underline;">${escapedUrl}</a>`
    );
  }

  // Highlight colon-prefixed bullet titles (e.g. "• الموضوع والبيان الإداري: ...")
  if (isBullet) {
    const withoutBullet = escaped.replace(/^[•-]\s*/, '');
    const colonIdx = withoutBullet.indexOf(':');
    const formattedBullet =
      colonIdx > 0 && colonIdx < 72 && withoutBullet.slice(colonIdx, colonIdx + 3) !== '://'
        ? `<strong>${withoutBullet.slice(0, colonIdx + 1)}</strong>${withoutBullet.slice(colonIdx + 1)}`
        : withoutBullet;

    return `<div dir="${dir}" align="${alignAttr}" style="margin:6px 0;padding-${dir === 'rtl' ? 'right' : 'left'}:14px;line-height:1.75;color:#141414;${dirStyle}">&#8226; ${formattedBullet}</div>`;
  }

  return `<p dir="${dir}" align="${alignAttr}" style="margin:0 0 12px 0;line-height:1.8;color:#141414;${dirStyle}">${escaped}</p>`;
}

export interface GenerateOutlookDraftEmlInput {
  templateId: ReemHrTemplateId | string;
  subject: string;
  toEmails: string[];
  ccEmails: string[];
  plainTextBody: string;
  cidHtmlBody: string;
  attachments?: ReemEmailAttachment[];
  omitUnsentHeader?: boolean;
  messageId?: string;
}

/**
 * Generates an RFC 5322 / RFC 2387 Microsoft Outlook Draft (.eml) with:
 * - X-Unsent: 1 (opens directly in Outlook Desktop composer)
 * - From: "Reem Bin Hussain - HR" <HR@kas.sa> and Cc: Khalid@kas.sa
 * - multipart/related wrapping multipart/alternative (text/plain + text/html referencing src="cid:kas-group-logo@kas.sa")
 * - Inline image/png MIME attachment (<kas-group-logo@kas.sa>) so Outlook renders the crisp official logo natively
 * - Optional multipart/mixed outer envelope when 1+ real file attachments are provided.
 */
export function generateOutlookDraftEmlFile(input: GenerateOutlookDraftEmlInput): string {
  const mixedBoundary = `----=_NextPart_Mixed_KAS_HR_${input.templateId}_2026`;
  const relatedBoundary = `----=_NextPart_Related_KAS_HR_${input.templateId}_2026`;
  const altBoundary = `----=_NextPart_Alt_KAS_HR_${input.templateId}_2026`;
  const normalizedAttachments = normalizeReemAttachments(input.attachments);
  const encodedSubject = `=?UTF-8?B?${encodeUtf8Base64(input.subject)}?=`;
  const fullHtmlDocument = `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:20px;background-color:#FFFFFF;">
${input.cidHtmlBody}
</body>
</html>`;

  const relatedBlockLines: string[] = [
    `Content-Type: multipart/related; type="multipart/alternative"; boundary="${relatedBoundary}"`,
    '',
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64MimeLines(encodeUtf8Base64(input.plainTextBody)),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    encodeUtf8QuotedPrintable(fullHtmlDocument),
    '',
    `--${altBoundary}--`,
    '',
    `--${relatedBoundary}`,
    'Content-Type: image/png; name="khalid-alsulaim-trading-group.png"',
    'Content-Transfer-Encoding: base64',
    `Content-ID: <${KAS_GROUP_LOGO_CID}>`,
    'Content-Disposition: inline; filename="khalid-alsulaim-trading-group.png"',
    '',
    wrapBase64MimeLines(KAS_TRADING_GROUP_LOGO_BASE64),
    '',
    `--${relatedBoundary}--`,
  ];

  const emlLines: string[] = [];
  if (!input.omitUnsentHeader) {
    emlLines.push('X-Unsent: 1');
  }
  emlLines.push(
    `From: "${REEM_HR_SIGNATORY.signatureNameEn} - HR" <${REEM_HR_SIGNATORY.email}>`,
    `Reply-To: "${REEM_HR_SIGNATORY.signatureNameEn} - HR" <${REEM_HR_SIGNATORY.email}>`,
    `To: ${input.toEmails.join(', ')}`
  );
  if (input.ccEmails.length > 0) {
    emlLines.push(`Cc: ${input.ccEmails.join(', ')}`);
  }
  const cleanMessageId = input.messageId ? input.messageId.replace(/[<>]/g, '').trim() : '';
  emlLines.push(
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    ...(cleanMessageId ? [`Message-ID: <${cleanMessageId}>`] : []),
    'MIME-Version: 1.0'
  );

  if (normalizedAttachments.length === 0) {
    emlLines.push(...relatedBlockLines, '');
    return emlLines.join('\r\n');
  }

  emlLines.push(
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    ...relatedBlockLines
  );

  for (const att of normalizedAttachments) {
    const encodedFileName = `=?UTF-8?B?${encodeUtf8Base64(att.fileName)}?=`;
    emlLines.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${att.mimeType || 'application/octet-stream'}; name="${encodedFileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${encodedFileName}"`,
      '',
      wrapBase64MimeLines(att.base64Content)
    );
  }

  emlLines.push('', `--${mixedBoundary}--`, '');
  return emlLines.join('\r\n');
}

/**
 * Generates a live RFC 5322 / RFC 2387 MIME message ready for direct SMTP transport
 * (omits X-Unsent: 1 draft flag and guarantees a Message-ID header).
 */
export function generateLiveSmtpMimeMessage(
  input: Omit<GenerateOutlookDraftEmlInput, 'omitUnsentHeader'>
): string {
  const fallbackId = `hr-kas-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@kas.sa`;
  return generateOutlookDraftEmlFile({
    ...input,
    omitUnsentHeader: true,
    messageId: input.messageId || fallbackId,
  });
}

export interface ComposeReemHrEmailInput {
  templateId: ReemHrTemplateId | string;
  recipientEmails?: string[];
  ccEmails?: string[];
  recipientNameAr?: string;
  recipientNameEn?: string;
  customSubjectAr?: string;
  customSubjectEn?: string;
  customBodyAr?: string;
  customBodyEn?: string;
  customDetailsAr?: string;
  customDetailsEn?: string;
  referenceUrl?: string;
  attachments?: ReemEmailAttachment[];
  includeReemSignature?: boolean;
}

export interface ComposedReemHrEmail {
  templateId: ReemHrTemplateId;
  templateTitleAr: string;
  templateTitleEn: string;
  categoryAr: string;
  subject: string;
  subjectAr: string;
  subjectEn: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  attachments: ReemEmailAttachment[];
  attachmentFileName: string | null;
  htmlBody: string;
  cidHtmlBody: string;
  plainTextBody: string;
  emlContent: string;
  outlookWebUrl: string;
  mailtoUrl: string;
}

/**
 * Composes a complete bilingual (Arabic RTL + English LTR + Official Calligraphy Emblem Signature)
 * HR email from HR@kas.sa with valid RFC 5322 .eml draft, real MIME attachments, Outlook Web deeplink, and mailto URL.
 */
export function composeReemHrOfficialEmail(input: ComposeReemHrEmailInput): ComposedReemHrEmail {
  const template = getReemHrTemplateById(input.templateId);

  const subjectEn = (input.customSubjectEn || '').trim() || template.defaultSubjectEn;
  const subjectAr = (input.customSubjectAr || '').trim() || template.defaultSubjectAr;
  const subject = `${subjectEn} - ${subjectAr}`;

  const toEmails =
    input.recipientEmails !== undefined
      ? sanitizeEmailArray(input.recipientEmails)
      : resolveKasRecipients().map((emp) => normalizeCorporateEmailCasing(emp.email));

  const ccEmails =
    input.ccEmails !== undefined
      ? sanitizeEmailArray(input.ccEmails)
      : [...REEM_HR_SIGNATORY.defaultCc];

  const normalizedAttachments = normalizeReemAttachments(input.attachments);
  const attachmentFileName =
    normalizedAttachments.length > 0
      ? normalizedAttachments.map((att) => att.fileName).join(', ')
      : null;

  const cleanedRecEnForCtx = input.recipientNameEn
    ? input.recipientNameEn.replace(/^dear\s+/i, '').replace(/[,:]+$/, '').trim()
    : undefined;

  const ctx: ReemHrTemplateContext = {
    recipientNameAr: input.recipientNameAr,
    recipientNameEn: cleanedRecEnForCtx,
    customBodyAr: input.customBodyAr,
    customBodyEn: input.customBodyEn,
    customDetailsAr: input.customDetailsAr,
    customDetailsEn: input.customDetailsEn,
    referenceUrl: input.referenceUrl,
  };

  const salutationAr = formatOfficialSalutationAr(input.recipientNameAr);
  const salutationEn = formatOfficialSalutationEn(input.recipientNameEn);

  const trimmedCustomBodyAr = input.customBodyAr?.trim() || '';
  const trimmedCustomDetailsAr = input.customDetailsAr?.trim() || '';
  const cleanReferenceUrl = input.referenceUrl?.trim() || '';

  const paragraphsAr: string[] = trimmedCustomBodyAr
    ? [
        ...trimmedCustomBodyAr
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
        ...(trimmedCustomDetailsAr && !trimmedCustomBodyAr.includes(trimmedCustomDetailsAr)
          ? [trimmedCustomDetailsAr]
          : []),
        ...(cleanReferenceUrl &&
        !trimmedCustomBodyAr.includes(cleanReferenceUrl) &&
        !trimmedCustomDetailsAr.includes(cleanReferenceUrl)
          ? [`الرابط المرجعي المرفق: ${cleanReferenceUrl}`]
          : []),
      ]
    : template.buildArabicParagraphs(ctx);

  const trimmedCustomBodyEn = input.customBodyEn?.trim() || '';
  const trimmedCustomDetailsEn = input.customDetailsEn?.trim() || '';

  const paragraphsEn: string[] = trimmedCustomBodyEn
    ? [
        ...trimmedCustomBodyEn
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
        ...(trimmedCustomDetailsEn && !trimmedCustomBodyEn.includes(trimmedCustomDetailsEn)
          ? [trimmedCustomDetailsEn]
          : []),
        ...(cleanReferenceUrl &&
        !trimmedCustomBodyEn.includes(cleanReferenceUrl) &&
        !trimmedCustomDetailsEn.includes(cleanReferenceUrl)
          ? [`Reference Link: ${cleanReferenceUrl}`]
          : []),
      ]
    : template.buildEnglishParagraphs(ctx);

  const arParagraphsHtml = paragraphsAr
    .map((p) => renderParagraphHtml(p, 'rtl', input.referenceUrl))
    .join('\n');

  const enParagraphsHtml = paragraphsEn
    .map((p) => renderParagraphHtml(p, 'ltr', input.referenceUrl))
    .join('\n');

  const attachmentSummaryHtmlAr =
    normalizedAttachments.length > 0
      ? `<div style="margin:0 0 12px 0;padding:8px 12px;background-color:#F3F3F3;border:1px solid #E0E0E0;border-right:3px solid #141414;font-size:12.5px;font-weight:700;color:#141414;">المرفقات المرفقة مع الرسالة: ${escapeHtml(normalizedAttachments.map((att) => att.fileName).join(' ، '))}</div>`
      : '';

  const includeReemSig = input.includeReemSignature !== false;

  const renderEmailTableHtml = (logoSrc: string): string => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:760px;margin:0 auto;background-color:#FFFFFF;border:1.5px solid #141414;border-collapse:collapse;">
  <tr>
    <td dir="rtl" align="right" lang="ar" style="padding:24px 26px 20px 26px;text-align:right;direction:rtl;font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;font-size:14.5px;color:#141414;background-color:#FFFFFF;">
      <p dir="rtl" align="right" style="margin:0 0 6px 0;font-weight:800;font-size:15.5px;color:#141414;text-align:right;direction:rtl;">السلام عليكم ورحمة الله وبركاته</p>
      <p dir="rtl" align="right" style="margin:0 0 16px 0;font-weight:700;font-size:14.5px;color:#141414;text-align:right;direction:rtl;">${escapeHtml(salutationAr)}</p>
      ${attachmentSummaryHtmlAr}
      ${arParagraphsHtml}
      <div dir="rtl" align="right" style="margin-top:18px;padding-top:12px;border-top:1px solid #E0E0E0;text-align:right;direction:rtl;">
        <p dir="rtl" align="right" style="margin:0 0 6px 0;font-weight:600;color:#141414;text-align:right;direction:rtl;">شكرا لكم على حسن تعاونكم الدائم مع تمنياتنا للجميع بالتوفيق والنجاح ..</p>
        <p dir="rtl" align="right" style="margin:0 0 12px 0;font-weight:600;color:#141414;text-align:right;direction:rtl;">تفضلوا بقبول فائق الاحترام ..</p>
        ${
          includeReemSig
            ? `<p dir="rtl" align="right" style="margin:0;font-weight:800;font-size:15px;color:#141414;text-align:right;direction:rtl;">${escapeHtml(REEM_HR_SIGNATORY.nameAr)}</p>
        <p dir="rtl" align="right" style="margin:2px 0 0 0;font-weight:700;font-size:13.5px;color:#141414;text-align:right;direction:rtl;">${escapeHtml(REEM_HR_SIGNATORY.titleAr)}</p>`
            : `<p dir="rtl" align="right" style="margin:0;font-weight:800;font-size:14.5px;color:#141414;text-align:right;direction:rtl;">${escapeHtml(REEM_HR_SIGNATORY.departmentAr)}</p>`
        }
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 26px;background-color:#FFFFFF;">
      <div style="border-top:2px solid #141414;height:1px;line-height:1px;font-size:1px;">&nbsp;</div>
    </td>
  </tr>
  <tr>
    <td dir="ltr" align="left" lang="en" style="padding:20px 26px 22px 26px;text-align:left;direction:ltr;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:14px;color:#141414;background-color:#FFFFFF;">
      <p dir="ltr" align="left" style="margin:0 0 6px 0;font-weight:700;font-size:14.5px;color:#141414;text-align:left;direction:ltr;">Peace, mercy, and blessings of Allah be upon you.</p>
      <p dir="ltr" align="left" style="margin:0 0 16px 0;font-weight:700;font-size:14px;color:#141414;text-align:left;direction:ltr;">${escapeHtml(salutationEn)}</p>
      ${enParagraphsHtml}
      <div dir="ltr" align="left" style="margin-top:18px;padding-top:12px;border-top:1px solid #E0E0E0;text-align:left;direction:ltr;">
        <p dir="ltr" align="left" style="margin:0 0 6px 0;font-weight:600;color:#141414;text-align:left;direction:ltr;">Thank you for your continuous cooperation, wishing everyone success.</p>
        <p dir="ltr" align="left" style="margin:0 0 12px 0;font-weight:600;color:#141414;text-align:left;direction:ltr;">Please accept our utmost respect,</p>
        ${
          includeReemSig
            ? `<p dir="ltr" align="left" style="margin:0;font-weight:800;font-size:14.5px;color:#141414;text-align:left;direction:ltr;">${escapeHtml(REEM_HR_SIGNATORY.nameEn)}</p>
        <p dir="ltr" align="left" style="margin:2px 0 0 0;font-weight:700;font-size:13px;color:#141414;text-align:left;direction:ltr;">${escapeHtml(REEM_HR_SIGNATORY.titleEn)}</p>`
            : `<p dir="ltr" align="left" style="margin:0;font-weight:800;font-size:14px;color:#141414;text-align:left;direction:ltr;">Human Resources Department — ${escapeHtml(REEM_HR_SIGNATORY.groupNameEn)}</p>`
        }
      </div>
    </td>
  </tr>
  ${
    includeReemSig
      ? `<tr>
    <td dir="ltr" lang="en" align="left" style="padding:20px 26px 26px 26px;background-color:#FFFFFF;border-top:1px solid #E0E0E0;text-align:left;direction:ltr;">
      ${buildReemSignatureBlockHtml(logoSrc)}
    </td>
  </tr>`
      : ''
  }
</table>`;

  const htmlBody = renderEmailTableHtml(KAS_TRADING_GROUP_LOGO_DATA_URI);
  const cidHtmlBody = renderEmailTableHtml(`cid:${KAS_GROUP_LOGO_CID}`);

  const plainBodyBeforeSignatureLines: string[] = [
    'السلام عليكم ورحمة الله وبركاته',
    salutationAr,
    '',
    ...(normalizedAttachments.length > 0
      ? [`المرفقات المرفقة مع الرسالة: ${normalizedAttachments.map((att) => att.fileName).join(' ، ')}`, '']
      : []),
    ...paragraphsAr,
    '',
    'شكرا لكم على حسن تعاونكم الدائم مع تمنياتنا للجميع بالتوفيق والنجاح ..',
    'تفضلوا بقبول فائق الاحترام ..',
    ...(includeReemSig
      ? [REEM_HR_SIGNATORY.nameAr, REEM_HR_SIGNATORY.titleAr]
      : [REEM_HR_SIGNATORY.departmentAr]),
    '',
    enforceLtrPlainLine('Peace, mercy, and blessings of Allah be upon you.'),
    enforceLtrPlainLine(salutationEn),
    '',
    ...paragraphsEn.map((p) => enforceLtrPlainLine(p)),
    '',
    enforceLtrPlainLine('Thank you for your continuous cooperation, wishing everyone success.'),
    enforceLtrPlainLine('Please accept our utmost respect,'),
    ...(includeReemSig
      ? [
          enforceLtrPlainLine(REEM_HR_SIGNATORY.nameEn),
          enforceLtrPlainLine(REEM_HR_SIGNATORY.titleEn),
        ]
      : [enforceLtrPlainLine(`Human Resources Department — ${REEM_HR_SIGNATORY.groupNameEn}`)]),
  ];

  const plainBodyWithoutFooter = plainBodyBeforeSignatureLines.join('\r\n');
  const plainTextBody = includeReemSig
    ? `${plainBodyWithoutFooter}\r\n\r\n${REEM_HR_PLAIN_SIGNATURE_BLOCK}`
    : plainBodyWithoutFooter;

  const buildEncodedBudgetBodyWithSignature = (maxEncodedBodyChars: number): string => {
    if (encodeURIComponent(plainTextBody).length <= maxEncodedBodyChars) {
      return plainTextBody;
    }
    const sigSuffix = includeReemSig
      ? `\r\n\r\n${REEM_HR_SIGNATORY.nameAr}\r\n${REEM_HR_SIGNATORY.titleAr}\r\n\r\n${REEM_HR_PLAIN_SIGNATURE_BLOCK}`
      : `\r\n\r\n${REEM_HR_SIGNATORY.departmentAr} — ${REEM_HR_SIGNATORY.groupNameEn}`;
    const sigEncodedLen = encodeURIComponent(sigSuffix).length;
    const availableEncodedForHead = Math.max(240, maxEncodedBodyChars - sigEncodedLen);

    let low = 0;
    let high = plainBodyWithoutFooter.length;
    let bestPrefix = '';

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidateHead = plainBodyWithoutFooter.slice(0, mid).trimEnd();
      if (encodeURIComponent(candidateHead).length <= availableEncodedForHead) {
        bestPrefix = candidateHead;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (!bestPrefix) {
      return `${plainBodyWithoutFooter.slice(0, 64).trimEnd()}${sigSuffix}`;
    }
    return `${bestPrefix}${sigSuffix}`;
  };

  const buildBoundedRecipientList = (emails: string[], maxRawChars: number): string[] => {
    const picked: string[] = [];
    let currentLen = 0;
    for (const email of emails) {
      const nextLen = currentLen + (picked.length > 0 ? 1 : 0) + email.length;
      if (picked.length > 0 && nextLen > maxRawChars) {
        break;
      }
      picked.push(email);
      currentLen = nextLen;
    }
    return picked.length > 0 ? picked : emails.slice(0, 1);
  };

  const emlContent = generateOutlookDraftEmlFile({
    templateId: template.id,
    subject,
    toEmails,
    ccEmails,
    plainTextBody,
    cidHtmlBody,
    attachments: normalizedAttachments,
  });

  // Pass full recipient list (all 69 @kas.sa emails) and full bilingual body + signature to Outlook Web
  const webToBounded = buildBoundedRecipientList(toEmails, 2400);
  const mailtoToBounded = buildBoundedRecipientList(toEmails, 1800);

  const toQuery = encodeURIComponent(webToBounded.join(','));
  const ccQuery = encodeURIComponent(ccEmails.join(','));
  const subjectQuery = encodeURIComponent(subject);

  const webPrefix = `https://outlook.office.com/mail/deeplink/compose?to=${toQuery}&cc=${ccQuery}&subject=${subjectQuery}&body=`;
  const webRemainingEncodedBudget = Math.max(4800, 14500 - webPrefix.length);
  const webBodyFull = buildEncodedBudgetBodyWithSignature(webRemainingEncodedBudget);
  const outlookWebUrl = `${webPrefix}${encodeURIComponent(webBodyFull)}`;

  const mailtoToPath = mailtoToBounded.join(',');
  const mailtoPrefixWithoutBody = [
    ...(ccEmails.length > 0 ? [`cc=${ccQuery}`] : []),
    `subject=${subjectQuery}`,
  ].join('&');
  const mailtoBaseLen = `mailto:${mailtoToPath}?${mailtoPrefixWithoutBody}&body=`.length;
  const mailtoRemainingEncodedBudget = Math.max(3600, 8200 - mailtoBaseLen);
  const mailtoBodyFull = buildEncodedBudgetBodyWithSignature(mailtoRemainingEncodedBudget);

  const mailtoParams = [
    ...(ccEmails.length > 0 ? [`cc=${ccQuery}`] : []),
    `subject=${subjectQuery}`,
    `body=${encodeURIComponent(mailtoBodyFull)}`,
  ].join('&');
  const mailtoUrl = `mailto:${mailtoToPath}?${mailtoParams}`;

  return {
    templateId: template.id,
    templateTitleAr: template.titleAr,
    templateTitleEn: template.titleEn,
    categoryAr: template.categoryAr,
    subject,
    subjectAr,
    subjectEn,
    fromEmail: REEM_HR_SIGNATORY.email,
    toEmails,
    ccEmails,
    attachments: normalizedAttachments,
    attachmentFileName,
    htmlBody,
    cidHtmlBody,
    plainTextBody,
    emlContent,
    outlookWebUrl,
    mailtoUrl,
  };
}
