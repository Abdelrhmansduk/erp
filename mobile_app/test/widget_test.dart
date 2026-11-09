import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:alsulaim_erp_mobile/main.dart';
import 'package:alsulaim_erp_mobile/data/erp_system_data.dart';
import 'package:alsulaim_erp_mobile/theme/erp_tokens.dart';

void main() {
  testWidgets(
      'Alsulaim ERP Mobile App renders browser-identical Shopifi + Champagne Gold landing & isolated portals',
      (WidgetTester tester) async {
    await tester.pumpWidget(const AlsulaimErpMobileApp());
    await tester.pump();

    // Verify exact Shopifi + Champagne Gold design tokens
    expect(ErpTokens.primary.toARGB32(), 0xFF000000);
    expect(ErpTokens.canvasCream.toARGB32(), 0xFFFBFBF5);
    expect(ErpTokens.champagneGold.toARGB32(), 0xFFCFA64A);

    // Verify sovereign company portals in ErpSystemData
    expect(ErpSystemData.mainSubsidiaryCompanies.length, 5);
    final saf = ErpSystemData.resolvePortalByCode('SAF');
    final yaq = ErpSystemData.resolvePortalByCode('YAQ');
    final kas = ErpSystemData.resolvePortalByCode('KAS');

    expect(saf.nameAr, 'شركة السفير الماسي للاستقدام');
    expect(saf.emailDomain, 'saf-rec.sa');
    expect(yaq.nameAr, 'شركة الياقوت الشرقية للتشغيل والتأجير');
    expect(yaq.emailDomain, 'yaqoot-ops.sa');
    expect(kas.nameAr, 'شركة كاس للمنافسات والتشغيل');
    expect(kas.emailDomain, 'kas-etimad.sa');

    // Verify Landing Page renders group header and hero slogan
    expect(find.textContaining('خالد السليم'), findsWidgets);
    expect(find.textContaining('نستثمر في الفرص..'), findsOneWidget);

    // Scroll down to render the lazy ListView company cards
    await tester.drag(find.byType(ListView).first, const Offset(0, -450));
    await tester.pump();

    expect(find.textContaining('شركة السفير الماسي للاستقدام'), findsWidgets);

    // Verify Unified Login Portal Departments & SMACC 6-Division Isolation
    expect(ErpSystemData.departments.length, 9);
    expect(ErpSystemData.staffDirectory.length, 14);

    // Finance employee can access SMACC GL, cannot access Recruitment
    expect(
      ErpSystemData.isTabAuthorized(
        companyId: 'SAF',
        departmentId: 'finance',
        tabHref: 'finance-smacc-gl',
      ),
      isTrue,
    );
    expect(
      ErpSystemData.isTabAuthorized(
        companyId: 'SAF',
        departmentId: 'finance',
        tabHref: 'recruitment',
      ),
      isFalse,
    );

    // Recruitment employee can access Recruitment, cannot access SMACC GL
    expect(
      ErpSystemData.isTabAuthorized(
        companyId: 'SAF',
        departmentId: 'recruitment',
        tabHref: 'recruitment',
      ),
      isTrue,
    );
    expect(
      ErpSystemData.isTabAuthorized(
        companyId: 'SAF',
        departmentId: 'recruitment',
        tabHref: 'finance-smacc-gl',
      ),
      isFalse,
    );
  });
}
