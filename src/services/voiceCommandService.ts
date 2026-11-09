/**
 * voiceCommandService.ts
 * Enterprise Voice Command Recognition & Instant Intent Dispatcher
 * for Faris and Noura personas in Khalid Al-Sulaim ERP.
 * 
 * Provides:
 * 1. Ultra-fast Zero-Latency Direct Voice Command Execution (Navigation, Control, Tools).
 * 2. Arabic Natural Dialect Normalization (handles "افتح", "ودني", "روح", "شغل", "بدل", "يا فارس", "يا نورة").
 * 3. Instant spoken audio feedback confirmations from Faris/Noura.
 * 4. Catalog of available voice commands for UI cheat sheets and guides.
 */

import { AssistantPersona } from './audioVoiceService';

export interface VoiceCommandResult {
  isCommand: boolean;
  commandType?: 'navigate' | 'switch_persona' | 'audio_control' | 'ui_control' | 'direct_tool';
  spokenResponse?: string;
  displayText?: string;
}

export interface VoiceCommandGuideItem {
  category: string;
  phrases: string[];
  description: string;
  badge?: string;
}

/**
 * Clean and normalize spoken Arabic text for robust intent recognition.
 */
export function normalizeArabicSpeech(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[،,.?!]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Catalog of all supported voice commands for user display and guidance.
 */
export const VOICE_COMMANDS_GUIDE: VoiceCommandGuideItem[] = [
  {
    category: 'التنقل المباشر بين الشاشات',
    phrases: [
      'افتح شاشة الإيواء',
      'افتح متابعة الموظفين',
      'افتح منافسات كاس / منصة اعتماد',
      'افتح الفوترة الإلكترونية / زاتكا',
      'افتح الإدارة المالية والمحاسبة',
      'افتح خط استقدام مساند',
      'افتح عقود التأجير والتشغيل',
      'افتح بنك السير الذاتية ATS',
      'افتح لوحة التحكم الرئيسية',
      'افتح شؤون الموظفين والموارد البشرية',
    ],
    description: 'ينقلك فوراً للشاشة المطلوبة دون انتظار مع تأكيد صوتي.',
    badge: 'تنفيذ فوري',
  },
  {
    category: 'التحكم في المرشد الذكي والشخصيات',
    phrases: [
      'بدل إلى نُورة / حولي لنورة',
      'بدل إلى فارس / حول لفارس',
      'اكتم الصوت / وضع صامت',
      'شغل الصوت / تفعيل القراءة الصوتية',
      'أغلق المساعد / مع السلامة',
      'امسح المحادثة / ابدأ من جديد',
    ],
    description: 'التبديل بين فارس ونورة والتحكم في الصوت وإغلاق الشاشة بالأمر الصوتي.',
    badge: 'أوامر التحكم',
  },
  {
    category: 'الاستعلامات والتقارير الفورية',
    phrases: [
      'اعطني تقرير أداء وسرعة الموظفين',
      'كم رصيد السيولة النقدية في البنك؟',
      'ما هو تقرير مركز الإيواء اليوم؟',
      'ما هي حالة الفوترة المشفرة ZATCA؟',
      'استعرض الإقامات المنتهية قريباً',
    ],
    description: 'استخراج وعرض المؤشرات الحية مع نطق الملخص التنفيذي صوتياً.',
    badge: 'استعلام ذكي',
  },
];

export interface VoiceCommandDispatchCallbacks {
  onNavigate?: (pageKey: string, pageTitle: string) => void;
  onSwitchPersona?: (newPersona: AssistantPersona) => void;
  onToggleVoice?: (enable: boolean) => void;
  onCloseWidget?: () => void;
  onClearChat?: () => void;
  onExecuteTool?: (toolId: string, params: Record<string, unknown>) => Promise<void>;
}

/**
 * Evaluate spoken transcript for immediate voice commands.
 * Returns VoiceCommandResult indicating if it was handled directly.
 */
export async function dispatchVoiceCommand(
  spokenRaw: string,
  currentPersona: AssistantPersona,
  callbacks: VoiceCommandDispatchCallbacks
): Promise<VoiceCommandResult> {
  const norm = normalizeArabicSpeech(spokenRaw);
  if (!norm) return { isCommand: false };

  // ═══════════════════════════════════════════════════════════════
  // 1. PERSONA SWITCH COMMANDS ("بدل لنورة" / "حول لفارس")
  // ═══════════════════════════════════════════════════════════════
  if (/(?:بدل|حول|غير|اريد|كلمني|كلميني|تحويل).*(?:نور[هه]|نورا|ام خالد)/.test(norm) ||
      norm === 'يا نوره' || norm === 'يا نورة' || norm === 'يا نورا') {
    callbacks.onSwitchPersona?.('noura');
    return {
      isCommand: true,
      commandType: 'switch_persona',
      spokenResponse: 'أهلاً بكِ! معكِ نُورة، أنا جاهزة لمساعدتكِ فوراً.',
      displayText: 'تم التحويل إلى المستشارة نُورة.',
    };
  }

  if (/(?:بدل|حول|غير|اريد|كلمني|تحويل).*(?:فارس|ابو فهد)/.test(norm) ||
      norm === 'يا فارس' || norm === 'يا ابو فهد') {
    callbacks.onSwitchPersona?.('faris');
    return {
      isCommand: true,
      commandType: 'switch_persona',
      spokenResponse: 'أهلاً بك! معك فارس، مستشارك التنفيذي في خدمتك.',
      displayText: 'تم التحويل إلى المستشار فارس.',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. AUDIO & UI CONTROL COMMANDS ("اكتم الصوت", "أغلق", "امسح")
  // ═══════════════════════════════════════════════════════════════
  if (/(?:اكتم|كتم|صامت|اخرس|اسكت|وقف الصوت|ايقاف الصوت|تعطيل الصوت)/.test(norm)) {
    callbacks.onToggleVoice?.(false);
    return {
      isCommand: true,
      commandType: 'audio_control',
      spokenResponse: 'تم كتم الصوت.',
      displayText: 'تم كتم القراءة الصوتية.',
    };
  }

  if (/(?:شغل الصوت|تفعيل الصوت|تكلم|صوت|افتح الصوت)/.test(norm)) {
    callbacks.onToggleVoice?.(true);
    return {
      isCommand: true,
      commandType: 'audio_control',
      spokenResponse: 'تم تفعيل الصوت بنجاح.',
      displayText: 'تم تفعيل القراءة الصوتية بنجاح.',
    };
  }

  if (/(?:اغلق|اغلاق|سكر|مع السلامه|في امان الله|باي|شكرا خلاص|خروج).*(?:النافذه|المساعد|الشاشه)?/.test(norm) ||
      norm === 'اغلق' || norm === 'مع السلامه' || norm === 'في امان الله' || norm === 'شكرا') {
    const farewell = currentPersona === 'noura'
      ? 'في أمان الله وحفظه، يسعدني خدمتكِ دائماً.'
      : 'في أمان الله، أنا في خدمتك متى ما احتجتني.';
    
    setTimeout(() => {
      callbacks.onCloseWidget?.();
    }, 1800);

    return {
      isCommand: true,
      commandType: 'ui_control',
      spokenResponse: farewell,
      displayText: 'تم إغلاق نافذة المساعد الذكي.',
    };
  }

  if (/(?:امسح|مسح|تنظيف|محادثه جديده|شات جديد).*(?:المحادثه|الشات|الرسائل)?/.test(norm)) {
    callbacks.onClearChat?.();
    const clearResp = currentPersona === 'noura'
      ? 'تم مسح المحادثة وبدء جلسة جديدة. تفضلي بما تحتاجين.'
      : 'تم مسح المحادثة وبدء جلسة جديدة. كيف أستطيع مساعدتك؟';
    return {
      isCommand: true,
      commandType: 'ui_control',
      spokenResponse: clearResp,
      displayText: 'تم مسح المحادثة وبدء جلسة جديدة.',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. DIRECT TOOL EXECUTION VOICE COMMANDS ("تقرير الموظفين", "رصيد السيولة")
  // Evaluated BEFORE screen navigation so report queries are not hijacked.
  // ═══════════════════════════════════════════════════════════════
  const isMutatingActionIntent =
    /(?:انشئ|اصدر|سجل|اضف|توثيق|تسكين نزيل|احسب|حاسبه|حساب|اكتب|صياغه|جهز|افتح تذكره|افتح شكوي|سعر بند|تسعير بند|اعتمد سند|حدث منافسه|تحديث حاله)/.test(
      norm
    );

  if (isMutatingActionIntent) {
    // Let mutating/calculation/drafting requests flow to inferToolCallFromArabicPrompt
    return { isCommand: false };
  }

  if (norm.includes('تقرير الموظف') || norm.includes('سرعه الموظف') || norm.includes('انتاجيه الموظف') || norm.includes('تقرير اداء وسرعه الموظفين')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_employee_monitoring_summary', { period: 'today' });
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير متابعة أداء وإنتاجية الموظفين.',
      };
    }
  }

  if (norm.includes('رصيد السيوله') || norm.includes('رصيد البنك') || norm.includes('كم السيوله')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_cash_balance', {});
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير أرصدة السيولة النقدية.',
      };
    }
  }

  if (norm.includes('تقرير الايواء') || norm.includes('تقرير مركز الايواء') || norm.includes('التقرير الميداني اليومي للايواء') || norm.includes('حاله السكن')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_shelter_daily_status', {});
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير الإيواء والرعاية اليومي.',
      };
    }
  }

  if (norm.includes('تقرير زاتكا') || norm.includes('فحص الفوتره') || norm.includes('امتثال زاتكا') || norm.includes('امتثال الفوتره')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_zatca_compliance_report', {});
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم فحص تقرير امتثال الفوترة الإلكترونية ZATCA.',
      };
    }
  }

  if (norm.includes('منافسات اعتماد') || norm.includes('بحث المنافسات') || norm.includes('مناقصات اعتماد') || norm.includes('فرص اعتماد') || norm.includes('ابحث في منافسات')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('search_etmad_tenders', { query: '' });
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير منافسات منصة اعتماد المرصودة.',
      };
    }
  }

  if (norm.includes('اقامات منتهيه') || norm.includes('انتهاء الاقامات') || norm.includes('فحص الاقامات') || norm.includes('تجديد الاقامات') || norm.includes('الاقامات المنتهيه')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_expiring_iqamas', { days_ahead: 30 });
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير الإقامات التي قاربت على الانتهاء.',
      };
    }
  }

  if (norm.includes('اشغال الايواء') || norm.includes('اشغال السكن') || norm.includes('سعه السكن') || norm.includes('سعه الاسره') || norm.includes('كم سرير شاغر')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('get_shelter_occupancy', {});
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء مؤشرات الطاقة الاستيعابية والإشغال بمركز الإيواء.',
      };
    }
  }

  if (norm.includes('العياده الطبيه') || norm.includes('الفحص الطبي للنزيلات') || norm.includes('حاله العزل') || norm.includes('جناح العزل')) {
    if (callbacks.onExecuteTool) {
      await callbacks.onExecuteTool('check_inmate_medical_status', {});
      return {
        isCommand: true,
        commandType: 'direct_tool',
        displayText: 'تم استدعاء تقرير العيادة الطبية وجناح العزل الوقائي.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. NAVIGATION VOICE COMMANDS ("افتح شاشة...")
  // Only triggers when explicit navigation intent is present.
  // ═══════════════════════════════════════════════════════════════
  const isNav = /(?:^|\s)(?:افتح|فتح|انتقل|ودني|روح|شاشه|بوابه)(?:\s|$)/.test(norm);

  if (isNav) {
    if (norm.includes('ايواء') || norm.includes('سكن') || norm.includes('تسكين') || norm.includes('نزيل')) {
      callbacks.onNavigate?.('shelter', 'مراكز الإيواء والتسكين');
      const resp = currentPersona === 'noura'
        ? 'حسناً، تم فتح بوابة مراكز الإيواء والتسكين والرعاية فوراً.'
        : 'تم فتح شاشة مراكز الإيواء والتسكين المعتمدة من HRSD.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [مراكز الإيواء والتسكين].',
      };
    }

    if (norm.includes('موظفين والموارد') || norm.includes('موارد بشريه') || norm.includes('رواتب') || norm.includes('شؤون الموظفين')) {
      callbacks.onNavigate?.('hr', 'الموارد البشرية ومسير الرواتب WPS');
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: 'تم فتح شاشة الموارد البشرية ومسير الرواتب.',
        displayText: 'تم الانتقال إلى [الموارد البشرية ومسير الرواتب WPS].',
      };
    }

    if (norm.includes('موظف') || norm.includes('انتاج') || norm.includes('خمول') || norm.includes('سرع') || norm.includes('اداء') || norm.includes('متابعه الموظفين')) {
      callbacks.onNavigate?.('employee-monitoring', 'متابعة أداء وإنتاجية الموظفين');
      const resp = currentPersona === 'noura'
        ? 'تم فتح شاشة متابعة أداء الموظفين وسرعة الإنجاز.'
        : 'حسناً، تم فتح شاشة متابعة أداء وسرعة الموظفين الميدانية ونسب الخمول.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [متابعة أداء وإنتاجية الموظفين].',
      };
    }

    if (norm.includes('منافس') || norm.includes('اعتماد') || norm.includes('كاس') || norm.includes('boq') || norm.includes('كميات')) {
      callbacks.onNavigate?.('kas-suite', 'جناح كاس للمنافسات');
      const resp = currentPersona === 'noura'
        ? 'تم فتح جناح كاس للمنافسات وجداول الكميات.'
        : 'تم فتح جناح كاس لمنافسات منصة اعتماد وجداول الكميات الذكية BOQ.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [جناح كاس للمنافسات الحكومية].',
      };
    }

    if (norm.includes('فوتر') || norm.includes('زاتكا') || norm.includes('فاتور') || norm.includes('ضريب')) {
      callbacks.onNavigate?.('zatca', 'بوابة الفوترة الإلكترونية ZATCA');
      const resp = 'تم فتح بوابة الفوترة الإلكترونية المشفرة ZATCA المرحلة الثانية.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [بوابة الفوترة المشفرة ZATCA].',
      };
    }

    if (norm.includes('اودو') || norm.includes('odoo')) {
      callbacks.onNavigate?.('odoo-accounting', 'أتمتة المحاسبة الذكية (Odoo 16+)');
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: 'تم فتح شاشة أتمتة المحاسبة الذكية أودو.',
        displayText: 'تم الانتقال إلى [أتمتة المحاسبة الذكية Odoo 16+].',
      };
    }

    if (norm.includes('معايير دوليه') || norm.includes('ifrs') || norm.includes('توحيد القوائم')) {
      callbacks.onNavigate?.('ifrs-engine', 'محرك المعايير الدولية IFRS والتوحيد المالي');
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: 'تم فتح محرك المعايير المحاسبية الدولية وتوحيد القوائم المالية.',
        displayText: 'تم الانتقال إلى [محرك المعايير الدولية IFRS].',
      };
    }

    if (norm.includes('مالي') || norm.includes('محاسب') || norm.includes('سماك') || norm.includes('دليل')) {
      callbacks.onNavigate?.('finance-home', 'الإدارة المالية والمحاسبة');
      const resp = 'تم فتح شاشة الإدارة المالية والدليل المحاسبي الموحد.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [الإدارة المالية والمحاسبية].',
      };
    }

    if (norm.includes('استقدام') || norm.includes('مساند') || norm.includes('تاشير')) {
      callbacks.onNavigate?.('recruitment-contracts', 'عقود استقدام مساند');
      const resp = 'تم فتح إدارة عقود استقدام مساند.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [عقود استقدام مساند].',
      };
    }

    if (norm.includes('تاجير') || norm.includes('تشغيل') || norm.includes('ياقوت')) {
      callbacks.onNavigate?.('rent-contracts', 'عقود التأجير والتشغيل');
      const resp = 'تم فتح عقود التأجير والتشغيل المرن لشركة الياقوت الشرقية.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [عقود التأجير والتشغيل].',
      };
    }

    if (norm.includes('سير') || norm.includes('توظيف') || norm.includes('ats')) {
      callbacks.onNavigate?.('cvs', 'بنك السير الذاتية الذكي');
      const resp = 'تم فتح بنك السير الذاتية الذكي ATS لتوب تالنت.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [بنك السير الذاتية ATS].',
      };
    }

    if (norm.includes('عملاء') || norm.includes('crm')) {
      callbacks.onNavigate?.('clients', 'إدارة العملاء CRM');
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: 'تم فتح شاشة إدارة وعلاقات العملاء.',
        displayText: 'تم الانتقال إلى [إدارة العملاء CRM].',
      };
    }

    if (norm.includes('شكاو') || norm.includes('شكوي') || norm.includes('sla')) {
      callbacks.onNavigate?.('complaints', 'مركز الشكاوى واتفاقيات SLA');
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: 'تم فتح مركز معالجة الشكاوى واتفاقيات مستوى الخدمة.',
        displayText: 'تم الانتقال إلى [مركز الشكاوى واتفاقيات SLA].',
      };
    }

    if (norm.includes('قياد') || norm.includes('مجموعه')) {
      callbacks.onNavigate?.('group-command-center', 'مركز القيادة والتحكم الموحد');
      const resp = 'تم فتح مركز القيادة والتحكم الموحد لمجموعة خالد السليم.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [مركز القيادة والتحكم الموحد].',
      };
    }

    if (norm.includes('رئيسي') || norm.includes('داشبورد') || norm.includes('تحكم')) {
      callbacks.onNavigate?.('dashboard', 'لوحة المؤشرات التنفيذية');
      const resp = 'تم فتح لوحة المؤشرات التنفيذية الرئيسية.';
      return {
        isCommand: true,
        commandType: 'navigate',
        spokenResponse: resp,
        displayText: 'تم الانتقال إلى [لوحة المؤشرات التنفيذية].',
      };
    }
  }

  // Not a direct command; let it flow to AI conversational inference
  return { isCommand: false };
}
