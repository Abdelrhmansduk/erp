import 'package:flutter/material.dart';

/// Exact Design System Tokens from `src/styles/tokens.css` & `src/styles/components.css`
/// Shopifi + Warm Champagne Gold Luxury Identity Palette — Applied Down to the Millimeter.
class ErpTokens {
  ErpTokens._();

  // Core Ink & Canvas Tokens (`tokens.css`)
  static const Color primary = Color(0xFF000000);
  static const Color ink = Color(0xFF000000);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onDark = Color(0xFFFFFFFF);
  static const Color canvasNight = Color(0xFF000000);
  static const Color canvasNightElevated = Color(0xFF0A0A0A);
  static const Color canvasLight = Color(0xFFFFFFFF);
  static const Color canvasCream = Color(0xFFFBFBF5);
  static const Color surfaceElevatedDark = Color(0xFF1E2C31);

  // KAFD Login Architectural Dark Palette (`LoginPage.tsx` - Shopifi Pitch Black & Charcoal)
  static const Color kafdDarkBg = Color(0xFF000000);
  static const Color kafdHeroBg = Color(0xFF1D2428);
  static const Color loginAuthSurface = Color(0xFFFAFBFC);

  // Neutral Shades & Hairlines (`tokens.css`)
  static const Color shade30 = Color(0xFFD4D4D8);
  static const Color shade40 = Color(0xFFA1A1AA);
  static const Color shade50 = Color(0xFF5A6363);
  static const Color shade60 = Color(0xFF52525B);
  static const Color shade70 = Color(0xFF3F3F46);
  static const Color hairlineLight = Color(0xFFE4E4E7);
  static const Color hairlineDark = Color(0xFF1E2C31);
  static const Color surfaceLow = Color(0xFFF4F4F0);
  static const Color surfaceSubtle = Color(0xFFFAFAFA);

  // Warm Champagne Gold Luxury Identity Palette (`tokens.css`)
  static const Color champagneGold = Color(0xFFCFA64A);
  static const Color goldLight = Color(0xFFE4C77B);
  static const Color goldDark = Color(0xFFA98232);
  static const Color goldPale = Color(0xFFF5EDDC);
  static const Color pistachio10 = Color(0xFFFAEBD7);
  static const Color charcoalDark = Color(0xFF1D2428);
  static const Color charcoalDeep = Color(0xFF14181B);
  static const Color goldPrimary = Color(0xFFD4AF37);

  // Semantic Status Tokens (`tokens.css`)
  static const Color statusSuccess = Color(0xFF10B981);
  static const Color statusSuccessBg = Color(0xFFC1FBD4);
  static const Color statusSuccessBorder = Color(0xFFA7F3D0);

  static const Color statusWarning = Color(0xFFF59E0B);
  static const Color statusWarningBg = Color(0xFFFFFBEB);
  static const Color statusWarningBorder = Color(0xFFFDE68A);

  static const Color statusDanger = Color(0xFFBA1A1A);
  static const Color statusDangerBg = Color(0xFFFFDAD6);
  static const Color statusDangerBorder = Color(0xFFFCA5A5);

  // Shapes & Radii (`tokens.css`)
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusPill = 9999.0;

  // Level 3 Stacked Card Shadow (`--elevation-3` in `tokens.css`)
  static const List<BoxShadow> elevation3Shadow = [
    BoxShadow(
      color: Color(0x14000000), // rgba(0, 0, 0, 0.08)
      blurRadius: 8,
      offset: Offset(0, 8),
    ),
    BoxShadow(
      color: Color(0x0F000000), // rgba(0, 0, 0, 0.06)
      blurRadius: 4,
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Color(0x0A000000), // rgba(0, 0, 0, 0.04)
      blurRadius: 2,
      offset: Offset(0, 2),
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
      color: pistachio10,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: const Color(0xFFE5D5B5), width: 1),
      boxShadow: elevation3Shadow,
    );
  }

  /// `.card-feature-cinematic` in `DashboardPage.tsx`
  static BoxDecoration cardFeatureCinematicDecoration({double radius = radiusLg}) {
    return BoxDecoration(
      color: primary,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: const Color(0xFF27272A), width: 1),
      boxShadow: const [
        BoxShadow(
          color: Color(0x33000000),
          blurRadius: 20,
          offset: Offset(0, 10),
        ),
      ],
    );
  }

  /// `.pill-tag-mint` / `.stat-badge.up` in `components.css`
  static Widget pillTagMint(String text, {IconData? icon, double fontSize = 11}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: goldPale,
        borderRadius: BorderRadius.circular(radiusPill),
        border: Border.all(color: champagneGold.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: fontSize + 2, color: goldDark),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: goldDark,
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
        color: const Color(0xFFF4F4F5),
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
