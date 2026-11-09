import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, Plus, Trash2, CheckCircle2, 
  Clock, MapPin, Laptop, AlertTriangle, Key, Search, ToggleLeft, ToggleRight
} from 'lucide-react';
import { IPWhitelistEntry, DEFAULT_IP_WHITELIST } from '../../services/securityAuditService';

export const IPWhitelistManager: React.FC = () => {
  const [whitelist, setWhitelist] = useState<IPWhitelistEntry[]>(DEFAULT_IP_WHITELIST);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New IP Form State
  const [newIp, setNewIp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isTemp, setIsTemp] = useState(false);
  const [expiryDays, setExpiryDays] = useState('30');

  const handleToggle = (id: string) => {
    setWhitelist(prev =>
      prev.map(item => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  const handleDelete = (id: string) => {
    setWhitelist(prev => prev.filter(item => item.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim() || !newLabel.trim()) return;

    const expiryDate = isTemp 
      ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined;

    const newEntry: IPWhitelistEntry = {
      id: `IP-${Date.now().toString().slice(-4)}`,
      ipAddress: newIp.trim(),
      label: newLabel.trim(),
      addedBy: 'سليمان السليم (المدير العام)',
      addedAt: new Date().toISOString().split('T')[0],
      expiresAt: expiryDate,
      isTemporary: isTemp,
      isActive: true,
    };

    setWhitelist([newEntry, ...whitelist]);
    setNewIp('');
    setNewLabel('');
    setIsTemp(false);
    setShowAddModal(false);
  };

  const filtered = whitelist.filter(
    item =>
      item.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#141414]" />
            <h3 className="text-base font-bold text-zinc-900 m-0">إدارة القائمة البيضاء للعناوين والشبكات الموثوقة (IP Whitelist)</h3>
          </div>
          <p className="text-xs text-[#707070] mt-1">
            تقييد الوصول للنظام من شبكات الفروع المعتمدة أو استثناءات الـ VPN المؤقتة لحماية بيانات المجموعة
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="button-primary-pill text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عنوان / نطاق جديد</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="text-xs font-medium text-[#141414] mb-1">الشبكات النشطة والمسموحة</div>
          <div className="text-2xl font-bold font-mono text-[#141414]">
            {whitelist.filter(i => i.isActive).length}
          </div>
          <div className="text-[10px] text-[#141414] mt-1">تمرير حركة المرور فورياً</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="text-xs font-medium text-[#141414] mb-1">استثناءات مؤقتة (سفر / مهام)</div>
          <div className="text-2xl font-bold font-mono text-[#141414]">
            {whitelist.filter(i => i.isTemporary && i.isActive).length}
          </div>
          <div className="text-[10px] text-[#141414] mt-1">تنتهي صلاحيتها تلقائياً</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200">
          <div className="text-xs font-medium text-zinc-700 mb-1">قواعد معطلة مؤقتاً</div>
          <div className="text-2xl font-bold font-mono text-zinc-800">
            {whitelist.filter(i => !i.isActive).length}
          </div>
          <div className="text-[10px] text-[#707070] mt-1">محظورة من الوصول</div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#707070] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث بعنوان IP أو اسم الفرع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-400"
            />
          </div>
          <div className="text-xs text-[#707070] font-mono">
            {filtered.length} عنوان مدرج
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200 text-right">
                <th className="p-3">عنوان IP / النطاق المسموح</th>
                <th className="p-3">الوصف / الفرع المخصص</th>
                <th className="p-3 text-center">نوع الاستثناء</th>
                <th className="p-3 text-center">أضيف بواسطة</th>
                <th className="p-3 text-center">تاريخ الإضافة</th>
                <th className="p-3 text-center">تاريخ الانتهاء</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-zinc-900 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${entry.isActive ? 'bg-[#141414]' : 'bg-zinc-300'}`} />
                    {entry.ipAddress}
                  </td>
                  <td className="p-3 text-zinc-800 font-medium">{entry.label}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      entry.isTemporary 
                        ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' 
                        : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                    }`}>
                      {entry.isTemporary ? 'مؤقت' : 'دائم (فرع)'}
                    </span>
                  </td>
                  <td className="p-3 text-center text-zinc-600 text-[11px]">{entry.addedBy}</td>
                  <td className="p-3 text-center font-mono text-zinc-600">{entry.addedAt}</td>
                  <td className="p-3 text-center font-mono text-[11px]">
                    {entry.expiresAt ? (
                      <span className="text-[#141414] font-bold">{entry.expiresAt}</span>
                    ) : (
                      <span className="text-[#707070]">غير محدد (دائم)</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(entry.id)}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      title={entry.isActive ? 'تعطيل القاعدة' : 'تفعيل القاعدة'}
                    >
                      {entry.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[#141414] bg-[#f3f3f3] px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#707070] bg-zinc-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          معطل
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-[#141414] hover:text-[#141414] p-1 rounded-md hover:bg-[#eaeaea] transition-colors"
                      title="حذف من القائمة البيضاء"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <h4 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#141414]" />
              <span>إضافة عنوان IP موثوق للقائمة البيضاء</span>
            </h4>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">عنوان IP أو النطاق الفرعي (CIDR)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 197.34.110.42 أو 185.12.90.0/24"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg font-mono focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">اسم الموقع / وصف القاعدة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فرع الدمام - شبكة الإدارة"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={isTemp}
                    onChange={e => setIsTemp(e.target.checked)}
                    className="rounded-sm border-zinc-300 text-[#141414] focus:ring-[#141414]/20"
                  />
                  <span>استثناء مؤقت (ينتهي تلقائياً)</span>
                </label>

                {isTemp && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] text-zinc-600 mb-1">فترة الصلاحية (أيام):</label>
                    <select
                      value={expiryDays}
                      onChange={e => setExpiryDays(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-zinc-300 rounded-lg"
                    >
                      <option value="7">أسبوع واحد (7 أيام)</option>
                      <option value="14">أسبوعان (14 يوماً)</option>
                      <option value="30">شهر واحد (30 يوماً)</option>
                      <option value="90">3 أشهر (90 يوماً)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs px-5 py-2"
                >
                  حفظ واعتماد النطاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
