import 'package:flutter/material.dart';

/// Exact Design System Tokens synchronized with `src/styles/tokens.css` & `.agents/skills/ui-ux-design-system/SKILL.md`
/// Mobbin Gallery-White Monochrome Identity Palette (`#141414`, `#ffffff`, `#f3f3f3`, `#e0e0e0`, `#707070`).
class ErpTokens {
  ErpTokens._();

  // Official SAMA Saudi Riyal Symbol (U+20C1)
  static const String saudiRiyalSymbol = '\u20C1'; // ⃁

  // Core Ink & Canvas Tokens (`tokens.css` — Mobbin Gallery-White Monochrome)
  static const Color primary = Color(0xFF141414);
  static const Color ink = Color(0xFF141414);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onDark = Color(0xFFFFFFFF);
  static const Color canvasNight = Color(0xFF141414);
  static const Color canvasNightElevated = Color(0xFF1F1F1F);
  static const Color canvasLight = Color(0xFFFFFFFF);
  static const Color canvasCream = Color(0xFFF3F3F3);
  static const Color surfaceElevatedDark = Color(0xFF1F1F1F);

  // KAFD Login Architectural Monochrome Palette
  static const Color kafdDarkBg = Color(0xFF141414);
  static const Color kafdHeroBg = Color(0xFF1F1F1F);
  static const Color loginAuthSurface = Color(0xFFFFFFFF);

  // Neutral Shades & Hairlines (`tokens.css`)
  static const Color shade30 = Color(0xFFE0E0E0);
  static const Color shade40 = Color(0xFF9E9E9E);
  static const Color shade50 = Color(0xFF707070);
  static const Color shade60 = Color(0xFF525252);
  static const Color shade70 = Color(0xFF262626);
  static const Color hairlineLight = Color(0xFFE0E0E0);
  static const Color hairlineDark = Color(0xFF262626);
  static const Color surfaceLow = Color(0xFFF3F3F3);
  static const Color surfaceSubtle = Color(0xFFFAFAFA);

  // Monochrome Accent Aliases (mapped to Mobbin Monochrome Scale for backward compatibility)
  static const Color champagneGold = Color(0xFF141414);
  static const Color goldLight = Color(0xFF707070);
  static const Color goldDark = Color(0xFF141414);
  static const Color goldPale = Color(0xFFF3F3F3);
  static const Color pistachio10 = Color(0xFFF3F3F3);
  static const Color charcoalDark = Color(0xFF141414);
  static const Color charcoalDeep = Color(0xFF141414);
  static const Color goldPrimary = Color(0xFF141414);

  // Semantic Status Tokens (Monochrome Hierarchy per `ui-ux-design-system`)
  static const Color statusSuccess = Color(0xFF141414);
  static const Color statusSuccessBg = Color(0xFFF3F3F3);
  static const Color statusSuccessBorder = Color(0xFFE0E0E0);

  static const Color statusWarning = Color(0xFF525252);
  static const Color statusWarningBg = Color(0xFFF3F3F3);
  static const Color statusWarningBorder = Color(0xFFD4D4D4);

  static const Color statusDanger = Color(0xFF141414);
  static const Color statusDangerBg = Color(0xFFEBEBEB);
  static const Color statusDangerBorder = Color(0xFF141414);

  // Shapes & Radii (`tokens.css`)
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusPill = 9999.0;

  // Subtle Monochrome Card Shadow (`tokens.css`)
  static const List<BoxShadow> elevation3Shadow = [
    BoxShadow(
      color: Color(0x0A000000),
      blurRadius: 8,
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Color(0x05000000),
      blurRadius: 2,
      offset: Offset(0, 1),
    ),
  ];

  /// `.card-pricing` / `.stat-card` / `.table-card` in `components.css`
  static BoxDecoration cardPricingDecoration({
    Color backgroundColor = canvasLight,
    Color borderColor = hairlineLight,
    double radius = radiusLg,
  }) {
    return BoxDecoration(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor, width: 1),
      boxShadow: elevation3Shadow,
    );
  }

  /// `.card-pistachio-band` in `SmaccDashboardWidget.tsx`
  static BoxDecoration cardPistachioDecoration({double radius = radiusLg}) {
    return BoxDecoration(
      color: surfaceLow,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: hairlineLight, width: 1),
      boxShadow: elevation3Shadow,
    );
  }

  /// `.card-feature-cinematic` in `DashboardPage.tsx`
  static BoxDecoration cardFeatureCinematicDecoration({double radius = radiusLg}) {
    return BoxDecoration(
      color: primary,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: hairlineDark, width: 1),
      boxShadow: const [
        BoxShadow(
          color: Color(0x1F000000),
          blurRadius: 16,
          offset: Offset(0, 8),
        ),
      ],
    );
  }

  /// Monochrome pill badge
  static Widget pillTagMint(String text, {IconData? icon, double fontSize = 11}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: surfaceLow,
        borderRadius: BorderRadius.circular(radiusPill),
        border: Border.all(color: hairlineLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: fontSize + 2, color: ink),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: ink,
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  /// `.pill-tag-shade` in `SmaccDashboardWidget.tsx`
  static Widget pillTagShade(String text, {double fontSize = 11}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: surfaceLow,
        borderRadius: BorderRadius.circular(radiusPill),
        border: Border.all(color: hairlineLight),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: shade60,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
