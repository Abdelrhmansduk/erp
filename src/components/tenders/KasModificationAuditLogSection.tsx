import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  RotateCw,
  History,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import {
  kasNovemberWorkbooksService,
  KasModificationLogEntry,
} from '../../services/kasNovemberWorkbooksService';
import { useAppStore } from '../../stores/appStore';

export interface KasModificationAuditLogSectionProps {
  onStateRestored?: () => void;
}

export const KasModificationAuditLogSection: React.FC<
  KasModificationAuditLogSectionProps
> = ({ onStateRestored }) => {
  const { addNotification } = useAppStore();
  const [logs, setLogs] = useState<KasModificationLogEntry[]>(() =>
    kasNovemberWorkbooksService.getModificationLogs()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVERTED'>('ALL');

  useEffect(() => {
    const refreshLogs = () => {
      setLogs(kasNovemberWorkbooksService.getModificationLogs());
    };
    const unsubscribe = kasNovemberWorkbooksService.subscribe(refreshLogs);
    return () => unsubscribe();
  }, []);

  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.actorName) set.add(l.actorName);
    });
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (actorFilter !== 'ALL' && entry.actorName !== actorFilter) return false;
      if (statusFilter === 'ACTIVE' && entry.reverted) return false;
      if (statusFilter === 'REVERTED' && !entry.reverted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${entry.actorName} ${entry.actorEmail} ${entry.actionSummary} ${entry.targetLabel} ${entry.sourceSection}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actorFilter, statusFilter, searchQuery]);

  const activeLogsCount = useMemo(
    () => logs.filter((l) => !l.reverted).length,
    [logs]
  );
  const revertedLogsCount = useMemo(
    () => logs.filter((l) => l.reverted).length,
    [logs]
  );

  const handleRevertEntry = (entry: KasModificationLogEntry) => {
    const ok = kasNovemberWorkbooksService.revertModificationById(entry.id);
    if (ok) {
      setLogs(kasNovemberWorkbooksService.getModificationLogs());
      onStateRestored?.();
      addNotification({
        title: 'تم التراجع عن التعديل واستعادة الحالة السابقة',
        message: `تم التراجع عن إجراء (${entry.actionSummary}) الذي قام به (${entry.actorName}) بنجاح، وتم تحديث الجدول في كلا القسمين.`,
        type: 'success',
      });
    }
  };

  const handleUndoRevertEntry = (entry: KasModificationLogEntry) => {
    const ok = kasNovemberWorkbooksService.undoRevertModificationById(entry.id);
    if (ok) {
      setLogs(kasNovemberWorkbooksService.getModificationLogs());
      onStateRestored?.();
      addNotification({
        title: 'تم التراجع عن الإرجاع (استعادة الإجراء)',
        message: `تمت إعادة تطبيق الإجراء (${entry.actionSummary}) الخاص بـ (${entry.actorName}) بنجاح.`,
        type: 'success',
      });
    }
  };

  const handleRevertLatest = () => {
    const entry = kasNovemberWorkbooksService.revertLatestActiveModification();
    if (entry) {
      setLogs(kasNovemberWorkbooksService.getModificationLogs());
      onStateRestored?.();
      addNotification({
        title: 'تم التراجع عن آخر إجراء تعديل',
        message: `تم التراجع عن: "${entry.actionSummary}" (${entry.actorName}).`,
        type: 'success',
      });
    } else {
      addNotification({
        title: 'لا توجد تعديلات نشطة للتراجع عنها',
        message: 'سجل التعديلات لا يحتوي حالياً على إجراء نشط قابل للتراجع.',
        type: 'info',
      });
    }
  };

  const handleUndoLatestReverted = () => {
    const entry = kasNovemberWorkbooksService.undoLatestRevertedModification();
    if (entry) {
      setLogs(kasNovemberWorkbooksService.getModificationLogs());
      onStateRestored?.();
      addNotification({
        title: 'تم التراجع عن الإرجاع واستعادة الإجراء',
        message: `تمت استعادة الإجراء المتراجع عنه: "${entry.actionSummary}" (${entry.actorName}).`,
        type: 'success',
      });
    } else {
      addNotification({
        title: 'لا توجد إجراءات متراجع عنها لاستعادتها',
        message: 'لا يوجد إجراء متراجع عنه حالياً لإعادة تطبيقه.',
        type: 'info',
      });
    }
  };

  const getActionBadgeStyle = (type: KasModificationLogEntry['actionType']) => {
    switch (type) {
      case 'add':
        return { bg: '#00CC00', fg: '#000000', label: 'إضافة' };
      case 'delete':
        return { bg: '#F8CBAD', fg: '#9C0006', label: 'حذف' };
      case 'duplicate':
        return { bg: '#00B0F0', fg: '#000000', label: 'نسخ وتكرار' };
      case 'import':
        return { bg: '#92D050', fg: '#000000', label: 'استيراد وتحديث' };
      case 'reset':
        return { bg: '#4472C4', fg: '#FFFFFF', label: 'إعادة ضبط' };
      case 'edit':
      default:
        return { bg: '#A9D18E', fg: '#000000', label: 'تعديل بيانات' };
    }
  };

  return (
    <div dir="rtl" className="space-y-4 font-sans">
      {/* Top Banner & Action Buttons */}
      <div
        style={{ backgroundColor: '#4472C4', color: '#FFFFFF' }}
        className="p-4 rounded-[16px] border-2 border-[#000000] flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[12px] bg-[#00CC00] border-2 border-[#000000] flex items-center justify-center text-[#000000] shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold m-0 text-[#ffffff]">
              قسم سجل التعديلات ومن قام بها واستعادة الإجراءات (Audit & Rollback Center)
            </h2>
            <p className="text-xs text-[#e2e8f0] m-0 mt-0.5 font-semibold">
              يوثّق كل إضافة أو تعديل أو حذف أو نسخ في جداول كاس مع اسم الموظف وتوقيت العملية، مع إمكانية التراجع عن أي تعديل أو التراجع عن الإرجاع فوراً.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRevertLatest}
            disabled={activeLogsCount === 0}
            style={{
              backgroundColor: activeLogsCount > 0 ? '#F8CBAD' : '#cbd5e1',
              color: activeLogsCount > 0 ? '#9C0006' : '#475569',
            }}
            className="px-3.5 py-2 rounded-[10px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="التراجع عن آخر تعديل تم في الجداول"
          >
            <RotateCcw className="w-4 h-4" />
            <span>التراجع عن آخر تعديل ({activeLogsCount})</span>
          </button>

          <button
            type="button"
            onClick={handleUndoLatestReverted}
            disabled={revertedLogsCount === 0}
            style={{
              backgroundColor: revertedLogsCount > 0 ? '#00CC00' : '#cbd5e1',
              color: '#000000',
            }}
            className="px-3.5 py-2 rounded-[10px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="زر التراجع عن الإرجاع — استعادة آخر إجراء تم التراجع عنه"
          >
            <RotateCw className="w-4 h-4" />
            <span>زر التراجع عن الإجراء المتراجع عنه (استعادة الإجراء: {revertedLogsCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards in Exact KAS Excel Palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          style={{ backgroundColor: '#D9E1F2', color: '#000000' }}
          className="p-3.5 rounded-[12px] border-2 border-[#000000] flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold">إجمالي التعديلات المسجلة</div>
            <div className="text-xl font-bold font-mono mt-1">{logs.length}</div>
          </div>
          <FileSpreadsheet className="w-7 h-7 text-[#4472C4]" />
        </div>

        <div
          style={{ backgroundColor: '#A9D18E', color: '#000000' }}
          className="p-3.5 rounded-[12px] border-2 border-[#000000] flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold">التعديلات النشطة (سارية المفعول)</div>
            <div className="text-xl font-bold font-mono mt-1">{activeLogsCount}</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-[#006600]" />
        </div>

        <div
          style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
          className="p-3.5 rounded-[12px] border-2 border-[#000000] flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold">إجراءات تم التراجع عنها</div>
            <div className="text-xl font-bold font-mono mt-1">{revertedLogsCount}</div>
          </div>
          <AlertTriangle className="w-7 h-7 text-[#9C0006]" />
        </div>

        <div
          style={{ backgroundColor: '#00B0F0', color: '#000000' }}
          className="p-3.5 rounded-[12px] border-2 border-[#000000] flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold">الموظفون المسجلون بالسجل</div>
            <div className="text-xl font-bold font-mono mt-1">
              {uniqueActors.length || 1}
            </div>
          </div>
          <UserCheck className="w-7 h-7 text-[#000000]" />
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#ffffff] p-3 rounded-[14px] border-2 border-[#000000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#475569] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الموظف (أحمد / حاتم)، رقم المنافسة، اسم المؤسسة، أو تفاصيل التعديل..."
              className="w-full pr-9 pl-3 py-1.5 rounded-[10px] border border-[#000000] bg-[#f8fafc] text-xs font-bold text-[#000000]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#000000]" />
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-[10px] border border-[#000000] bg-[#D9E1F2] text-xs font-bold text-[#000000]"
            >
              <option value="ALL">جميع الموظفين ({uniqueActors.length})</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: `الكل (${logs.length})` },
              { id: 'ACTIVE', label: `ساري المفعول (${activeLogsCount})` },
              { id: 'REVERTED', label: `تم التراجع عنه (${revertedLogsCount})` },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              style={{
                backgroundColor: statusFilter === st.id ? '#00CC00' : '#f1f5f9',
                color: '#000000',
              }}
              className="px-3 py-1.5 rounded-[10px] border border-[#000000] text-xs font-bold cursor-pointer"
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Excel-Styled Table */}
      <div className="bg-[#ffffff] rounded-[14px] border-2 border-[#000000] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table
            dir="rtl"
            className="w-full border-collapse text-right text-xs"
            style={{ fontFamily: 'Arial, Tahoma, sans-serif' }}
          >
            <thead>
              <tr>
                <th
                  style={{ backgroundColor: '#00CC00', color: '#000000' }}
                  className="p-2.5 border border-[#000000] text-center font-bold w-12"
                >
                  # ▾
                </th>
                <th
                  style={{ backgroundColor: '#4472C4', color: '#FFFFFF' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[140px]"
                >
                  التاريخ والوقت ▾
                </th>
                <th
                  style={{ backgroundColor: '#4472C4', color: '#FFFFFF' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[200px]"
                >
                  الموظف القائم بالتعديل ▾
                </th>
                <th
                  style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[140px]"
                >
                  القسم المصدر ▾
                </th>
                <th
                  style={{ backgroundColor: '#00B0F0', color: '#000000' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[110px]"
                >
                  نوع الإجراء ▾
                </th>
                <th
                  style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[150px]"
                >
                  الورقة / الهدف ▾
                </th>
                <th
                  style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                  className="p-2.5 border border-[#000000] text-right font-bold min-w-[270px]"
                >
                  تفاصيل التعديل الذي تم ▾
                </th>
                <th
                  style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[135px]"
                >
                  حالة الإجراء ▾
                </th>
                <th
                  style={{ backgroundColor: '#006600', color: '#FFFFFF' }}
                  className="p-2.5 border border-[#000000] text-center font-bold min-w-[215px]"
                >
                  خيارات التراجع / استعادة الإجراء ▾
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ backgroundColor: '#D9E1F2', color: '#000000' }}
                    className="p-8 border border-[#000000] text-center font-bold text-sm"
                  >
                    لا توجد تعديلات مسجلة بعد في هذا العرض — قم بتعديل أي خلية أو إضافة بند أو مؤسسة ليظهر السجل هنا فوراً مع خيار التراجع عنه.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry, idx) => {
                  const badge = getActionBadgeStyle(entry.actionType);
                  const formattedTime = new Date(entry.timestamp).toLocaleString('ar-SA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        backgroundColor: entry.reverted ? '#f8fafc' : '#D9E1F2',
                        color: '#000000',
                      }}
                    >
                      <td className="p-2 border border-[#000000] text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-2 border border-[#000000] text-center font-mono font-bold text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#4472C4]" />
                          <span>{formattedTime}</span>
                        </span>
                      </td>
                      <td className="p-2 border border-[#000000] font-bold">
                        <div className="text-xs text-[#000000]">{entry.actorName}</div>
                        <div className="text-[10.5px] text-[#1e293b] font-mono">
                          {entry.actorEmail}
                        </div>
                        <div className="text-[10px] text-[#334155]">{entry.actorRole}</div>
                      </td>
                      <td className="p-2 border border-[#000000] text-center font-bold text-[11px]">
                        {entry.sourceSection}
                      </td>
                      <td className="p-2 border border-[#000000] text-center">
                        <span
                          style={{ backgroundColor: badge.bg, color: badge.fg }}
                          className="px-2.5 py-1 rounded-[6px] border border-[#000000] text-[11px] font-bold inline-block"
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-2 border border-[#000000] text-center font-bold">
                        {entry.targetLabel}
                      </td>
                      <td className="p-2 border border-[#000000] font-bold text-xs">
                        {entry.actionSummary}
                      </td>
                      <td className="p-2 border border-[#000000] text-center font-bold">
                        {entry.reverted ? (
                          <div className="space-y-0.5">
                            <span
                              style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
                              className="px-2 py-0.5 rounded-[6px] border border-[#000000] text-[10.5px] font-bold inline-block"
                            >
                              تم التراجع عنه
                            </span>
                            {entry.revertedBy && (
                              <div className="text-[10px] text-[#475569]">
                                بواسطة: {entry.revertedBy}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                            className="px-2.5 py-0.5 rounded-[6px] border border-[#000000] text-[11px] font-bold inline-block"
                          >
                            ساري المفعول ✓
                          </span>
                        )}
                      </td>
                      <td className="p-2 border border-[#000000] text-center">
                        {!entry.reverted ? (
                          <button
                            type="button"
                            onClick={() => handleRevertEntry(entry)}
                            style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
                            className="px-3 py-1.5 rounded-[8px] border border-[#000000] text-[11px] font-bold inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                            title="التراجع عن هذا التعديل واستعادة البيانات كما كانت قبله"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>التراجع عن هذا التعديل</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUndoRevertEntry(entry)}
                            style={{ backgroundColor: '#00CC00', color: '#000000' }}
                            className="px-3 py-1.5 rounded-[8px] border border-[#000000] text-[11px] font-bold inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
                            title="التراجع عن الإرجاع وإعادة تطبيق هذا التعديل"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>التراجع عن الإرجاع (استعادة)</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KasModificationAuditLogSection;
