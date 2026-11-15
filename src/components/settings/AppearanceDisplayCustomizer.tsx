import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Check,
  RotateCcw,
  Type,
  Layout,
  SlidersHorizontal,
  Contrast,
  PanelRight,
  Square,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  APPEARANCE_CHANGED_EVENT,
  APPEARANCE_PALETTES,
  AppearanceSettings,
  CornerRadiusMode,
  FontScale,
  IconColorMode,
  LayoutDensity,
  SidebarWidthMode,
  SurfaceTone,
  ThemeMode,
  loadAppearanceSettings,
  normalizeHexColor,
  resetAppearanceSettings,
  resolveEffectiveThemeMode,
  resolvePaletteColors,
  saveAppearanceSettings,
} from '../../services/appearanceSettingsService';

export const AppearanceDisplayCustomizer: React.FC = () => {
  const { addNotification, setUiTheme, uiTheme } = useAppStore();
  const [settings, setSettings] = useState<AppearanceSettings>(() => loadAppearanceSettings());

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<AppearanceSettings>).detail;
      if (detail) {
        setSettings(detail);
      }
    };
    window.addEventListener(APPEARANCE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(APPEARANCE_CHANGED_EVENT, onChanged);
  }, []);

  const updateSettings = (
    partial: Partial<AppearanceSettings>,
    notifyMessage?: string
  ) => {
    const next = saveAppearanceSettings(partial);
    setSettings(next);

    // Sync Header theme pill (`corporate-color` vs `monochrome`) when palette or icon mode changes
    if (partial.paletteId !== undefined) {
      if (partial.paletteId === 'mobbin-ink' && next.iconColorMode === 'monochrome') {
        setUiTheme('monochrome');
      } else {
        setUiTheme('corporate-color');
      }
    }

    if (notifyMessage) {
      addNotification({
        title: 'تحديث المظهر والعرض',
        message: notifyMessage,
        type: 'success',
      });
    }
  };

  const handleReset = () => {
    const def = resetAppearanceSettings();
    setSettings(def);
    setUiTheme('corporate-color');
    addNotification({
      title: 'استعادة التصميم الافتراضي',
      message: 'تمت إعادة ضبط جميع الألوان والمقاسات وإعدادات العرض إلى القيم القياسية المعتمدة.',
      type: 'info',
    });
  };

  const activePalette = resolvePaletteColors(settings);
  const effectiveTheme = resolveEffectiveThemeMode(settings.themeMode);

  return (
    <div className="space-y-6" data-slot="appearance-display-studio">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: activePalette.primaryHex }}
          >
            <Palette className="w-5 h-5" data-force-colored="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#141414] m-0">
              تخصيص الألوان والمظهر وإعدادات العرض الشاملة
            </h2>
            <p className="text-xs text-[#707070] mt-0.5 m-0">
              تحكّم في لوحة ألوان النظام، الوضع الليلي والنهاري، حجم الخط، كثافة الجداول، وعرض القائمة الجانبية مباشرة.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-slot="appearance-reset-btn"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة الافتراضي</span>
        </button>
      </div>

      {/* Live Interactive Preview Banner */}
      <div
        data-slot="appearance-live-preview"
        className="rounded-[24px] border border-[#e0e0e0] p-5 transition-all"
        style={{
          backgroundColor: effectiveTheme === 'dark' ? '#161a23' : 'var(--color-canvas)',
          borderRadius:
            settings.borderRadiusMode === 'sharp'
              ? '10px'
              : settings.borderRadiusMode === 'soft'
              ? '32px'
              : '24px',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" style={{ color: activePalette.primaryHex }} />
            <span className="text-xs font-bold text-[#141414]">
              معاينة حية للتصميم الحالي (Live System Preview)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: activePalette.primaryHex }}
            >
              {settings.paletteId === 'custom'
                ? `لون مخصص ${activePalette.primaryHex}`
                : APPEARANCE_PALETTES.find((p) => p.id === settings.paletteId)?.nameAr}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]">
              {effectiveTheme === 'dark' ? 'داكن (Dark)' : 'نهاري (Light)'} • {settings.fontScale.toUpperCase()} • {settings.density}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#707070] font-semibold">إجمالي التدفق النقدي</div>
              <div className="text-base font-bold text-[#141414] mt-0.5">148,500 ⃁</div>
            </div>
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: activePalette.primaryHex }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#707070] font-semibold">نمط الأيقونات الصغيرة</div>
              <div className="text-xs font-bold text-[#141414] mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>{settings.iconColorMode === 'colored' ? 'أيقونات ملونة دلالية' : 'أيقونات أحادية موحدة'}</span>
              </div>
            </div>
            <button
              type="button"
              data-preserve-mono="true"
              onClick={() =>
                updateSettings({
                  iconColorMode: settings.iconColorMode === 'colored' ? 'monochrome' : 'colored',
                })
              }
              className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
            >
              تبديل
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#707070] font-semibold">نمط الثيم المؤسسي</div>
              <div className="text-xs font-bold text-[#141414] mt-1">
                {uiTheme === 'corporate-color' ? 'هوية الشركات الملونة' : 'الوضع الأحادي القياسي'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUiTheme(uiTheme === 'corporate-color' ? 'monochrome' : 'corporate-color')}
              className="px-3 py-1.5 rounded-full text-white text-[11px] font-bold cursor-pointer"
              style={{ backgroundColor: activePalette.primaryHex }}
            >
              زر تجريبي
            </button>
          </div>
        </div>
      </div>

      {/* 1. Theme Mode (Light / Dark / System) */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
          <Sun className="w-4 h-4" />
          <span>وضع الإضاءة العام (Theme Mode)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                id: 'light' as ThemeMode,
                label: 'الوضع النهاري الفاتح',
                desc: 'خلفية ناصعة للوضوح المكتبي والمستندات',
                icon: Sun,
              },
              {
                id: 'dark' as ThemeMode,
                label: 'الوضع الليلي الداكن',
                desc: 'تباين مريح للعين في العمل المسائي',
                icon: Moon,
              },
              {
                id: 'system' as ThemeMode,
                label: 'تلقائي حسب نظام التشغيل',
                desc: 'يتطابق تلقائياً مع إعدادات Windows / Mac',
                icon: Monitor,
              },
            ] as const
          ).map((mode) => {
            const Icon = mode.icon;
            const selected = settings.themeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                data-slot={`theme-mode-${mode.id}`}
                onClick={() => updateSettings({ themeMode: mode.id })}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                  selected
                    ? 'border-[#141414] bg-[#f3f3f3] ring-1 ring-[#141414]'
                    : 'border-[#e0e0e0] bg-[#ffffff] hover:bg-[#f3f3f3]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={
                    selected
                      ? { backgroundColor: activePalette.primaryHex, color: '#ffffff' }
                      : { backgroundColor: '#f3f3f3', color: '#141414' }
                  }
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141414]">{mode.label}</div>
                  <div className="text-[11px] text-[#707070] mt-0.5">{mode.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Brand Color Presets + Custom Color Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            <span>لوحة الألوان الرئيسية للنظام والأزرار والشريط الجانبي</span>
          </label>
          <span className="text-[11px] text-[#707070]">
            يطبق فوراً على القوائم والأزرار والبطاقات ولا يؤثر على الطباعة الورقية A4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {APPEARANCE_PALETTES.map((preset) => {
            const isSelected = settings.paletteId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-slot={`palette-preset-${preset.id}`}
                onClick={() =>
                  updateSettings(
                    { paletteId: preset.id },
                    `تم تطبيق لوحة الألوان (${preset.nameAr}).`
                  )
                }
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-[#141414] bg-[#f3f3f3] ring-1 ring-[#141414]'
                    : 'border-[#e0e0e0] bg-[#ffffff] hover:bg-[#f3f3f3]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-7 h-7 rounded-full shrink-0 border border-black/10 flex items-center justify-center text-white"
                    style={{ backgroundColor: preset.primaryHex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#141414] truncate">{preset.nameAr}</div>
                    <div className="text-[10px] text-[#707070] font-mono">{preset.primaryHex}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Custom Hex Color Card */}
          <div
            className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2 ${
              settings.paletteId === 'custom'
                ? 'border-[#141414] bg-[#f3f3f3] ring-1 ring-[#141414]'
                : 'border-[#e0e0e0] bg-[#ffffff]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <input
                type="color"
                aria-label="اختيار لون مخصص للنظام"
                data-slot="custom-primary-color-input"
                value={settings.customPrimaryHex}
                onChange={(e) =>
                  updateSettings({
                    paletteId: 'custom',
                    customPrimaryHex: normalizeHexColor(e.target.value, '#1d4ed8'),
                  })
                }
                className="w-8 h-8 p-0 border border-[#e0e0e0] rounded-full cursor-pointer shrink-0 bg-transparent"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#141414]">لون مخصص حر</div>
                <div className="text-[10px] text-[#707070] font-mono">{settings.customPrimaryHex}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ paletteId: 'custom' }, 'تم تفعيل اللون المخصص للواجهة.')}
              className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414] cursor-pointer shrink-0"
            >
              تطبيق
            </button>
          </div>
        </div>
      </div>

      {/* 3. Surface Tone & Small Icon Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5">
          <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
            <Layout className="w-4 h-4" />
            <span>درجة خلفية الصفحات (الوضع النهاري)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'pure-white' as SurfaceTone, label: 'أبيض نقي', swatch: '#ffffff' },
                { id: 'warm-ivory' as SurfaceTone, label: 'عاجي دافئ', swatch: '#fbfaf6' },
                { id: 'cool-mist' as SurfaceTone, label: 'جليدي ناعم', swatch: '#f8fafc' },
              ] as const
            ).map((surf) => {
              const selected = settings.surfaceTone === surf.id;
              return (
                <button
                  key={surf.id}
                  type="button"
                  data-slot={`surface-tone-${surf.id}`}
                  onClick={() => updateSettings({ surfaceTone: surf.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selected
                      ? 'border-[#141414] bg-[#ffffff] ring-1 ring-[#141414]'
                      : 'border-[#e0e0e0] bg-[#ffffff]/70 hover:bg-[#ffffff]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-1 border border-[#d4d4d4]"
                    style={{ backgroundColor: surf.swatch }}
                  />
                  <div className="text-[11px] font-bold text-[#141414]">{surf.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5">
          <label className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>ألوان الأيقونات الصغيرة في النظام</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'colored' as IconColorMode,
                  label: 'أيقونات ملونة دلالية',
                  desc: 'ألوان مميزة للإضافة والطباعة والتنبيه والحذف',
                },
                {
                  id: 'monochrome' as IconColorMode,
                  label: 'أيقونات أحادية كلاسيكية',
                  desc: 'توحيد جميع الأيقونات الصغيرة بلون النص',
                },
              ] as const
            ).map((mode) => {
              const selected = settings.iconColorMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  data-slot={`icon-mode-${mode.id}`}
                  onClick={() => updateSettings({ iconColorMode: mode.id })}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    selected
                      ? 'border-[#141414] bg-[#ffffff] ring-1 ring-[#141414]'
                      : 'border-[#e0e0e0] bg-[#ffffff]/70 hover:bg-[#ffffff]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#141414]">{mode.label}</div>
                  <div className="text-[10px] text-[#707070] mt-0.5">{mode.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Display Scale, Density, Sidebar Width & Corner Geometry */}
      <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e0e0e0] pb-2.5">
          <SlidersHorizontal className="w-4 h-4" />
          <h3 className="text-xs font-bold text-[#141414] m-0">
            إعدادات العرض والمقاسات وتخطيط الشاشة (Display & Layout)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Font & UI Scale */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              <span>حجم الخط ومقياس الواجهة</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'sm' as FontScale, label: 'صغير', sub: '92%' },
                  { id: 'md' as FontScale, label: 'قياسي', sub: '100%' },
                  { id: 'lg' as FontScale, label: 'كبير', sub: '106%' },
                  { id: 'xl' as FontScale, label: 'كبير جداً', sub: '112%' },
                ] as const
              ).map((fs) => {
                const selected = settings.fontScale === fs.id;
                return (
                  <button
                    key={fs.id}
                    type="button"
                    data-slot={`font-scale-${fs.id}`}
                    onClick={() => updateSettings({ fontScale: fs.id })}
                    className={`py-2 px-2 rounded-xl border text-center cursor-pointer transition-all ${
                      selected
                        ? 'border-[#141414] bg-[#141414] text-white'
                        : 'border-[#e0e0e0] bg-[#ffffff] text-[#141414] hover:bg-[#fafafa]'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{fs.label}</div>
                    <div className="text-[10px] opacity-80 font-mono">{fs.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table & Card Density */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5" />
              <span>كثافة الجداول والبطاقات</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'compact' as LayoutDensity, label: 'مضغوط (Compact)' },
                  { id: 'comfortable' as LayoutDensity, label: 'متوازن (قياسي)' },
                  { id: 'spacious' as LayoutDensity, label: 'موسّع (مريح)' },
                ] as const
              ).map((den) => {
                const selected = settings.density === den.id;
                return (
                  <button
                    key={den.id}
                    type="button"
                    data-slot={`density-${den.id}`}
                    onClick={() => updateSettings({ density: den.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-[11px] font-bold cursor-pointer transition-all ${
                      selected
                        ? 'border-[#141414] bg-[#141414] text-white'
                        : 'border-[#e0e0e0] bg-[#ffffff] text-[#141414] hover:bg-[#fafafa]'
                    }`}
                  >
                    {den.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
              <PanelRight className="w-3.5 h-3.5" />
              <span>حجم القائمة الجانبية الافتراضي</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'default' as SidebarWidthMode, label: 'قياسي (280px)' },
                  { id: 'wide' as SidebarWidthMode, label: 'عريض (316px)' },
                  { id: 'compact' as SidebarWidthMode, label: 'مطوي (أيقونات)' },
                ] as const
              ).map((sb) => {
                const selected = settings.sidebarMode === sb.id;
                return (
                  <button
                    key={sb.id}
                    type="button"
                    data-slot={`sidebar-mode-${sb.id}`}
                    onClick={() => updateSettings({ sidebarMode: sb.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-[11px] font-bold cursor-pointer transition-all ${
                      selected
                        ? 'border-[#141414] bg-[#141414] text-white'
                        : 'border-[#e0e0e0] bg-[#ffffff] text-[#141414] hover:bg-[#fafafa]'
                    }`}
                  >
                    {sb.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corner Radius */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5" />
              <span>استدارة الحواف والبطاقات</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'sharp' as CornerRadiusMode, label: 'رسمي حاد' },
                  { id: 'modern' as CornerRadiusMode, label: 'عصري قياسي' },
                  { id: 'soft' as CornerRadiusMode, label: 'دائري ناعم' },
                ] as const
              ).map((cr) => {
                const selected = settings.borderRadiusMode === cr.id;
                return (
                  <button
                    key={cr.id}
                    type="button"
                    data-slot={`radius-mode-${cr.id}`}
                    onClick={() => updateSettings({ borderRadiusMode: cr.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-[11px] font-bold cursor-pointer transition-all ${
                      selected
                        ? 'border-[#141414] bg-[#141414] text-white'
                        : 'border-[#e0e0e0] bg-[#ffffff] text-[#141414] hover:bg-[#fafafa]'
                    }`}
                  >
                    {cr.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* High Contrast Borders Toggle */}
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#ffffff] border border-[#e0e0e0] cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Contrast className="w-4 h-4 text-[#141414]" />
            <div>
              <span className="text-xs font-bold text-[#141414] block">
                تباين حدود عالٍ لوضوح الجداول والحقول (High-Contrast Borders)
              </span>
              <span className="text-[11px] text-[#707070] block">
                يقوّي خطوط الفواصل وحواف خانات الإدخال للشاشات العالية الإضاءة
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.highContrastBorders}
            onChange={(e) => updateSettings({ highContrastBorders: e.target.checked })}
            className="w-4 h-4 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};

export default AppearanceDisplayCustomizer;
