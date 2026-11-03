import React, { useState, useMemo } from 'react';
import { 
  WorkerProfile, 
  GROUP_COMPANIES, 
  GROUP_OFFICES, 
  GroupOfficeId 
} from '../../types/shelterTransferSuite';
import { 
  Search, 
  Sparkles, 
  UserCheck, 
  Building2, 
  DollarSign, 
  Award, 
  Languages, 
  History, 
  FileText 
} from 'lucide-react';

interface AvailableWorkersCatalogProps {
  workers: WorkerProfile[];
  onBookTransfer: (worker: WorkerProfile) => void;
  onViewProfile: (worker: WorkerProfile) => void;
  onRefresh?: () => void;
}

export const AvailableWorkersCatalog: React.FC<AvailableWorkersCatalogProps> = ({
  workers,
  onBookTransfer,
  onViewProfile,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [trialsFilter, setTrialsFilter] = useState<'all' | 'zero' | 'one_plus'>('all');

  // Filter available workers
  const availableWorkers = useMemo(() => {
    return workers.filter(w => {
      // Must be available for transfer
      if (w.operationalStatus !== 'متاحة لنقل الخدمات') return false;

      // Office filter
      if (selectedOffice !== 'all' && w.originalOfficeId !== selectedOffice) {
        return false;
      }

      // Nationality filter
      if (selectedNationality !== 'all' && w.nationality !== selectedNationality) {
        return false;
      }

      // Skill filter
      if (selectedSkill !== 'all' && !w.skills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()))) {
        return false;
      }

      // Previous trials count
      if (trialsFilter === 'zero' && w.clientTrialsCount > 0) return false;
      if (trialsFilter === 'one_plus' && w.clientTrialsCount === 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (w.fullNameAr || '').toLowerCase().includes(q) || (w.fullNameEn || '').toLowerCase().includes(q);
        const matchesPassport = (w.passportNumber || '').toLowerCase().includes(q);
        const matchesNationality = (w.nationality || '').toLowerCase().includes(q);
        const matchesSkill = (w.skills || []).some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesPassport && !matchesNationality && !matchesSkill) {
          return false;
        }
      }

      return true;
    });
  }, [workers, selectedOffice, selectedNationality, selectedSkill, trialsFilter, searchQuery]);

  // Extract unique nationalities
  const nationalities = useMemo(() => {
    const set = new Set<string>();
    workers.forEach(w => {
      if (w.nationality) set.add(w.nationality);
    });
    return Array.from(set);
  }, [workers]);

  const allSkills = ['طبخ خليجي', 'رعاية أطفال', 'رعاية كبار السن', 'تنظيف شامل', 'غسيل وكوي', 'إدارة منزل'];

  // Helper for office badge
  const getOfficeBadge = (officeId: GroupOfficeId) => {
    const comp = GROUP_OFFICES[officeId];
    if (!comp) return { name: officeId, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    return { name: comp.name, color: comp.primaryColor, bg: `${comp.primaryColor}20` };
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans" dir="rtl">
      {/* Header & Filter Controls Bar - Dark Executive */}
      <div className="bg-[#14181c] rounded-2xl border border-white/10 p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-white tracking-tight font-display m-0">
                كتالوج العاملات المتاحة لنقل الخدمات المباشر
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {availableWorkers.length} عاملة جاهزة
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 m-0">
              عاملات مدربات، مفحوصات طبياً ومؤهلات للنقل الفوري والتجربة عبر مكاتب المجموعة الأربعة
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
              >
                تحديث الكتالوج
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الجواز، المهارة..."
              className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Original Office Filter */}
          <div>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#14181c] text-white">كافة المكاتب الأصلية (المجموعة)</option>
              {GROUP_COMPANIES.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#14181c] text-white">
                  مكتب: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nationality Filter */}
          <div>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#14181c] text-white">كافة الجنسيات</option>
              {nationalities.map(n => (
                <option key={n} value={n} className="bg-[#14181c] text-white">{n}</option>
              ))}
            </select>
          </div>

          {/* Skill / Experience Filter */}
          <div>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#14181c] text-white">كافة التخصصات والمهارات</option>
              {allSkills.map(s => (
                <option key={s} value={s} className="bg-[#14181c] text-white">{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Tags Filter */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-zinc-400 font-bold ml-1">تصفية التجارب السابقة:</span>
          <button
            type="button"
            onClick={() => setTrialsFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              trialsFilter === 'all' 
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20' 
                : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setTrialsFilter('zero')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              trialsFilter === 'zero' 
                ? 'bg-emerald-500 text-black shadow-md' 
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25'
            }`}
          >
            استقدام جديد (0 تجارب سابقة)
          </button>
          <button
            type="button"
            onClick={() => setTrialsFilter('one_plus')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              trialsFilter === 'one_plus' 
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20' 
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25'
            }`}
          >
            عاملات خاضت تجارب سابقة (تنازل كفيل أول / إرجاع)
          </button>
        </div>
      </div>

      {/* Workers Grid */}
      {availableWorkers.length === 0 ? (
        <div className="bg-[#14181c] rounded-2xl border border-white/10 p-12 text-center shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white m-0">لا توجد عاملات مطابقة لشروط البحث الحالية</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            يرجى ضبط معايير الفلترة أو إعادة ضبط البحث للاطلاع على باقي العاملات المتوفرات بالسكن.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedOffice('all');
              setSelectedNationality('all');
              setSelectedSkill('all');
              setTrialsFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableWorkers.map((worker) => {
            const office = getOfficeBadge(worker.originalOfficeId);
            return (
              <div
                key={worker.id}
                className="bg-[#14181c] rounded-2xl border border-white/10 hover:border-amber-500/40 shadow-md transition-all duration-300 overflow-hidden flex flex-col group relative"
              >
                {/* Top Accent Strip */}
                <div 
                  className="h-1 w-full" 
                  style={{ backgroundColor: office.color }}
                />

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col space-y-3.5">
                  {/* Worker Header with Basic Info (No Human Avatar) */}
                  <div className="flex items-start gap-3">
                    {/* Name & Origin */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate font-display m-0">
                        {worker.fullNameAr}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate dir-ltr text-right m-0">
                        {worker.fullNameEn}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                          {worker.nationality}
                        </span>
                        {worker.religion && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-medium bg-white/5 text-zinc-400">
                            {worker.religion}
                          </span>
                        )}
                        {worker.age && (
                          <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-medium bg-white/5 text-zinc-400">
                            {worker.age} سنة
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Decoupled Office Badge */}
                  <div 
                    className="p-2.5 rounded-xl flex items-center justify-between text-xs bg-black/40 border border-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-zinc-400 text-[11px]">المكتب الأصلي:</span>
                    </div>
                    <span className="font-bold text-xs" style={{ color: office.color }}>
                      {office.name}
                    </span>
                  </div>

                  {/* Key Metrics: Salary & Previous Trials */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[10.5px] text-zinc-400 font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-amber-400" />
                        <span>الراتب الشهري</span>
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-1 font-mono">
                        {worker.requestedSalary?.toLocaleString('ar-SA') || '1,500'} <span className="text-[10px] text-zinc-500">⃁</span>
                      </div>
                    </div>

                    <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                      <div className="text-[10.5px] text-zinc-400 font-bold flex items-center gap-1">
                        <History className="w-3 h-3 text-amber-400" />
                        <span>تجارب سابقة</span>
                      </div>
                      <div className="text-xs font-black mt-1">
                        {worker.clientTrialsCount === 0 ? (
                          <span className="text-emerald-400">جديدة (0)</span>
                        ) : (
                          <span className="text-amber-300">{worker.clientTrialsCount} تجارب</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Chips */}
                  <div>
                    <div className="text-[10.5px] text-zinc-400 font-bold mb-1 flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span>المهارات المعتمدة:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {worker.skills && worker.skills.length > 0 ? (
                        worker.skills.slice(0, 4).map((skill, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10.5px] text-zinc-500 italic">أعمال منزلية عامة</span>
                      )}
                    </div>
                  </div>

                  {/* Passport & Languages */}
                  <div className="flex items-center justify-between text-[10.5px] text-zinc-400 pt-2 border-t border-white/5">
                    <span className="font-mono text-zinc-300 font-bold">جواز: {worker.passportNumber}</span>
                    {worker.languages && worker.languages.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Languages className="w-3 h-3 text-zinc-400" />
                        <span>{worker.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-black/40 border-t border-white/10 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onViewProfile(worker)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-200 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>الملف الشامل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBookTransfer(worker)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>حجز لعميل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableWorkersCatalog;
