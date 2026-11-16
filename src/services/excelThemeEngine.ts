import * as XLSX from 'xlsx';

export type ExcelUiThemeMode = 'corporate-color' | 'monochrome';

export interface ExcelThemePalette {
  uiTheme: ExcelUiThemeMode;
  entityCode: string;
  primaryHex: string; // e.g. 'FF0F3A60' or 'FF141414'
  secondaryHex: string; // e.g. 'FF065F46' or 'FF262626'
  softHex: string; // e.g. 'FFEDF2F9' or 'FFF3F3F3'
  zebraHex: string; // e.g. 'FFF8FAFC'
  formulaFillHex: string; // e.g. 'FFECFDF5' or 'FFF3F3F3'
  formulaFontHex: string; // e.g. 'FF047857' or 'FF141414'
  inkHex: string; // 'FF141414'
  mutedHex: string; // 'FF475569' or 'FF52525B'
  neutralSurfaceHex: string; // 'FFF3F3F3'
  borderThinHex: string; // 'FFCBD5E1' or 'FFE4E4E7'
  borderMediumHex: string; // 'FF1E3A5F' or 'FF3F3F46'
  borderAccentHex: string; // matches primaryHex
}

export interface ExcelThemeOptions {
  uiTheme?: ExcelUiThemeMode;
  entityCode?: string;
}

const CORPORATE_ENTITY_PALETTES: Record<
  string,
  Pick<
    ExcelThemePalette,
    'primaryHex' | 'secondaryHex' | 'softHex' | 'zebraHex' | 'borderAccentHex'
  >
> = {
  SAF: {
    primaryHex: 'FF1D4ED8',
    secondaryHex: 'FF0284C7',
    softHex: 'FFEFF6FF',
    zebraHex: 'FFF8FAFC',
    borderAccentHex: 'FF1D4ED8',
  },
  YAQ: {
    primaryHex: 'FF059669',
    secondaryHex: 'FF0D9488',
    softHex: 'FFECFDF5',
    zebraHex: 'FFF0FDF4',
    borderAccentHex: 'FF059669',
  },
  TOP: {
    primaryHex: 'FF4F46E5',
    secondaryHex: 'FF7C3AED',
    softHex: 'FFEEF2FF',
    zebraHex: 'FFF8FAFC',
    borderAccentHex: 'FF4F46E5',
  },
  KAS: {
    primaryHex: 'FFB45309',
    secondaryHex: 'FF0F3A60',
    softHex: 'FFFFFBEB',
    zebraHex: 'FFFFFDF5',
    borderAccentHex: 'FFB45309',
  },
  DAR: {
    primaryHex: 'FF0F766E',
    secondaryHex: 'FF0284C7',
    softHex: 'FFF0FDFA',
    zebraHex: 'FFF8FAFC',
    borderAccentHex: 'FF0F766E',
  },
  ALL: {
    primaryHex: 'FF0F3A60',
    secondaryHex: 'FF065F46',
    softHex: 'FFEDF2F9',
    zebraHex: 'FFF8FAFC',
    borderAccentHex: 'FF0F3A60',
  },
};

export function normalizeThemeEntityCode(raw?: string | null): string {
  if (!raw) return 'ALL';
  const upper = raw.trim().toUpperCase();
  if (upper === 'GRP' || upper === 'ALL') return 'ALL';
  if (upper in CORPORATE_ENTITY_PALETTES) return upper;
  if (/سفير|SAF/i.test(raw)) return 'SAF';
  if (/ياقوت|YAQ/i.test(raw)) return 'YAQ';
  if (/توباز|TOP/i.test(raw)) return 'TOP';
  if (/كاس|بنايات|الأميال|الاميال|خالد عبدالعزيز السليم للتجارة|KAS/i.test(raw)) return 'KAS';
  if (/دار|رواد|إيواء|ايواء|DAR/i.test(raw)) return 'DAR';
  return 'ALL';
}

export function resolveActiveUiTheme(override?: ExcelUiThemeMode): ExcelUiThemeMode {
  if (override === 'monochrome' || override === 'corporate-color') {
    return override;
  }
  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      const attr = document.documentElement.getAttribute('data-ui-theme');
      if (attr === 'monochrome' || attr === 'corporate-color') {
        return attr;
      }
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ALSULAIM_UI_THEME_V1');
      if (saved === 'monochrome' || saved === 'corporate-color') {
        return saved;
      }
    }
  } catch {
    // ignore DOM/storage access errors in workers/tests
  }
  return 'corporate-color';
}

export function resolveActiveCompanyThemeCode(overrideEntityCode?: string | null): string {
  if (overrideEntityCode) {
    return normalizeThemeEntityCode(overrideEntityCode);
  }
  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      const attr = document.documentElement.getAttribute('data-company-theme');
      if (attr) return normalizeThemeEntityCode(attr);
    }
    if (typeof localStorage !== 'undefined') {
      const saved =
        localStorage.getItem('alsulaim_active_company') ||
        localStorage.getItem('ALSULAIM_ACTIVE_COMPANY');
      if (saved) return normalizeThemeEntityCode(saved);
    }
  } catch {
    // ignore DOM/storage access errors
  }
  return 'ALL';
}

export function resolveExcelThemePalette(options?: ExcelThemeOptions): ExcelThemePalette {
  const uiTheme = resolveActiveUiTheme(options?.uiTheme);
  const entityCode = resolveActiveCompanyThemeCode(options?.entityCode);

  if (uiTheme === 'monochrome') {
    return {
      uiTheme,
      entityCode,
      primaryHex: 'FF141414',
      secondaryHex: 'FF262626',
      softHex: 'FFF3F3F3',
      zebraHex: 'FFF8FAFC',
      formulaFillHex: 'FFF3F3F3',
      formulaFontHex: 'FF141414',
      inkHex: 'FF141414',
      mutedHex: 'FF52525B',
      neutralSurfaceHex: 'FFF3F3F3',
      borderThinHex: 'FFE4E4E7',
      borderMediumHex: 'FF3F3F46',
      borderAccentHex: 'FF141414',
    };
  }

  const brand = CORPORATE_ENTITY_PALETTES[entityCode] || CORPORATE_ENTITY_PALETTES.ALL;
  return {
    uiTheme,
    entityCode,
    primaryHex: brand.primaryHex,
    secondaryHex: brand.secondaryHex,
    softHex: brand.softHex,
    zebraHex: brand.zebraHex,
    formulaFillHex: 'FFECFDF5',
    formulaFontHex: 'FF047857',
    inkHex: 'FF141414',
    mutedHex: 'FF475569',
    neutralSurfaceHex: 'FFF3F3F3',
    borderThinHex: 'FFCBD5E1',
    borderMediumHex: 'FF1E3A5F',
    borderAccentHex: brand.borderAccentHex,
  };
}

export function toUtf8Bytes(xml: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(xml);
  }
  const arr = new Uint8Array(xml.length);
  for (let i = 0; i < xml.length; i++) arr[i] = xml.charCodeAt(i) & 0xff;
  return arr;
}

export function fromUtf8Bytes(bytes: Uint8Array | number[]): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(u8);
  }
  let out = '';
  for (let i = 0; i < u8.length; i++) out += String.fromCharCode(u8[i]);
  return out;
}

/**
 * Generates an OpenXML SpreadsheetML `xl/styles.xml` bound to the active ERP theme:
 * - `0`: Default Normal
 * - `1`: Top Corporate Banner (`primaryHex` fill + White bold 12pt)
 * - `2`: Report / Sheet Title (`softHex` fill + `primaryHex` bold 13pt)
 * - `3`: Metadata Banner (`zebraHex` fill + `mutedHex` bold 10pt)
 * - `4`: Table Column Header (`primaryHex` fill + White bold 12pt, centered wrapped)
 * - `5`: Body Text White (`FFFFFFFF` fill + `inkHex` 11pt)
 * - `6`: Body Text Zebra (`zebraHex` fill + `inkHex` 11pt)
 * - `7`: SAMA Currency White (`# ,##0.00 ⃁`)
 * - `8`: SAMA Currency Zebra (`# ,##0.00 ⃁`)
 * - `9`: Totals / Grand Total Label (`softHex` fill + medium/double accent border + `inkHex` bold 11pt)
 * - `10`: Totals / Grand Total SAMA Formula Currency (`softHex` fill + double accent border + SAMA ⃁)
 * - `11`: Sequence / Count Integer (`neutralSurfaceHex` fill + `#,##0`)
 * - `12`: Audit / Neutral Note Row (`neutralSurfaceHex` fill + `inkHex` 10.5pt bold)
 * - `13`: Live Formula SAMA Currency (`formulaFillHex` fill + `formulaFontHex` bold + SAMA ⃁)
 * - `14`: Secondary Accent Badge (`secondaryHex` fill + White bold 11pt)
 * - `15`: Decimal Quantity White (`#,##0.##`)
 * - `16`: Decimal Quantity Zebra (`#,##0.##`)
 * - `17`: Section Sub-header Label (`softHex` fill + `primaryHex` bold 11pt)
 */
export function buildThemedEnterpriseStylesXml(palette: ExcelThemePalette): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4">
    <numFmt numFmtId="164" formatCode="#,##0.00 &quot;\u20C1&quot;;(#,##0.00 &quot;\u20C1&quot;);&quot;0.00 \u20C1&quot;"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="#,##0.##"/>
    <numFmt numFmtId="167" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="8">
    <font><sz val="11"/><color rgb="${palette.inkHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="13"/><color rgb="${palette.primaryHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="${palette.mutedHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="${palette.inkHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="${palette.inkHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="${palette.formulaFontHex}"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="${palette.primaryHex}"/><name val="Segoe UI"/><family val="2"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.primaryHex}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.softHex}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.zebraHex}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.formulaFillHex}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.neutralSurfaceHex}"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${palette.secondaryHex}"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="${palette.borderThinHex}"/></left>
      <right style="thin"><color rgb="${palette.borderThinHex}"/></right>
      <top style="thin"><color rgb="${palette.borderThinHex}"/></top>
      <bottom style="thin"><color rgb="${palette.borderThinHex}"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="${palette.borderMediumHex}"/></left>
      <right style="thin"><color rgb="${palette.borderMediumHex}"/></right>
      <top style="medium"><color rgb="${palette.borderAccentHex}"/></top>
      <bottom style="medium"><color rgb="${palette.borderAccentHex}"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="${palette.borderThinHex}"/></left>
      <right style="thin"><color rgb="${palette.borderThinHex}"/></right>
      <top style="medium"><color rgb="${palette.borderAccentHex}"/></top>
      <bottom style="double"><color rgb="${palette.borderAccentHex}"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="18">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="4" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="3" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="6" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="8" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="166" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

export function injectFullCalcOnLoad(cfbLib: any, cfb: any): void {
  const wbEntry = cfbLib.find(cfb, 'Root Entry/xl/workbook.xml');
  if (!wbEntry) return;
  let wbXml = fromUtf8Bytes(wbEntry.content);
  if (wbXml.includes('<calcPr')) {
    wbXml = wbXml.replace(/<calcPr\b[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>');
  } else {
    wbXml = wbXml.replace(/<\/workbook>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
  }
  wbEntry.content = toUtf8Bytes(wbXml);
  wbEntry.size = wbEntry.content.length;
}

export interface BoqStyledSheetMeta {
  kind: 'boq' | 'establishments';
  subtotalRowNum?: number;
  grandTotalRowNum?: number;
  totalsRowNum?: number;
}

/**
 * Injects theme-aware OpenXML SpreadsheetML styling into `RealBoqEngine` workbooks
 * while strictly preserving every Excel formula (`=F*G`, `=I*0.15`, `=SUBTOTAL`, `=C+D`, `=SUM`).
 */
export function applyThemedBoqWorkbookStyles(
  wb: XLSX.WorkBook,
  sheetMetaList: BoqStyledSheetMeta[],
  themeOptions?: ExcelThemeOptions
): Uint8Array {
  const rawBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const cfbLib = (XLSX as any).CFB;
  if (!cfbLib) return new Uint8Array(rawBuffer);

  try {
    const palette = resolveExcelThemePalette(themeOptions);
    const cfb = cfbLib.read(new Uint8Array(rawBuffer), { type: 'array' });

    const stylesEntry = cfbLib.find(cfb, 'Root Entry/xl/styles.xml');
    if (stylesEntry) {
      stylesEntry.content = toUtf8Bytes(buildThemedEnterpriseStylesXml(palette));
      stylesEntry.size = stylesEntry.content.length;
    }

    injectFullCalcOnLoad(cfbLib, cfb);

    sheetMetaList.forEach((meta, idx) => {
      const sheetNum = idx + 1;
      const entry = cfbLib.find(cfb, `Root Entry/xl/worksheets/sheet${sheetNum}.xml`);
      if (!entry) return;
      let xml = fromUtf8Bytes(entry.content);

      const freezeY = meta.kind === 'boq' ? 5 : 1;
      const topLeft = meta.kind === 'boq' ? 'C6' : 'B2';
      xml = xml.replace(
        /<sheetViews>[\s\S]*?<\/sheetViews>/,
        `<sheetViews><sheetView rightToLeft="1" showGridLines="1"${sheetNum === 1 ? ' tabSelected="1"' : ''} workbookViewId="0"><pane ySplit="${freezeY}" topLeftCell="${topLeft}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      );

      xml = xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, rowAttrs, inner) => {
        const rNum = parseInt(rStr, 10);
        const styledInner = inner.replace(
          /<c r="([A-Z]+)(\d+)"([^>]*)>/g,
          (_cm: string, colLet: string, cRow: string, cAttrs: string) => {
            const cleanAttrs = cAttrs.replace(/\s+s="\d+"/g, '');
            const isNumeric = !/\bt="(?:str|s|inlineStr|b)"/.test(cleanAttrs);
            let styleIdx = 5;

            if (meta.kind === 'establishments') {
              const totalRow = meta.totalsRowNum || 99999;
              if (rNum === 1) {
                styleIdx = colLet === 'A' ? 0 : 4;
              } else if (rNum === totalRow) {
                if (colLet === 'A') styleIdx = 0;
                else if (colLet === 'G') styleIdx = 10;
                else styleIdx = isNumeric ? 9 : 9;
              } else if (rNum >= 2 && rNum < totalRow) {
                const isEven = (rNum - 2) % 2 === 0;
                if (colLet === 'A') styleIdx = 0;
                else if (colLet === 'E') styleIdx = 13; // Live =C+D formula highlight
                else if (colLet === 'G') styleIdx = isEven ? 7 : 8; // SAMA ⃁ currency
                else if (isNumeric) styleIdx = isEven ? 15 : 16;
                else styleIdx = isEven ? 5 : 6;
              }
            } else {
              // KAS BOQ worksheet layout (Rows 3..4 header, Row 5 table header, Rows 6..sub-1 items)
              const subRow = meta.subtotalRowNum || 106;
              const grandRow = meta.grandTotalRowNum || subRow + 3;
              if (rNum === 3 || rNum === 4) {
                if (colLet === 'O') {
                  styleIdx = 14;
                } else if (colLet >= 'C' && colLet <= 'M') {
                  if (colLet === 'C' || colLet === 'L') styleIdx = 17;
                  else if (colLet === 'M' && rNum === 4) styleIdx = 10;
                  else styleIdx = rNum === 3 ? 2 : 3;
                } else {
                  styleIdx = 0;
                }
              } else if (rNum === 5) {
                styleIdx = colLet >= 'C' && colLet <= 'M' ? 4 : 0;
              } else if (rNum >= 6 && rNum < subRow) {
                const isEven = (rNum - 6) % 2 === 0;
                if (colLet === 'C') styleIdx = 11;
                else if (colLet === 'F') styleIdx = isEven ? 15 : 16;
                else if (colLet === 'G') styleIdx = isEven ? 7 : 8;
                else if (colLet === 'I' || colLet === 'K' || colLet === 'L') styleIdx = 13; // Live Excel formula columns!
                else if (colLet >= 'D' && colLet <= 'M') styleIdx = isEven ? 5 : 6;
                else styleIdx = 0;
              } else if (rNum === subRow) {
                if (colLet === 'I' || colLet === 'K' || colLet === 'L') styleIdx = 10;
                else if (colLet >= 'C' && colLet <= 'M') styleIdx = 9;
                else styleIdx = 0;
              } else if (rNum > subRow && rNum <= grandRow + 4) {
                if (rNum === grandRow && (colLet === 'C' || colLet === 'E' || colLet === 'J')) {
                  styleIdx = colLet === 'E' ? 10 : 9;
                } else if (colLet === 'E' && isNumeric) {
                  styleIdx = 13;
                } else if (colLet >= 'C' && colLet <= 'J') {
                  styleIdx = 12;
                } else {
                  styleIdx = 0;
                }
              }
            }

            return `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}>`;
          }
        );
        return `<row r="${rStr}"${rowAttrs}>${styledInner}</row>`;
      });

      if (!xml.includes('<sheetPr')) {
        xml = xml.replace(
          /(<worksheet[^>]*>)/,
          '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
        );
      }

      xml = xml.replace(
        /(<pageMargins[^>]*\/>)(?!\s*<pageSetup)/,
        '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
      );

      entry.content = toUtf8Bytes(xml);
      entry.size = entry.content.length;
    });

    return new Uint8Array(cfbLib.write(cfb, { fileType: 'zip', type: 'array' }));
  } catch (err) {
    console.warn('Themed BOQ OpenXML style fallback:', err);
    return new Uint8Array(rawBuffer);
  }
}

/**
 * Injects theme-aware OpenXML SpreadsheetML styling into generic flat/multi-sheet workbooks
 * (row 1 = headers, rows 2+ = data with optional formula cells).
 */
export function applyThemedGenericWorkbookStyles(
  wb: XLSX.WorkBook,
  themeOptions?: ExcelThemeOptions
): Uint8Array {
  const rawBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const cfbLib = (XLSX as any).CFB;
  if (!cfbLib) return new Uint8Array(rawBuffer);

  try {
    const palette = resolveExcelThemePalette(themeOptions);
    const cfb = cfbLib.read(new Uint8Array(rawBuffer), { type: 'array' });

    const stylesEntry = cfbLib.find(cfb, 'Root Entry/xl/styles.xml');
    if (stylesEntry) {
      stylesEntry.content = toUtf8Bytes(buildThemedEnterpriseStylesXml(palette));
      stylesEntry.size = stylesEntry.content.length;
    }

    injectFullCalcOnLoad(cfbLib, cfb);

    const sheetCount = wb.SheetNames.length;
    for (let idx = 0; idx < sheetCount; idx++) {
      const sheetNum = idx + 1;
      const entry = cfbLib.find(cfb, `Root Entry/xl/worksheets/sheet${sheetNum}.xml`);
      if (!entry) continue;
      let xml = fromUtf8Bytes(entry.content);

      xml = xml.replace(
        /<sheetViews>[\s\S]*?<\/sheetViews>/,
        `<sheetViews><sheetView rightToLeft="1" showGridLines="1"${sheetNum === 1 ? ' tabSelected="1"' : ''} workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      );

      xml = xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, rowAttrs, inner) => {
        const rNum = parseInt(rStr, 10);
        const styledInner = inner.replace(
          /<c r="([A-Z]+)(\d+)"([^/>]*?)(\/>|>([\s\S]*?)<\/c>)/g,
          (_cm: string, colLet: string, cRow: string, cAttrs: string, closingOrFull: string, innerBody: string = '') => {
            const cleanAttrs = cAttrs.replace(/\s+s="\d+"/g, '');
            const isSelfClosing = closingOrFull === '/>';
            const isNumeric = !/\bt="(?:str|s|inlineStr|b)"/.test(cleanAttrs);
            const hasFormula = !isSelfClosing && /<f[\s>]/.test(innerBody);
            let styleIdx = 5;

            if (rNum === 1) {
              styleIdx = 4;
            } else {
              const isEven = (rNum - 2) % 2 === 0;
              if (hasFormula) styleIdx = 13;
              else if (colLet === 'A' && isNumeric) styleIdx = 11;
              else if (isNumeric) styleIdx = isEven ? 7 : 8;
              else styleIdx = isEven ? 5 : 6;
            }

            return isSelfClosing
              ? `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}/>`
              : `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}>${innerBody}</c>`;
          }
        );
        return `<row r="${rStr}"${rowAttrs}>${styledInner}</row>`;
      });

      if (!xml.includes('<sheetPr')) {
        xml = xml.replace(
          /(<worksheet[^>]*>)/,
          '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
        );
      }
      xml = xml.replace(
        /(<pageMargins[^>]*\/>)(?!\s*<pageSetup)/,
        '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
      );

      entry.content = toUtf8Bytes(xml);
      entry.size = entry.content.length;
    }

    return new Uint8Array(cfbLib.write(cfb, { fileType: 'zip', type: 'array' }));
  } catch (err) {
    console.warn('Themed generic OpenXML style fallback:', err);
    return new Uint8Array(rawBuffer);
  }
}

/**
 * Applies active theme styling to a generic workbook and triggers an `.xlsx` download in browser contexts.
 */
export function downloadThemedXlsxWorkbook(
  wb: XLSX.WorkBook,
  fileName: string,
  themeOptions?: ExcelThemeOptions
): Uint8Array {
  const bytes = applyThemedGenericWorkbookStyles(wb, themeOptions);
  try {
    const proc = (globalThis as any).process;
    const isTest = Boolean(proc?.env && (proc.env.NODE_ENV === 'test' || proc.env.VITEST));
    if (!isTest && typeof Blob !== 'undefined' && typeof document !== 'undefined' && typeof window !== 'undefined') {
      const blob = new Blob([bytes as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (window.URL && typeof window.URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 4000);
      }
    }
  } catch {
    // non-blocking in headless/test environments
  }
  return bytes;
}
