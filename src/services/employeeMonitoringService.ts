/**
 * Employee Monitoring, Telemetry & Mood Pulse Service
 * Khalid Al-Sulaim Commercial Group ERP
 * 
 * Provides:
 * 1. Global Clickstream & Rage Click detection
 * 2. Active vs. Idle time tracking
 * 3. Daily Employee Mood & Pulse check-ins (Sentiment & Burnout tracking)
 * 4. Data Loss Prevention (DLP) & Export security auditing
 * 5. Persistence via realErpDataStore (local + cloud synced)
 */

import { realErpDataStore } from './realErpDataStore';
import { getFullStaffDirectory } from './authService';

export type MoodType = 'thrilled' | 'happy' | 'neutral' | 'stressed' | 'frustrated';
export type ReasonCategory = 'workload' | 'system_performance' | 'team_collaboration' | 'client_pressure' | 'personal' | 'general';
export type TelemetryEventType = 'click' | 'rage_click' | 'tab_navigation' | 'data_export' | 'prolonged_idle' | 'error_encounter';

export interface DailyMoodRecord {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  branch: string;
  mood: MoodType;
  energy_score: number; // 1 to 5
  reason_category: ReasonCategory;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
}

export interface ActivityTelemetryEvent {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  branch: string;
  event_type: TelemetryEventType;
  target_element: string;
  target_label: string;
  module: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export interface EmployeeMonitoringSummary {
  user_id: string;
  user_name: string;
  role: string;
  branch: string;
  active_time_mins: number;
  idle_time_mins: number;
  total_clicks: number;
  rage_clicks_count: number;
  latest_mood: MoodType;
  mood_score: number; // 1 to 5
  burnout_risk: 'منخفض' | 'متوسط' | 'مرتفع';
  tasks_velocity: number; // عدد المعاملات المنجزة
  last_active: string;
}

export const MOOD_META: Record<MoodType, { emoji: string; label: string; color: string; score: number }> = {
  thrilled: { emoji: '5/5', label: 'متحمس ومنجز', color: '#141414', score: 5 },
  happy: { emoji: '4/5', label: 'مرتاح ومستقر', color: '#141414', score: 4 },
  neutral: { emoji: '3/5', label: 'عادي / روتيني', color: '#707070', score: 3 },
  stressed: { emoji: '2/5', label: 'مضغوط ومشتت', color: '#141414', score: 2 },
  frustrated: { emoji: '1/5', label: 'محبط / أواجه عقبات', color: '#141414', score: 1 },
};

export const REASON_CATEGORIES: Record<ReasonCategory, string> = {
  workload: 'حجم وضغط المعاملات',
  system_performance: 'بطء أو صعوبة بالسيستم',
  team_collaboration: 'التواصل وتوزيع المهام',
  client_pressure: 'مطالبات وضغوط العملاء',
  personal: 'ظروف شخصية خارج العمل',
  general: 'طبيعة وتيرة العمل العامة',
};

const INITIAL_MOODS: DailyMoodRecord[] = [];

const INITIAL_TELEMETRY: ActivityTelemetryEvent[] = [];

class EmployeeMonitoringService {
  private rageClickBuffer: { element: string; time: number }[] = [];
  private lastActivityTime: number = Date.now();
  private idleCheckInterval: any = null;
  private isInitialized = false;

  /**
   * استرجاع سجلات المشاعر اليومية للموظفين (بدون أي بيانات محاكاة)
   */
  async getMoodLogs(): Promise<DailyMoodRecord[]> {
    const seed = import.meta.env.MODE === 'test' ? INITIAL_MOODS : [];
    return await realErpDataStore.getRecords<DailyMoodRecord>('employee_moods', seed);
  }

  /**
   * تسجيل حالة مشاعر الموظف اليومية
   */
  async recordDailyMood(entry: Omit<DailyMoodRecord, 'id' | 'timestamp'>): Promise<DailyMoodRecord> {
    const newRecord: DailyMoodRecord = {
      id: `MOOD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      ...entry,
    };

    const currentLogs = await this.getMoodLogs();
    // إذا كان الموظف قد سجل اليوم، نحدّث سجله بدلاً من التكرار
    const existingIdx = currentLogs.findIndex(
      l => l.user_id === entry.user_id && l.date === entry.date
    );

    let updatedLogs: DailyMoodRecord[];
    if (existingIdx >= 0) {
      updatedLogs = [...currentLogs];
      updatedLogs[existingIdx] = newRecord;
    } else {
      updatedLogs = [newRecord, ...currentLogs];
    }

    await realErpDataStore.saveRecords('employee_moods', updatedLogs);

    // إضافة إشعار في الـ Telemetry أيضاً
    await this.recordTelemetryEvent({
      user_id: entry.user_id,
      user_name: entry.user_name,
      role: entry.role,
      branch: entry.branch,
      event_type: 'click',
      target_element: 'MoodPulseModal',
      target_label: `تسجيل مشاعر يومية (${MOOD_META[entry.mood].label})`,
      module: 'سجل النبض والمشاعر',
      details: `المزاج: ${MOOD_META[entry.mood].label} | السبب: ${REASON_CATEGORIES[entry.reason_category]} | الملاحظة: ${entry.note || 'لا يوجد'}`,
      severity: entry.mood === 'frustrated' || entry.mood === 'stressed' ? 'warning' : 'info'
    });

    // إطلاق حدث في النافذة لإعلام بقية المكونات فوراً
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee-mood-updated', { detail: newRecord }));
    }

    return newRecord;
  }

  /**
   * هل سجل الموظف حالته اليوم؟
   */
  async hasLoggedMoodToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const logs = await this.getMoodLogs();
    return logs.some(l => l.user_id === userId && l.date === today);
  }

  /**
   * جلب تسجيل مشاعر الموظف الحالي لليوم
   */
  async getTodayUserMood(userId: string): Promise<DailyMoodRecord | null> {
    const today = new Date().toISOString().slice(0, 10);
    const logs = await this.getMoodLogs();
    return logs.find(l => l.user_id === userId && l.date === today) || null;
  }

  /**
   * استرجاع أحداث التتبع (Telemetry Events) الحقيقية فقط
   */
  async getTelemetryEvents(): Promise<ActivityTelemetryEvent[]> {
    const seed = import.meta.env.MODE === 'test' ? INITIAL_TELEMETRY : [];
    return await realErpDataStore.getRecords<ActivityTelemetryEvent>('telemetry_events', seed);
  }

  /**
   * تسجيل حدث نشاط أو نقرة عصبية أو تصدير بيانات
   */
  async recordTelemetryEvent(entry: Omit<ActivityTelemetryEvent, 'id' | 'timestamp'>): Promise<void> {
    const newEvent: ActivityTelemetryEvent = {
      id: `TEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      ...entry
    };

    const currentEvents = await this.getTelemetryEvents();
    // الاحتفاظ بأحدث 200 حدث لضمان خفة الأداء
    const updated = [newEvent, ...currentEvents].slice(0, 200);
    await realErpDataStore.saveRecords('telemetry_events', updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telemetry-event-added', { detail: newEvent }));
    }
  }

  /**
   * حساب ملخصات إنتاجية ومراقبة الموظفين الفعلية فقط بدون أرقام محاكاة
   */
  async getMonitoringSummaries(): Promise<EmployeeMonitoringSummary[]> {
    const moodLogs = await this.getMoodLogs();
    const telemetry = await this.getTelemetryEvents();
    const executedOps = await realErpDataStore.getRecords<any>('employee_executed_ops', []);
    const hrEmployees = await realErpDataStore.getRecords<any>('hr_employees', []);

    if (import.meta.env.MODE === 'test') {
      const fullStaff = getFullStaffDirectory();
      return fullStaff.map((staff) => ({
        user_id: staff.id,
        user_name: staff.full_name,
        role: staff.role,
        branch: staff.branch,
        active_time_mins: 0,
        idle_time_mins: 0,
        total_clicks: 0,
        rage_clicks_count: 0,
        latest_mood: 'neutral',
        mood_score: 3,
        burnout_risk: 'منخفض',
        tasks_velocity: 0,
        last_active: '—',
      }));
    }

    // Build strictly from user-added HR employees and users with real logged events
    const actorsMap = new Map<
      string,
      { id: string; name: string; role: string; branch: string }
    >();
    for (const emp of Array.isArray(hrEmployees) ? hrEmployees : []) {
      if (emp?.id && emp?.name) {
        actorsMap.set(String(emp.id), {
          id: String(emp.id),
          name: String(emp.name),
          role: String(emp.job_title || emp.role || 'موظف'),
          branch: String(emp.branch || 'الفرع الرئيسي'),
        });
      }
    }
    for (const m of moodLogs) {
      if (m?.user_id && !actorsMap.has(m.user_id)) {
        actorsMap.set(m.user_id, {
          id: m.user_id,
          name: m.user_name,
          role: m.role || 'موظف',
          branch: m.branch || 'الفرع الرئيسي',
        });
      }
    }
    for (const t of telemetry) {
      if (t?.user_id && !actorsMap.has(t.user_id)) {
        actorsMap.set(t.user_id, {
          id: t.user_id,
          name: t.user_name,
          role: t.role || 'موظف',
          branch: t.branch || 'الفرع الرئيسي',
        });
      }
    }

    return Array.from(actorsMap.values()).map((staff) => {
      const userMoods = moodLogs.filter(
        (m) => m.user_id === staff.id || m.user_name === staff.name
      );
      const latestMood: MoodType = userMoods[0]?.mood || 'neutral';
      const moodScore = userMoods[0] ? MOOD_META[latestMood]?.score || 3 : 0;

      const userTelemetry = telemetry.filter(
        (t) => t.user_id === staff.id || t.user_name === staff.name
      );
      const userRageClicks = userTelemetry.filter((t) => t.event_type === 'rage_click').length;
      const userIdleEvents = userTelemetry.filter((t) => t.event_type === 'prolonged_idle').length;
      const userExecutedOps = executedOps.filter(
        (op) => op.staff_id === staff.id || op.staff_name === staff.name
      ).length;

      const activeMins = userExecutedOps * 5 + userTelemetry.length * 2;
      const idleMins = userIdleEvents * 20;

      let burnoutRisk: 'منخفض' | 'متوسط' | 'مرتفع' = 'منخفض';
      if (latestMood === 'frustrated' || (latestMood === 'stressed' && userRageClicks > 2)) {
        burnoutRisk = 'مرتفع';
      } else if (latestMood === 'stressed' || userRageClicks > 1 || idleMins > 60) {
        burnoutRisk = 'متوسط';
      }

      return {
        user_id: staff.id,
        user_name: staff.name,
        role: staff.role,
        branch: staff.branch,
        active_time_mins: activeMins,
        idle_time_mins: idleMins,
        total_clicks: userTelemetry.length,
        rage_clicks_count: userRageClicks,
        latest_mood: latestMood,
        mood_score: moodScore,
        burnout_risk: burnoutRisk,
        tasks_velocity: userExecutedOps,
        last_active: userTelemetry[0]?.timestamp || userMoods[0]?.timestamp || 'لا يوجد نشاط مسجل بعد',
      };
    });
  }

  /**
   * حساب الإحصائيات الإجمالية للوحة التحكم
   */
  async getOverallMetrics() {
    const summaries = await this.getMonitoringSummaries();
    const telemetry = await this.getTelemetryEvents();

    const totalMoodScore = summaries.reduce((acc, s) => acc + s.mood_score, 0);
    const avgMoodScore = (totalMoodScore / (summaries.length || 1)).toFixed(1);

    const totalActive = summaries.reduce((acc, s) => acc + s.active_time_mins, 0);
    const totalIdle = summaries.reduce((acc, s) => acc + s.idle_time_mins, 0);
    const activeRatio = Math.round((totalActive / ((totalActive + totalIdle) || 1)) * 100);

    const totalRageClicks = telemetry.filter(t => t.event_type === 'rage_click').length;
    const securityAlertsCount = telemetry.filter(t => t.severity === 'critical' || t.event_type === 'data_export').length;

    return {
      teamMoodScore: Number(avgMoodScore),
      activeRatio,
      totalRageClicks,
      securityAlertsCount,
      activeEmployeesCount: summaries.length
    };
  }

  /**
   * تهيئة التتبع العالمي الخفيف في خلفية تطبيق الـ ERP
   */
  initGlobalTelemetry(getCurrentUser: () => { id: string; name: string; role: string; branch: string } | null) {
    if (this.isInitialized || typeof window === 'undefined') return () => {};
    this.isInitialized = true;

    // 1. مراقبة النقرات المتسارعة على نفس الزر (Rage Click Detector)
    const handleClick = (e: MouseEvent) => {
      this.lastActivityTime = Date.now();
      const target = e.target as HTMLElement;
      if (!target) return;

      const elementIdentifier = target.id || target.getAttribute('aria-label') || target.tagName.toLowerCase();
      const now = Date.now();

      this.rageClickBuffer.push({ element: elementIdentifier, time: now });
      // تصفية النقرات الأقدم من ثانية واحدة
      this.rageClickBuffer = this.rageClickBuffer.filter(item => now - item.time < 1000);

      // إذا تكرر النقر على نفس العنصر 3 مرات في ثانية واحدة
      const clicksOnSame = this.rageClickBuffer.filter(item => item.element === elementIdentifier).length;
      if (clicksOnSame === 3) {
        const user = getCurrentUser();
        const label = target.innerText?.slice(0, 30) || target.title || elementIdentifier;

        this.recordTelemetryEvent({
          user_id: user?.id || 'USR-CURRENT',
          user_name: user?.name || 'المستخدم الحالي',
          role: user?.role || 'موظف',
          branch: user?.branch || 'الفرع الرئيسي',
          event_type: 'rage_click',
          target_element: elementIdentifier,
          target_label: label ? `العنصر: "${label}"` : elementIdentifier,
          module: 'شاشة النظام الحالية',
          details: `رصد 3 نقرات متتالية سريعة خلال ثانية واحدة على [${label}]. قد يشير إلى استجابة بطيئة أو إحباط في المعاملة.`,
          severity: 'warning'
        });
      }
    };

    // 2. مراقبة حركة الماوس أو الكيبورد لتحديث وقت النشاط
    const handleActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // 3. مراقبة الخمول الطويل (Prolonged Idle Check) كل دقيقة
    this.idleCheckInterval = setInterval(() => {
      const idleMinutes = (Date.now() - this.lastActivityTime) / (1000 * 60);
      if (idleMinutes >= 20 && idleMinutes < 21) {
        // تم رصد 20 دقيقة خمول متواصلة
        const user = getCurrentUser();
        this.recordTelemetryEvent({
          user_id: user?.id || 'USR-CURRENT',
          user_name: user?.name || 'المستخدم الحالي',
          role: user?.role || 'موظف',
          branch: user?.branch || 'الفرع الرئيسي',
          event_type: 'prolonged_idle',
          target_element: 'AppSession',
          target_label: 'جلسة العمل',
          module: 'النظام العام',
          details: 'توقف المستخدم عن التفاعل بالماوس أو الكيبورد لأكثر من 20 دقيقة متواصلة.',
          severity: 'info'
        });
      }
    }, 60000);

    // 4. الاستماع لحدث تصدير البيانات (Export Event)
    const handleExportAudit = (e: any) => {
      const user = getCurrentUser();
      const detail = e.detail || {};
      this.recordTelemetryEvent({
        user_id: user?.id || 'USR-CURRENT',
        user_name: user?.name || 'المستخدم الحالي',
        role: user?.role || 'موظف',
        branch: user?.branch || 'الفرع الرئيسي',
        event_type: 'data_export',
        target_element: detail.source || 'ExportDropdown',
        target_label: detail.title || 'تصدير بيانات',
        module: detail.module || 'الوحدة الحالية',
        details: `تصدير بيانات (${detail.count || 'مجموعة'} سجل) بصيغة ${detail.format || 'Excel'}.`,
        severity: (detail.count && detail.count > 50) ? 'warning' : 'info'
      });
    };

    window.addEventListener('click', handleClick, true);
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('erp_data_exported', handleExportAudit);

    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('erp_data_exported', handleExportAudit);
      if (this.idleCheckInterval) clearInterval(this.idleCheckInterval);
      this.isInitialized = false;
    };
  }
}

export const employeeMonitoringService = new EmployeeMonitoringService();
