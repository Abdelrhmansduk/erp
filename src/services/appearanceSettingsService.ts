/**
 * Enterprise Appearance, Color Palette & Display Customization Engine
 * Persists user-configured colors, light/dark theme, typography scale,
 * layout density, sidebar width, corner radius, icon color mode, and
 * high-contrast borders, applying them live to the DOM without reload.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export type ColorPaletteId =
  | 'mobbin-ink'
  | 'saudi-emerald'
  | 'royal-blue'
  | 'imperial-violet'
  | 'amber-gold'
  | 'burgundy-ruby'
  | 'teal-ocean'
  | 'custom';

export type SurfaceTone = 'pure-white' | 'warm-ivory' | 'cool-mist';
export type IconColorMode = 'colored' | 'monochrome';
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type SidebarWidthMode = 'default' | 'wide' | 'compact';
export type CornerRadiusMode = 'sharp' | 'modern' | 'soft';

export interface AppearancePalettePreset {
  id: Exclude<ColorPaletteId, 'custom'>;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  primaryHex: string;
  hoverHex: string;
  secondaryHex: string;
  softBgHex: string;
}

export interface AppearanceSettings {
  themeMode: ThemeMode;
  paletteId: ColorPaletteId;
  customPrimaryHex: string;
  surfaceTone: SurfaceTone;
  iconColorMode: IconColorMode;
  fontScale: FontScale;
  density: LayoutDensity;
  sidebarMode: SidebarWidthMode;
  borderRadiusMode: CornerRadiusMode;
  highContrastBorders: boolean;
  updatedAt: string;
}

export const APPEARANCE_STORAGE_KEY = 'ALSULAIM_APPEARANCE_SETTINGS_V1';
export const APPEARANCE_CHANGED_EVENT = 'alsulaim-appearance-changed';

export const APPEARANCE_PALETTES: AppearancePalettePreset[] = [
  {
    id: 'mobbin-ink',
    nameAr: 'الحبر التنفيذي الكلاسيكي',
    nameEn: 'Executive Monochrome Ink',
    descriptionAr: 'التصميم القياسي الداكن الأحادي عالي الوضوح',
    primaryHex: '#141414',
    hoverHex: '#262626',
    secondaryHex: '#404040',
    softBgHex: '#f3f3f3',
  },
  {
    id: 'saudi-emerald',
    nameAr: 'الأخضر الزمردي السعودي',
    nameEn: 'Saudi Emerald Sovereign',
    descriptionAr: 'هوية وطنية راقية للأقسام الإدارية والعمليات',
    primaryHex: '#047857',
    hoverHex: '#065f46',
    secondaryHex: '#0d9488',
    softBgHex: '#ecfdf5',
  },
  {
    id: 'royal-blue',
    nameAr: 'الأزرق الملكي السحابي',
    nameEn: 'Royal Sapphire Blue',
    descriptionAr: 'تباين أزرق رسمي للتحليلات والمحاسبة',
    primaryHex: '#1d4ed8',
    hoverHex: '#1e40af',
    secondaryHex: '#0284c7',
    softBgHex: '#eff6ff',
  },
  {
    id: 'imperial-violet',
    nameAr: 'البنفسجي المؤسسي الملكي',
    nameEn: 'Imperial Violet',
    descriptionAr: 'إبراز واضح للأنظمة الذكية والمستندات',
    primaryHex: '#6d28d9',
    hoverHex: '#5b21b6',
    secondaryHex: '#7c3aed',
    softBgHex: '#f5f3ff',
  },
  {
    id: 'amber-gold',
    nameAr: 'الذهبي الصحراوي الفاخر',
    nameEn: 'Executive Desert Gold',
    descriptionAr: 'طابع ذهبي دافئ للمناقصات والعقود',
    primaryHex: '#b45309',
    hoverHex: '#92400e',
    secondaryHex: '#d97706',
    softBgHex: '#fffbeb',
  },
  {
    id: 'burgundy-ruby',
    nameAr: 'الياقوتي القرمزي القيادي',
    nameEn: 'Burgundy Ruby',
    descriptionAr: 'هوية تنفيذية مميزة للوحات المتابعة والرقابة',
    primaryHex: '#be123c',
    hoverHex: '#9f1239',
    secondaryHex: '#e11d48',
    softBgHex: '#fff1f2',
  },
  {
    id: 'teal-ocean',
    nameAr: 'الفيروزي المحيطي الهادئ',
    nameEn: 'Deep Ocean Teal',
    descriptionAr: 'مريح للعين في جلسات العمل الطويلة',
    primaryHex: '#0f766e',
    hoverHex: '#115e59',
    secondaryHex: '#0284c7',
    softBgHex: '#f0fdfa',
  },
];

const FONT_SCALE_PX: Record<FontScale, string> = {
  sm: '14.5px',
  md: '16px',
  lg: '17px',
  xl: '18px',
};

const SIDEBAR_WIDTH_PX: Record<SidebarWidthMode, string> = {
  default: '280px',
  wide: '316px',
  compact: '76px',
};

const RADIUS_MD_PX: Record<CornerRadiusMode, { md: string; sm: string }> = {
  sharp: { md: '10px', sm: '6px' },
  modern: { md: '24px', sm: '14px' },
  soft: { md: '32px', sm: '20px' },
};

const SURFACE_TONES_LIGHT: Record<
  SurfaceTone,
  { canvas: string; canvasSoft: string; field: string; hairline: string; hairlineSoft: string }
> = {
  'pure-white': {
    canvas: '#ffffff',
    canvasSoft: '#f3f3f3',
    field: '#f0f0f0',
    hairline: '#e0e0e0',
    hairlineSoft: '#f0f0f0',
  },
  'warm-ivory': {
    canvas: '#fbfaf6',
    canvasSoft: '#f4f0e6',
    field: '#efeade',
    hairline: '#e2dccb',
    hairlineSoft: '#eee8d8',
  },
  'cool-mist': {
    canvas: '#f8fafc',
    canvasSoft: '#eef2f6',
    field: '#e8edf3',
    hairline: '#d6dee8',
    hairlineSoft: '#e5ebf2',
  },
};

export function normalizeHexColor(input: string | undefined, fallback = '#1d4ed8'): string {
  const raw = (input || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function adjustHexBrightness(hex: string, factor: number): string {
  const clean = normalizeHexColor(hex, '#141414').slice(1);
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = normalizeHexColor(hex, '#141414').slice(1);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getDefaultAppearanceSettings(): AppearanceSettings {
  return {
    themeMode: 'light',
    paletteId: 'mobbin-ink',
    customPrimaryHex: '#1d4ed8',
    surfaceTone: 'pure-white',
    iconColorMode: 'colored',
    fontScale: 'md',
    density: 'comfortable',
    sidebarMode: 'default',
    borderRadiusMode: 'modern',
    highContrastBorders: false,
    updatedAt: new Date(0).toISOString(),
  };
}

export function resolvePaletteColors(settings: AppearanceSettings): {
  primaryHex: string;
  hoverHex: string;
  secondaryHex: string;
  softBgHex: string;
  isCustomBrand: boolean;
} {
  if (settings.paletteId === 'custom') {
    const primary = normalizeHexColor(settings.customPrimaryHex, '#1d4ed8');
    return {
      primaryHex: primary,
      hoverHex: adjustHexBrightness(primary, 0.82),
      secondaryHex: adjustHexBrightness(primary, 1.15),
      softBgHex: hexToRgba(primary, 0.09),
      isCustomBrand: primary !== '#141414',
    };
  }

  const preset =
    APPEARANCE_PALETTES.find((p) => p.id === settings.paletteId) || APPEARANCE_PALETTES[0];
  return {
    primaryHex: preset.primaryHex,
    hoverHex: preset.hoverHex,
    secondaryHex: preset.secondaryHex,
    softBgHex: preset.softBgHex,
    isCustomBrand: preset.id !== 'mobbin-ink',
  };
}

export function resolveEffectiveThemeMode(themeMode: ThemeMode): 'light' | 'dark' {
  if (themeMode === 'dark') return 'dark';
  if (themeMode === 'light') return 'light';
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    // ignore
  }
  return 'light';
}

function sanitizeSettings(raw: Partial<AppearanceSettings> | null | undefined): AppearanceSettings {
  const def = getDefaultAppearanceSettings();
  if (!raw || typeof raw !== 'object') return def;

  const validThemeModes: ThemeMode[] = ['light', 'dark', 'system'];
  const validPalettes: ColorPaletteId[] = [
    'mobbin-ink',
    'saudi-emerald',
    'royal-blue',
    'imperial-violet',
    'amber-gold',
    'burgundy-ruby',
    'teal-ocean',
    'custom',
  ];
  const validSurfaces: SurfaceTone[] = ['pure-white', 'warm-ivory', 'cool-mist'];
  const validIconModes: IconColorMode[] = ['colored', 'monochrome'];
  const validFontScales: FontScale[] = ['sm', 'md', 'lg', 'xl'];
  const validDensities: LayoutDensity[] = ['compact', 'comfortable', 'spacious'];
  const validSidebars: SidebarWidthMode[] = ['default', 'wide', 'compact'];
  const validRadius: CornerRadiusMode[] = ['sharp', 'modern', 'soft'];

  return {
    themeMode: validThemeModes.includes(raw.themeMode as ThemeMode)
      ? (raw.themeMode as ThemeMode)
      : def.themeMode,
    paletteId: validPalettes.includes(raw.paletteId as ColorPaletteId)
      ? (raw.paletteId as ColorPaletteId)
      : def.paletteId,
    customPrimaryHex: normalizeHexColor(raw.customPrimaryHex, def.customPrimaryHex),
    surfaceTone: validSurfaces.includes(raw.surfaceTone as SurfaceTone)
      ? (raw.surfaceTone as SurfaceTone)
      : def.surfaceTone,
    iconColorMode: validIconModes.includes(raw.iconColorMode as IconColorMode)
      ? (raw.iconColorMode as IconColorMode)
      : def.iconColorMode,
    fontScale: validFontScales.includes(raw.fontScale as FontScale)
      ? (raw.fontScale as FontScale)
      : def.fontScale,
    density: validDensities.includes(raw.density as LayoutDensity)
      ? (raw.density as LayoutDensity)
      : def.density,
    sidebarMode: validSidebars.includes(raw.sidebarMode as SidebarWidthMode)
      ? (raw.sidebarMode as SidebarWidthMode)
      : def.sidebarMode,
    borderRadiusMode: validRadius.includes(raw.borderRadiusMode as CornerRadiusMode)
      ? (raw.borderRadiusMode as CornerRadiusMode)
      : def.borderRadiusMode,
    highContrastBorders:
      typeof raw.highContrastBorders === 'boolean'
        ? raw.highContrastBorders
        : def.highContrastBorders,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
  };
}

export function loadAppearanceSettings(): AppearanceSettings {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
      if (raw) {
        return sanitizeSettings(JSON.parse(raw) as Partial<AppearanceSettings>);
      }
    }
  } catch {
    // ignore malformed storage
  }
  return getDefaultAppearanceSettings();
}

export function applyAppearanceSettingsToDom(settings: AppearanceSettings): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  const effectiveTheme = resolveEffectiveThemeMode(settings.themeMode);
  const palette = resolvePaletteColors(settings);
  const radius = RADIUS_MD_PX[settings.borderRadiusMode];
  const surfaceLight = SURFACE_TONES_LIGHT[settings.surfaceTone];

  // Primary & Brand CSS Variables
  const effectiveBrandInDark =
    effectiveTheme === 'dark' && !palette.isCustomBrand ? '#2563eb' : palette.primaryHex;
  const effectiveHoverInDark =
    effectiveTheme === 'dark' && !palette.isCustomBrand ? '#1d4ed8' : palette.hoverHex;

  root.style.setProperty('--erp-brand-primary', effectiveBrandInDark);
  root.style.setProperty('--erp-brand-primary-hover', effectiveHoverInDark);
  root.style.setProperty('--erp-brand-secondary', palette.secondaryHex);
  root.style.setProperty('--erp-brand-soft', palette.softBgHex);
  root.style.setProperty('--color-primary', effectiveBrandInDark);
  root.style.setProperty('--company-accent', palette.primaryHex);
  root.style.setProperty('--company-accent-secondary', palette.secondaryHex);
  root.style.setProperty('--company-accent-soft', palette.softBgHex);

  // Surface Tokens
  if (effectiveTheme === 'dark') {
    root.style.setProperty('--color-canvas', '#0f1115');
    root.style.setProperty('--color-canvas-soft', '#1b202b');
    root.style.setProperty('--color-field', '#1f2430');
    root.style.setProperty(
      '--color-hairline',
      settings.highContrastBorders ? '#4b5563' : '#2a303c'
    );
    root.style.setProperty('--color-hairline-soft', '#232834');
    root.style.setProperty('--color-ink', '#f3f4f6');
    root.style.setProperty('--color-text-muted', '#9ca3af');
  } else {
    root.style.setProperty('--color-canvas', surfaceLight.canvas);
    root.style.setProperty('--color-canvas-soft', surfaceLight.canvasSoft);
    root.style.setProperty('--color-field', surfaceLight.field);
    root.style.setProperty(
      '--color-hairline',
      settings.highContrastBorders ? '#737373' : surfaceLight.hairline
    );
    root.style.setProperty('--color-hairline-soft', surfaceLight.hairlineSoft);
    root.style.setProperty('--color-ink', '#141414');
    root.style.setProperty('--color-text-muted', '#707070');
  }

  // Geometry & Display Scale
  root.style.setProperty('--sidebar-width', SIDEBAR_WIDTH_PX[settings.sidebarMode]);
  root.style.setProperty('--rounded-md', radius.md);
  root.style.setProperty('--rounded-lg', radius.md);
  root.style.setProperty('--rounded-xl', radius.md);
  root.style.setProperty('--rounded-2xl', radius.md);
  root.style.setProperty('--rounded-sm', radius.sm);
  root.style.fontSize = FONT_SCALE_PX[settings.fontScale];

  // Semantic DOM Attributes for appearance.css
  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-erp-theme-mode', settings.themeMode);
  root.setAttribute('data-erp-palette', settings.paletteId);
  root.setAttribute('data-erp-custom-palette', palette.isCustomBrand ? 'true' : 'false');
  root.setAttribute('data-erp-surface', settings.surfaceTone);
  root.setAttribute('data-erp-density', settings.density);
  root.setAttribute('data-erp-icon-mode', settings.iconColorMode);
  root.setAttribute('data-erp-contrast', settings.highContrastBorders ? 'high' : 'normal');
  root.setAttribute('data-erp-radius', settings.borderRadiusMode);
  root.setAttribute('data-erp-sidebar-mode', settings.sidebarMode);
}

export function saveAppearanceSettings(
  partial: Partial<AppearanceSettings>
): AppearanceSettings {
  const current = loadAppearanceSettings();
  const next = sanitizeSettings({
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  });

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
      const effectiveTheme = resolveEffectiveThemeMode(next.themeMode);
      localStorage.setItem('erp-preferred-theme', JSON.stringify(effectiveTheme));
    }
  } catch {
    // ignore storage errors
  }

  applyAppearanceSettingsToDom(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT, { detail: next }));
  }

  return next;
}

export function resetAppearanceSettings(): AppearanceSettings {
  const def = {
    ...getDefaultAppearanceSettings(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(def));
      localStorage.setItem('erp-preferred-theme', JSON.stringify('light'));
    }
  } catch {
    // ignore storage errors
  }

  applyAppearanceSettingsToDom(def);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT, { detail: def }));
  }

  return def;
}

let systemListenerRegistered = false;

export function initAppearanceSettings(): AppearanceSettings {
  const loaded = loadAppearanceSettings();
  applyAppearanceSettingsToDom(loaded);

  if (
    !systemListenerRegistered &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    systemListenerRegistered = true;
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        const latest = loadAppearanceSettings();
        if (latest.themeMode === 'system') {
          applyAppearanceSettingsToDom(latest);
          window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT, { detail: latest }));
        }
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemChange);
      }
    } catch {
      // ignore matchMedia limitations
    }
  }

  return loaded;
}
