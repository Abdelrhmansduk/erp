import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Check, HeartHandshake, AlertCircle, 
  MessageSquare, Flame, Smile, ThumbsUp 
} from 'lucide-react';
import { 
  employeeMonitoringService, 
  MoodType, 
  ReasonCategory, 
  MOOD_META, 
  REASON_CATEGORIES, 
  DailyMoodRecord 
} from '../../services/employeeMonitoringService';

interface DailyMoodCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    full_name: string;
    role: string;
    branch: string;
  } | null;
  onSaved?: (record: DailyMoodRecord) => void;
}

export const DailyMoodCheckInModal: React.FC<DailyMoodCheckInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaved,
}) => {
  const [selectedMood, setSelectedMood] = useState<MoodType>('happy');
  const [selectedCategory, setSelectedCategory] = useState<ReasonCategory>('workload');
  const [note, setNote] = useState('');
  const [doNotRemindToday, setDoNotRemindToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      // جلب تسجيل اليوم إن وجد لملء البيانات مسبقاً
      employeeMonitoringService.getTodayUserMood(currentUser.id).then(todayRecord => {
        if (todayRecord) {
          setSelectedMood(todayRecord.mood);
          setSelectedCategory(todayRecord.reason_category);
          setNote(todayRecord.note || '');
        }
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const savedRecord = await employeeMonitoringService.recordDailyMood({
        user_id: currentUser?.id || 'USR-CURRENT',
        user_name: currentUser?.full_name || 'موظف النظام',
        role: currentUser?.role || 'عضو الفريق',
        branch: currentUser?.branch || 'الفرع الرئيسي',
        mood: selectedMood,
        energy_score: MOOD_META[selectedMood].score,
        reason_category: selectedCategory,
        note: note.trim() || undefined,
        date: new Date().toISOString().slice(0, 10),
      });

      if (doNotRemindToday) {
        localStorage.setItem(`mood_reminded_${new Date().toISOString().slice(0, 10)}`, 'true');
      }

      setSuccessSaved(true);
      setTimeout(() => {
        setSuccessSaved(false);
        setIsSubmitting(false);
        if (onSaved) onSaved(savedRecord);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error saving mood:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm transition-all duration-300" dir="rtl">
      <div 
        className="relative w-full max-w-xl overflow-hidden rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] shadow-2xl text-[#141414] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header — Mobbin Pure Light Mode */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#e0e0e0] bg-[#ffffff]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-xl">
              {MOOD_META[selectedMood].emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-[#141414] bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-0.5 rounded-full uppercase">
                  Daily Pulse & Wellness
                </span>
                <span className="text-xs text-[#707070]">
                  {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#141414] mt-1">
                كيف تشعر حيال وتيرة عملك اليوم؟
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 text-[#707070] hover:text-[#141414] rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#ffffff]">
          {/* 1. Emoji Selection Grid */}
          <div>
            <label className="block text-xs font-bold text-[#141414] mb-2.5">
              1. اختر حالتك المزاجية / مستوى الطاقة الآن:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(MOOD_META) as MoodType[]).map(key => {
                const item = MOOD_META[key];
                const isSelected = selectedMood === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMood(key)}
                    className={`flex flex-col items-center justify-center p-3 rounded-[16px] border transition-all duration-200 group cursor-pointer ${
                      isSelected
                        ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                        : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414] hover:border-[#141414]'
                    }`}
                  >
                    <span className="text-3xl mb-1.5 transition-transform group-hover:scale-110">
                      {item.emoji}
                    </span>
                    <span className={`text-[11px] text-center font-semibold leading-tight ${isSelected ? 'text-[#ffffff]' : 'text-[#707070]'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Reason Category Tags */}
          <div>
            <label className="block text-xs font-bold text-[#141414] mb-2.5">
              2. ما العامل الأكثر تأثيراً على حالتك اليوم؟
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REASON_CATEGORIES) as ReasonCategory[]).map(catKey => {
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                        : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414] hover:border-[#141414]'
                    }`}
                  >
                    {REASON_CATEGORIES[catKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Optional Note */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#141414] mb-1.5">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#707070]" />
                ملاحظة سريعة أو عائق تواجهه (اختياري للإدارة والتحسين):
              </span>
              <span className="text-[10px] text-[#707070]">سري وموجّه للمساندة</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="مثال: هناك تأخير في بوابة مساند، أو ضغط طلبات الاستقدام مرتفع..."
              className="w-full px-3.5 py-2.5 bg-[#f3f3f3] border border-[#e0e0e0] rounded-[14px] text-sm text-[#141414] placeholder-[#707070] focus:outline-none focus:border-[#141414] focus:bg-[#ffffff] transition-colors"
            />
          </div>

          {/* Supportive Context Note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#707070]">
            <HeartHandshake className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
            <p className="leading-relaxed m-0">
              تساعدنا هذه الاستجابة السريعة (3 ثوانٍ) في معرفة العوائق التقنية والتشغيلية فوراً وتوزيع أعباء العمل بما يحمي فريقنا من الإجهاد.
            </p>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#e0e0e0]">
            <label className="flex items-center gap-2 text-xs text-[#707070] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doNotRemindToday}
                onChange={e => setDoNotRemindToday(e.target.checked)}
                className="rounded border-[#e0e0e0] text-[#141414] accent-[#141414] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>عدم إظهار التذكير مرة أخرى اليوم</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#707070] hover:text-[#141414] rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] transition-colors cursor-pointer"
              >
                تخطي الآن
              </button>
              <button
                type="submit"
                disabled={isSubmitting || successSaved}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#ffffff] bg-[#141414] hover:bg-[#262626] rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {successSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تم الحفظ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ ومتابعة العمل'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
