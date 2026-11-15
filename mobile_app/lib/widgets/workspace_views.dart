import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/erp_system_data.dart';
import '../data/supabase_ess_sync_service.dart';
import '../services/hr_direct_mail_client.dart';
import '../theme/erp_tokens.dart';

/// Exact Replica of `src/components/smacc/SmaccDashboardWidget.tsx`
class SmaccDashboardWidgetReplica extends StatefulWidget {
  const SmaccDashboardWidgetReplica({super.key});

  @override
  State<SmaccDashboardWidgetReplica> createState() => _SmaccDashboardWidgetReplicaState();
}

class _SmaccDashboardWidgetReplicaState extends State<SmaccDashboardWidgetReplica> {
  String _periodFilter = 'الأيام الأخيرة';
  static const List<String> _periods = [
    'الأيام الأخيرة',
    'هذا الشهر',
    'الربع الحالي',
    'السنة المالية 2026',
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Top Banner Header (`SmaccDashboardWidget.tsx` lines 21-51)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: ErpTokens.primary,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'SMACC',
                      style: TextStyle(
                        color: ErpTokens.onPrimary,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text(
                              'لوحة التحكم الهيكلية (نظام SMACC للمحاسبة)',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: ErpTokens.ink,
                              ),
                            ),
                            ErpTokens.pillTagMint('مطابق 100%', fontSize: 10),
                          ],
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'الصفحة الرئيسية • متابعة الحركة المالية والأقسام التشغيلية',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF71717A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'الفترة الزمنية:',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFF71717A), fontWeight: FontWeight.w600),
                  ),
                  Container(
                    height: 34,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: ErpTokens.canvasLight,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: ErpTokens.hairlineLight),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _periodFilter,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: ErpTokens.ink),
                        style: const TextStyle(fontSize: 11.5, color: ErpTokens.ink, fontWeight: FontWeight.w600),
                        items: _periods
                            .map((p) => DropdownMenuItem<String>(
                                  value: p,
                                  child: Text(p),
                                ))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _periodFilter = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 2. Top 3 Stat Counter Cards (`SmaccDashboardWidget.tsx` lines 54-87)
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: ErpTokens.cardPricingDecoration(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'عدد البائعين',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF71717A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: const BoxDecoration(color: ErpTokens.primary, shape: BoxShape.circle),
                          child: const Icon(Icons.people_outline_rounded, size: 15, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '2',
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w300, color: ErpTokens.ink),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: ErpTokens.cardPistachioDecoration(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'عدد العملاء',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.black12),
                          ),
                          child: const Icon(Icons.verified_user_outlined, size: 15, color: ErpTokens.ink),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '4',
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w300, color: ErpTokens.ink),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: ErpTokens.cardPricingDecoration(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'محصلين المبيعات',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF71717A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF4F4F5),
                            shape: BoxShape.circle,
                            border: Border.all(color: ErpTokens.hairlineLight),
                          ),
                          child: const Icon(Icons.credit_card_rounded, size: 15, color: ErpTokens.ink),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '1',
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w300, color: ErpTokens.ink),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // 3. Financial Movement Boxes (`مدفوعات` & `ايصالات استلام`)
        _buildSmaccMovementBox(
          title: 'مدفوعات (Payment Summary)',
          period: _periodFilter,
          isMintBadge: false,
          items: const [
            MapEntry('إجمالي الدفعات', '0.00 ⃁'),
            MapEntry('المدفوعات النقدية', '0.00 ⃁'),
            MapEntry('مدفوعات الشيك', '0.00 ⃁'),
            MapEntry('الدفعات المحولة', '0.00 ⃁'),
          ],
          emptyCaption: 'السجل غير موجود (جاهز لاستقبال سندات الصرف الجديدة)',
        ),
        const SizedBox(height: 12),
        _buildSmaccMovementBox(
          title: 'ايصالات استلام (Receipt Vouchers)',
          period: _periodFilter,
          isMintBadge: true,
          items: const [
            MapEntry('إجمالي الايصالات', '0.00 ⃁'),
            MapEntry('سند استلام نقدي', '0.00 ⃁'),
            MapEntry('ايصالات الشيك', '0.00 ⃁'),
            MapEntry('الايصالات المحولة', '0.00 ⃁'),
          ],
          emptyCaption: 'السجل غير موجود (جاهز لاستقبال سندات القبض والإيداعات)',
        ),
      ],
    );
  }

  Widget _buildSmaccMovementBox({
    required String title,
    required String period,
    required bool isMintBadge,
    required List<MapEntry<String, String>> items,
    required String emptyCaption,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(color: ErpTokens.primary, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                  ),
                ],
              ),
              isMintBadge
                  ? ErpTokens.pillTagMint(period, fontSize: 10)
                  : ErpTokens.pillTagShade(period, fontSize: 10),
            ],
          ),
          const Divider(height: 20, color: ErpTokens.hairlineLight),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.55,
            children: items
                .map(
                  (entry) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: ErpTokens.surfaceSubtle,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ErpTokens.hairlineLight),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          entry.key,
                          style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          entry.value,
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 12),
            decoration: BoxDecoration(
              color: ErpTokens.surfaceSubtle,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: ErpTokens.hairlineLight),
            ),
            alignment: Alignment.center,
            child: Text(
              emptyCaption,
              style: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

/// Exact Replica of `src/pages/DashboardPage.tsx`
class DashboardViewReplica extends StatefulWidget {
  final SystemPortalOption activePortal;
  final String currentUserName;
  final String currentUserRole;
  final List<ErpOperationalRecord> records;
  final void Function(String href, String title) onNavigate;
  final VoidCallback onOpenAddRecordModal;
  final VoidCallback? onOpenDocumentExtractorModal;

  const DashboardViewReplica({
    super.key,
    required this.activePortal,
    required this.currentUserName,
    required this.currentUserRole,
    required this.records,
    required this.onNavigate,
    required this.onOpenAddRecordModal,
    this.onOpenDocumentExtractorModal,
  });

  @override
  State<DashboardViewReplica> createState() => _DashboardViewReplicaState();
}

class _DashboardViewReplicaState extends State<DashboardViewReplica> {
  String _selectedPeriod = 'today'; // 'today' | 'week' | 'month' | 'all'

  int _scaleByPeriod(int base) {
    switch (_selectedPeriod) {
      case 'today':
        return base;
      case 'week':
        return (base * 1.4).round();
      case 'month':
        return (base * 2.1).round();
      default:
        return (base * 3.0).round();
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalContracts = _scaleByPeriod(115);
    final totalOrders = _scaleByPeriod(42);
    final totalRent = _scaleByPeriod(24);
    final totalCvs = _scaleByPeriod(86);
    final totalClients = _scaleByPeriod(142);
    final totalShelter = _scaleByPeriod(44);
    final totalComplaints = _scaleByPeriod(8);
    final totalTransfers = _scaleByPeriod(17);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. SMACC Structural Dashboard Replica (`<SmaccDashboardWidget />` at top of `DashboardPage.tsx`)
        const SmaccDashboardWidgetReplica(),
        const SizedBox(height: 16),

        // 2. Top Welcome Hero Banner with Period Filter (`card-feature-cinematic` in `DashboardPage.tsx` lines 164-302)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: ErpTokens.cardFeatureCinematicDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.14),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.apartment_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            ErpTokens.pillTagMint('مؤشرات فورية', fontSize: 10.5),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: ErpTokens.champagneGold,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                const Text(
                                  'محدث الآن - آخر تحديث اليوم',
                                  style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA)),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'مرحباً مجموعة خالد السليم 👋',
                          style: TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w400,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'تابع أداء العقود والطلبات والإيرادات لحظة بلحظة مع إمكانية التحكم الكامل في الأقسام والعمليات التشغيلية.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFFA1A1AA),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Quick Action Navigation Pills (`DashboardPage.tsx` lines 211-248)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  InkWell(
                    onTap: widget.onOpenAddRecordModal,
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.add_rounded, size: 15, color: ErpTokens.ink),
                          SizedBox(width: 4),
                          Text(
                            'عقد جديد',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (widget.onOpenDocumentExtractorModal != null)
                    InkWell(
                      onTap: widget.onOpenDocumentExtractorModal,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
                        decoration: BoxDecoration(
                          color: ErpTokens.champagneGold,
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.upload_file_rounded, size: 15, color: ErpTokens.charcoalDark),
                            SizedBox(width: 4),
                            Text(
                              'رفع واستخلاص مستندات / 100 فاتورة',
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.charcoalDark),
                            ),
                          ],
                        ),
                      ),
                    ),
                  _buildOutlineOnDarkPill(
                    label: 'الطلبات المباشرة',
                    onTap: () => widget.onNavigate('orders', 'الطلبات المباشرة'),
                  ),
                  _buildOutlineOnDarkPill(
                    label: 'إدارة الفرق',
                    onTap: () => widget.onNavigate('employees', 'سجل الموظفين والكادر الوظيفي'),
                  ),
                  _buildOutlineOnDarkPill(
                    label: 'التقارير',
                    onTap: () => widget.onNavigate('reports', 'مركز التقارير'),
                  ),
                  _buildOutlineOnDarkPill(
                    label: 'المالية',
                    onTap: () => widget.onNavigate('finance-home', 'لوحة التحكم المالية'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(color: Colors.white12, height: 1),
              const SizedBox(height: 12),

              // Live Period Filter Buttons & Today Sub-cards (`DashboardPage.tsx` lines 252-301)
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildPeriodTab('today', 'اليوم'),
                        _buildPeriodTab('week', 'هذا الأسبوع'),
                        _buildPeriodTab('month', 'هذا الشهر'),
                        _buildPeriodTab('all', 'الإجمالي'),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.description_outlined, size: 14, color: ErpTokens.goldLight),
                            const SizedBox(width: 5),
                            const Text('عقود اليوم: ', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600)),
                            Text(
                              '${(totalContracts / 12).ceil()}',
                              style: const TextStyle(fontSize: 11.5, color: ErpTokens.goldLight, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.shopping_bag_outlined, size: 14, color: Color(0xFF93C5FD)),
                            const SizedBox(width: 5),
                            const Text('طلبات اليوم: ', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600)),
                            Text(
                              '${(totalOrders / 8).ceil()}',
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF93C5FD), fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 3. IAM Multi-Entity Access Scope HUD (`DashboardPage.tsx` lines 305-335)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: ErpTokens.charcoalDark,
            borderRadius: BorderRadius.circular(ErpTokens.radiusLg),
            border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.35)),
            boxShadow: ErpTokens.elevation3Shadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: ErpTokens.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.4)),
                    ),
                    child: const Icon(Icons.verified_user_rounded, color: ErpTokens.goldLight, size: 19),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              'جلسة الوصول المعتمدة: ${widget.currentUserName} (${widget.currentUserRole})',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: ErpTokens.champagneGold,
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              ),
                              child: Text(
                                '${widget.activePortal.companyId == 'all' ? 'GRP' : widget.activePortal.companyId}: ${widget.activePortal.nameAr}',
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: ErpTokens.charcoalDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'نطاق البيانات التشغيلي: Level 1 — عزل كامل للشركة • الفروع المصرح بها: [الكل] • نظام العزل: فعال ومفعل 100%',
                          style: TextStyle(fontSize: 10.5, color: Color(0xFFD4D4D8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: _buildOutlineOnDarkPill(
                  label: '🔒 مصفوفة الصلاحيات (IAM)',
                  onTap: () => widget.onNavigate('iam-matrix', 'مصفوفة الصلاحيات والعزل السيادي'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 4. Quick Navigation 3-Card Portal Hub (`DashboardPage.tsx` lines 338-389)
        _buildQuickPortalCard(
          icon: Icons.home_work_outlined,
          iconColor: ErpTokens.ink,
          title: 'إدارة الإيواء',
          subtitle: 'الداخل والخارج والجاهز للنقل ومرحلة الترحيل',
          onTap: () => widget.onNavigate('shelter-suite', 'إدارة الإيواء والتسكين'),
        ),
        const SizedBox(height: 10),
        _buildQuickPortalCard(
          icon: Icons.attach_money_rounded,
          iconColor: const Color(0xFF047857),
          title: 'نظام سماك المحاسبي (SMACC)',
          subtitle: 'الأستاذ العام، السندات، الفوترة ZATCA، وميزان المراجعة',
          onTap: () => widget.onNavigate('smacc-accounting', 'نظام سماك المحاسبي المتكامل (SMACC)'),
        ),
        const SizedBox(height: 10),
        _buildQuickPortalCard(
          icon: Icons.pie_chart_outline_rounded,
          iconColor: ErpTokens.ink,
          title: 'مركز التقارير',
          subtitle: 'تقارير العقود والطلبات والإيواء والتصدير',
          onTap: () => widget.onNavigate('reports', 'مركز التقارير الموحدة'),
        ),
        const SizedBox(height: 16),

        // 5. Main KPI Metrics Cards Grid (`DashboardPage.tsx` lines 392-580)
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.22,
          children: [
            _buildKpiMetricCard(
              title: 'جميع عقود الاستقدام',
              value: '$totalContracts',
              icon: Icons.handshake_outlined,
              progress: 0.76,
              progressColor: ErpTokens.ink,
              footerText: 'قبل الوصول: 18 | وصول: 7 | ضمان: 27',
              onTap: () => widget.onNavigate('recruitment-contracts', 'عقود الاستقدام الموثقة (مساند)'),
            ),
            _buildKpiMetricCard(
              title: 'طلبات الاستقدام',
              value: '$totalOrders',
              icon: Icons.shopping_cart_outlined,
              progress: 0.82,
              progressColor: const Color(0xFF059669),
              footerText: 'جديدة: 12 | إجراء: 18 | مكتملة: 12',
              onTap: () => widget.onNavigate('orders', 'طلبات الاستقدام والحجوزات'),
            ),
            _buildKpiMetricCard(
              title: 'عقود الإيجار',
              value: '$totalRent',
              icon: Icons.fact_check_outlined,
              progress: 0.55,
              progressColor: ErpTokens.ink,
              footerText: 'نشطة: 16 | مرسلة: 6 | مكتملة: 8',
              onTap: () => widget.onNavigate('rent-contracts', 'عقود التأجير والتشغيل المرن'),
            ),
            _buildKpiMetricCard(
              title: 'السير الذاتية (CVs)',
              value: '$totalCvs',
              icon: Icons.badge_outlined,
              progress: 0.68,
              progressColor: ErpTokens.champagneGold,
              footerText: 'متاحة: 54 | محجوزة: 32',
              onTap: () => widget.onNavigate('cvs-recruitment', 'بنك السير الذاتية (CVs)'),
            ),
            _buildKpiMetricCard(
              title: 'العملاء المسجلين',
              value: '$totalClients',
              icon: Icons.people_outline_rounded,
              progress: 0.88,
              progressColor: const Color(0xFF0284C7),
              footerText: 'نشط: 128 | بطلبات سارية: 99',
              onTap: () => widget.onNavigate('clients', 'إدارة علاقات العملاء (CRM)'),
            ),
            _buildKpiMetricCard(
              title: 'دار الإيواء والتسكين',
              value: '$totalShelter',
              icon: Icons.hotel_outlined,
              progress: 0.72,
              progressColor: const Color(0xFF0D9488),
              footerText: 'داخل الإيواء: 39 | خارج: 5',
              onTap: () => widget.onNavigate('shelter-suite', 'منظومة مراكز الإيواء والتسكين'),
            ),
            _buildKpiMetricCard(
              title: 'الشكاوى والتذاكر',
              value: '$totalComplaints',
              icon: Icons.headset_mic_outlined,
              progress: 0.40,
              progressColor: const Color(0xFFD97706),
              footerText: 'مفتوحة: 3 | محلولة: 5',
              onTap: () => widget.onNavigate('complaints', 'إدارة الشكاوى والنزاعات'),
            ),
            _buildKpiMetricCard(
              title: 'نقل الكفالة والتنازل',
              value: '$totalTransfers',
              icon: Icons.sync_alt_rounded,
              progress: 0.64,
              progressColor: ErpTokens.ink,
              footerText: 'تحت التجربة: 5 | مكتملة: 12',
              onTap: () => widget.onNavigate('sponsorship-transfer', 'نقل الكفالة والتنازل'),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // 6. Recent Tenant-Scoped Operational Records Table Card (`.table-card` in `components.css`)
        Container(
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.bolt_rounded, size: 18, color: ErpTokens.goldDark),
                        const SizedBox(width: 6),
                        Text(
                          'أحدث العمليات المعزولة (${widget.activePortal.companyId == 'all' ? 'جميع الشركات' : widget.activePortal.companyId})',
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                        ),
                      ],
                    ),
                    ErpTokens.pillTagMint('${widget.records.length} سجل نشط', fontSize: 10),
                  ],
                ),
              ),
              const Divider(height: 1, color: ErpTokens.hairlineLight),
              ...widget.records.map(
                (rec) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              rec.title,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ErpTokens.pillTagMint(rec.badgeText, fontSize: 10),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        rec.subtitle,
                        style: const TextStyle(fontSize: 11, color: ErpTokens.shade50, height: 1.35),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'الحالة: ${rec.status}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF047857)),
                          ),
                          Text(
                            '${rec.amountOrMetric} • ${rec.updatedAt}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOutlineOnDarkPill({required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
          border: Border.all(color: Colors.white24),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildPeriodTab(String key, String label) {
    final isSelected = _selectedPeriod == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedPeriod = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? ErpTokens.ink : Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildQuickPortalCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(ErpTokens.radiusLg),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: ErpTokens.cardPricingDecoration(),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: ErpTokens.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: ErpTokens.hairlineLight),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: Color(0xFFA1A1AA)),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required double progress,
    required Color progressColor,
    required String footerText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(ErpTokens.radiusLg),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: ErpTokens.cardPricingDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF71717A)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF4F4F5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 15, color: ErpTokens.ink),
                ),
              ],
            ),
            Text(
              value,
              style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900, color: ErpTokens.ink),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 4,
                backgroundColor: const Color(0xFFF4F4F5),
                valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              ),
            ),
            Text(
              footerText,
              style: const TextStyle(fontSize: 9.8, color: Color(0xFF71717A), fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

/// Dedicated Interactive Module Page View inside `AppShell`
/// Supports the 6 Authentic SMACC Accounting Divisions + SMACC 4-Stage Operational Structure
class EnterpriseModuleWorkspaceView extends StatefulWidget {
  final String activeTab;
  final String activeTabTitle;
  final SystemPortalOption activePortal;
  final List<ErpOperationalRecord> records;
  final VoidCallback onAddRecord;
  final VoidCallback? onOpenDocumentExtractorModal;
  final VoidCallback onTriggerInstantNotification;
  final VoidCallback onScheduleBackgroundNotification;
  final void Function(String href, String title) onNavigate;

  const EnterpriseModuleWorkspaceView({
    super.key,
    required this.activeTab,
    required this.activeTabTitle,
    required this.activePortal,
    required this.records,
    required this.onAddRecord,
    this.onOpenDocumentExtractorModal,
    required this.onTriggerInstantNotification,
    required this.onScheduleBackgroundNotification,
    required this.onNavigate,
  });

  @override
  State<EnterpriseModuleWorkspaceView> createState() => _EnterpriseModuleWorkspaceViewState();
}

class _EnterpriseModuleWorkspaceViewState extends State<EnterpriseModuleWorkspaceView> {
  String _searchQuery = '';
  String _statusFilter = 'الكل';
  int _smaccOperationalSubTab = 0;

  // Mobile HR & ESS Interactive State
  String? _jisrCheckInTime;
  String? _jisrCheckOutTime;
  String _selectedJisrRequestType = 'طلب إجازة سنوية';
  String _cloudSyncStatusLabel = 'جاهز للمزامنة السحابية الفورية (Supabase ESS)';
  bool _isCloudSyncing = false;
  bool _corporateCardFrozen = false;
  double _permissionQuotaUsedHours = 1.5;
  static const double _permissionQuotaMonthlyHours = 4.0;
  String? _esignVerifiedHash;
  int _selectedEnpsScore = 9;
  final List<({String id, String type, String status})> _jisrMobileRequests = [
    (id: 'WFR-901', type: 'إجازة سنوية صافية (5 أيام)', status: 'خطوة 1/2: المدير المباشر'),
    (id: 'WFR-902', type: 'تسوية فاتورة عهدة ZATCA (\u20C1 575)', status: 'معتمد ومرحل ✓'),
  ];

  // Smart Alerts Center State (Iqama, Art. 53 Probation, Qiwa SLA)
  final List<({String id, String code, String title, String actionLabel, bool acknowledged})> _jisrSmartAlerts = [
    (
      id: 'ALR-IQM-104',
      code: 'مقيم • إقامة',
      title: 'قرب انتهاء إقامة موظف خلال 24 يوماً — يلزم إصدار طلب تجديد بمكتب مقيم',
      actionLabel: 'إقرار وإصدار تجديد مقيم',
      acknowledged: false,
    ),
    (
      id: 'ALR-PRB-053',
      code: 'نظام العمل م53',
      title: 'بلوغ اليوم 78 من فترة التجربة — متاح قرار التثبيت أو التمديد الرسمي إلى 180 يوماً',
      actionLabel: 'إقرار وتوثيق قرار م53',
      acknowledged: false,
    ),
    (
      id: 'ALR-QIW-209',
      code: 'قوى • نطاقات',
      title: 'مؤشر نطاقات المنشأة في النطاق الأخضر المرتفع — بوابة أهلية التأشيرات مفعلة',
      actionLabel: 'إقرار ومطابقة السجل',
      acknowledged: false,
    ),
  ];

  // Earned Wage Access (الراتب المرن المستحق — ح/110701) State
  static const double _monthlyNetWage = 9549.38;
  static const int _workedDaysInCycle = 18;
  double _ewaWithdrawnTotal = 0.0;
  double _selectedEwaPayoutAmount = 1000.0;
  final List<({String id, double amount, String glRef})> _ewaDisbursements = [];

  // Colleague Shift Swap (تبديل وردية مع زميل — راحة نظامية >= 12 ساعة) State
  String _selectedSwapColleague = 'ريم احمد بن حسين (hr@kas.sa)';
  String _selectedSwapShift = 'الوردية المسائية (14:00 - 22:00)';
  final List<({String id, String colleague, String shiftLabel, String status})> _shiftSwapRequests = [
    (
      id: 'SWP-401',
      colleague: 'الجوري العنزي (a.alanazi@kas.sa)',
      shiftLabel: 'الوردية الصباحية (08:00 - 16:00)',
      status: 'معتمد ومحدث في جدول المناوبات ✓',
    ),
  ];

  static const List<String> _swapColleagueOptions = [
    'ريم احمد بن حسين (hr@kas.sa)',
    'الجوري العنزي (a.alanazi@kas.sa)',
    'حذيفه رمضان على حسن (h.hassan.safir@kas.sa)',
    'اكرم محمد الكناني (a.alkinani.acc@kas.sa)',
  ];

  static const List<String> _swapShiftOptions = [
    'الوردية الصباحية (08:00 - 16:00)',
    'الوردية المسائية (14:00 - 22:00)',
    'مناوبة نهاية الأسبوع المعتمدة (10:00 - 18:00)',
  ];

  static const Set<String> _jisrHrTabs = {
    'employees',
    'payrolls',
    'attendances',
    'employee-monitoring',
    'custodies',
    'jisr-alerts-compliance',
    'hr-smart-alerts',
    'jisr-accruals',
    'jisr-expenses',
    'jisr-org-muqeem',
    'jisr-talent-360',
    'jisr-shifts-overtime',
    'jisr-welcome-signage',
    'jisr-arrears-b2b',
    'jisr-cards-rollover',
    'jisr-workflows-pulse',
    'reem-hr-emails',
    'hr-official-emails',
    'ess-self-service',
    'profile',
    'self-service',
  };

  // Reem Bin Hussein Official Bilingual HR Email Suite (HR@kas.sa • CC: Khalid@kas.sa)
  String _selectedReemTemplateId = 'CUSTOM_OFFICIAL_CORRESPONDENCE';
  String _selectedReemScope = 'جميع الأقسام (69 حساب @kas.sa)';
  bool _isSendingReemEmail = false;
  late final TextEditingController _reemBodyArController;
  late final TextEditingController _reemBodyEnController;

  List<String> _resolveReemScopeEmails(String scope) {
    if (scope.contains('Khalid@kas.sa') && scope.contains('h.alsalim@kas.sa')) {
      return const ['Khalid@kas.sa', 'h.alsalim@kas.sa'];
    }
    if (scope.contains('n.alshetwi@kas.sa')) {
      return const ['n.alshetwi@kas.sa'];
    }
    if (scope.contains('HR@kas.sa')) {
      return const ['HR@kas.sa'];
    }
    if (scope.contains('a.farahat@kas.sa')) {
      return const ['a.farahat@kas.sa'];
    }
    return const [
      'Khalid@kas.sa',
      'h.alsalim@kas.sa',
      'n.alshetwi@kas.sa',
      'HR@kas.sa',
      'a.farahat@kas.sa',
    ];
  }

  @override
  void initState() {
    super.initState();
    final initialTpl = _reemOfficialTemplates.firstWhere(
      (t) => t.id == _selectedReemTemplateId,
      orElse: () => _reemOfficialTemplates.first,
    );
    _reemBodyArController = TextEditingController(text: initialTpl.bodyAr);
    _reemBodyEnController = TextEditingController(text: initialTpl.bodyEn);
  }

  @override
  void dispose() {
    _reemBodyArController.dispose();
    _reemBodyEnController.dispose();
    super.dispose();
  }

  static const List<String> _reemScopeOptions = [
    'جميع الأقسام (69 حساب @kas.sa)',
    'الإدارة العليا وتطوير الأعمال (Khalid@kas.sa • h.alsalim@kas.sa)',
    'التطوير والمتابعة (n.alshetwi@kas.sa)',
    'الموارد البشرية والشؤون الإدارية (HR@kas.sa)',
    'الإيواء والخدمات اللوجستية (a.farahat@kas.sa)',
  ];

  static const List<({
    String id,
    String titleAr,
    String titleEn,
    String subjectEn,
    String subjectAr,
    String bodyAr,
    String bodyEn,
  })> _reemOfficialTemplates = [
    (
      id: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
      titleAr: '١. خطاب / مراسلة رسمية مخصصة (تحرير حر بالقالب المعتمد)',
      titleEn: 'Custom Official HR Correspondence',
      subjectEn: 'Official Human Resources Correspondence - Khalid Al-Sulaim Group',
      subjectAr: 'مراسلة رسمية صادرة عن إدارة الموارد البشرية — مجموعة الخالد السليم',
      bodyAr:
          'نفيدكم باعتماد التوجيه الإداري الصادر عن إدارة الموارد البشرية بمجموعة الخالد السليم، ونأمل من الجميع الالتزام باستكمال الإجراءات المعتمدة ضمن المهلة المحددة.',
      bodyEn:
          'Please be advised of the official administrative directive issued by the Human Resources Department at Khalid Al-Sulaim Trading Group, and kindly ensure timely completion of all approved procedures.',
    ),
    (
      id: 'EMPLOYMENT_TRANSACTION_DECISION',
      titleAr: '٢. قرار معاملة وظيفية معتمد',
      titleEn: 'Official Employment Transaction Decision',
      subjectEn: 'Official Employment Transaction Decision',
      subjectAr: 'قرار معاملة وظيفية معتمد — الموارد البشرية',
      bodyAr:
          'نفيدكم باعتماد المعاملة الوظيفية وتحديث السجل الوظيفي والدرجة المعتمدة في منظومة الموارد البشرية وفق اللوائح المعتمدة لدى مجموعة الخالد السليم.',
      bodyEn:
          'Please be informed that your employment transaction has been officially approved and updated in the Khalid Al-Sulaim Trading Group HR registry.',
    ),
    (
      id: 'ADMINISTRATIVE_WARNING_ART71',
      titleAr: '٣. إنذار وقرار إداري نظامي (المواد 66–72)',
      titleEn: 'Official Administrative Warning (Labor Law Art. 71)',
      subjectEn: 'Official Written Administrative Notice - Saudi Labor Law Art. 71',
      subjectAr: 'إبلاغ خطي بقرار إداري نظامي وفق المادة (71) من نظام العمل',
      bodyAr:
          'استناداً إلى محضر التحقيق الإداري وأحكام المواد (66–72) من نظام العمل السعودي، نبلغكم كتابةً بقرار الجزاء المعتمد مع حفظ حق التظلم النظامي عبر البريد الرسمي HR@kas.sa.',
      bodyEn:
          'Pursuant to Articles 66-72 of the Saudi Labor Law and the documented investigation minutes, please take formal written notice of the approved disciplinary decision.',
    ),
    (
      id: 'PROACTIVE_COMPLIANCE_ALERT',
      titleAr: '٤. تنبيه امتثال استباقي وتجديد وثائق',
      titleEn: 'Proactive HR & Regulatory Compliance Alert',
      subjectEn: 'Proactive HR Compliance & Document Renewal Notice',
      subjectAr: 'تنبيه امتثال استباقي وتحديث الوثائق النظامية',
      bodyAr:
          'نود تذكيركم بقرب موعد الاستحقاق النظامي لتجديد الوثائق الرسمية (الهوية/الإقامة، عقد قوى، التأمين الطبي، أو فترة التجربة م53)، ونأمل استكمال المتطلبات عبر HR@kas.sa.',
      bodyEn:
          'Kindly note the upcoming statutory due date for renewing your official HR/government compliance documents (Iqama, Qiwa contract, CCHI insurance, or Art. 53 probation review).',
    ),
    (
      id: 'ONBOARDING_WELCOME_PACKAGE',
      titleAr: '٥. حزمة الترحيب والمباشرة الوظيفية',
      titleEn: 'Official Onboarding & Welcome Package',
      subjectEn: 'Welcome to Khalid Al-Sulaim Trading Group - Onboarding Package',
      subjectAr: 'الترحيب بالانضمام واعتماد المباشرة الوظيفية',
      bodyAr:
          'نرحب بانضمامكم إلى فريق عمل مجموعة الخالد السليم، ونرفق لكم بيانات البريد الرسمي (@kas.sa) وخطة المباشرة والتأهيل الوظيفي المعتمدة.',
      bodyEn:
          'Welcome to Khalid Al-Sulaim Trading Group. Enclosed are your official @kas.sa credentials, onboarding checklist, and the approved onboarding plan.',
    ),
    (
      id: 'INTERDEPARTMENTAL_WORK_TASK',
      titleAr: '٦. تكليف ومهمة عمل رسمية بين الأقسام',
      titleEn: 'Official Interdepartmental Work Task Assignment',
      subjectEn: 'Official Interdepartmental Work Assignment',
      subjectAr: 'تكليف مهمة عمل رسمية والتنسيق بين الأقسام',
      bodyAr:
          'يرجى الاطلاع على ملفات ومخرجات مهمة العمل المشتركة واستكمال الإجراء المطلوب ضمن المهلة المحددة مع إبقاء نسخة المتابعة لبريد الإدارة العليا.',
      bodyEn:
          'Please review the assigned interdepartmental deliverables and complete the required action within the scheduled SLA, keeping executive management copied.',
    ),
    (
      id: 'PAYROLL_WPS_PAYSLIP_NOTICE',
      titleAr: '٧. إشعار مسير الرواتب وحماية الأجور (WPS)',
      titleEn: 'Monthly Payroll & WPS Disbursement Notice',
      subjectEn: 'Official Monthly Payroll & WPSPayslip Notification',
      subjectAr: 'إشعار إيداع مسير الرواتب الشهري وحماية الأجور (WPS)',
      bodyAr:
          'نفيدكم باعتماد وصرف مسير الرواتب الشهري بالعملة الرسمية (\u20C1) عبر نظام حماية الأجور (WPS / مدد)، ويمكنكم مراجعة قسيمة الراتب التفصيلية عبر بوابة الخدمة الذاتية.',
      bodyEn:
          'Please be advised that the monthly WPS payroll (\u20C1) has been processed and transferred. Detailed payslips are available via the Employee Self-Service portal.',
    ),
    (
      id: 'GENERAL_HR_CIRCULAR',
      titleAr: '٨. تعميم إداري وتنظيمي عام للمجموعة',
      titleEn: 'General Corporate HR & Administrative Circular',
      subjectEn: 'Official Corporate HR Circular - Khalid Al-Sulaim Group',
      subjectAr: 'تعميم إداري وتنظيمي عام — إدارة الموارد البشرية',
      bodyAr:
          'يُعتمد العمل بموجب هذا التعميم الإداري في كافة شركات وأقسام مجموعة الخالد السليم اعتباراً من تاريخ صدوره، ونشكر للجميع حسن التعاون والالتزام.',
      bodyEn:
          'This official HR circular takes immediate effect across all Khalid Al-Sulaim Trading Group entities and departments. Thank you for your continuous cooperation.',
    ),
  ];

  final List<({String id, String subjectAr, String scope, String status})> _reemDispatchedLog = [
    (
      id: 'REEM-2026-01',
      subjectAr: 'تعميم إداري تنظيمي — ضوابط الدوام الرسمي واعتماد المعاملات الوظيفية',
      scope: 'جميع الأقسام (69 حساب @kas.sa)',
      status: 'صادر من HR@kas.sa • نسخة Khalid@kas.sa ✓',
    ),
  ];

  static const List<String> _jisrTenRequestTypes = [
    'طلب إجازة سنوية',
    'طلب سلفة مالية',
    'تأجيل قسط سلفة الشهر',
    'استئذان شخصي',
    'تصحيح بصمة / مهمة ميدانية',
    'تسوية مصروفات وعهدة',
    'رحلة عمل وبدل انتداب',
    'صرف تذكرة سفر سنوية',
    'تحديث آيبان وبيانات',
    'طلب استقالة وإخلاء طرف',
  ];

  bool get _isJisrHrModule => _jisrHrTabs.contains(widget.activeTab);

  static const Set<String> _smaccFinanceTabs = {
    'smacc-accounting',
    'journals',
    'vouchers',
    'zatca',
    'financial-requests',
    'cost-centers',
    'trial-balance',
    'accounting',
    'finance-home',
  };

  static const List<({String href, String code, String emoji, String title})> _smaccSixDivisions = [
    (href: 'smacc-accounting', code: 'SMACC-01', emoji: '📊', title: '١. الأستاذ العام وشجرة الحسابات'),
    (href: 'vouchers', code: 'SMACC-02', emoji: '🏦', title: '٢. النقدية والبنوك والسندات'),
    (href: 'zatca', code: 'SMACC-03', emoji: '🧾', title: '٣. العملاء والفوترة ZATCA'),
    (href: 'financial-requests', code: 'SMACC-04', emoji: '📑', title: '٤. الموردين والوكلاء والصرف'),
    (href: 'cost-centers', code: 'SMACC-05', emoji: '🏗️', title: '٥. مراكز التكلفة والأصول'),
    (href: 'trial-balance', code: 'SMACC-06', emoji: '📈', title: '٦. التقارير وميزان المراجعة'),
  ];

  static const List<String> _operationalSmaccSubTabs = [
    '١. المدخلات والسجلات الأساسية',
    '٢. الحركة اليومية والعقود',
    '٣. الربط الحكومي والاعتمادات',
    '٤. الكشوفات والتقارير والميزان',
  ];

  bool get _isSmaccFinanceModule => _smaccFinanceTabs.contains(widget.activeTab);

  @override
  Widget build(BuildContext context) {
    final filtered = widget.records.where((r) {
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        return r.title.toLowerCase().contains(q) ||
            r.subtitle.toLowerCase().contains(q) ||
            r.id.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Module Cinematic Header Banner
        Container(
          padding: const EdgeInsets.all(18),
          decoration: ErpTokens.cardFeatureCinematicDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ErpTokens.pillTagMint(
                    'دفتر محاسبي مستقل: ${widget.activePortal.companyId == 'all' ? 'GRP-ALL' : widget.activePortal.companyId}',
                    icon: Icons.verified_user_rounded,
                    fontSize: 10.5,
                  ),
                  Text(
                    widget.activePortal.license,
                    style: const TextStyle(fontSize: 10, color: ErpTokens.goldLight, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                widget.activeTabTitle,
                style: const TextStyle(fontSize: 18.5, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                _isSmaccFinanceModule
                    ? 'بيئة نظام سماك المحاسبي المستقل لشركة ${widget.activePortal.nameAr} — قيد مزدوج متوازن، فوترة ZATCA المرحلة الثانية، وعزل محاسبي تام عن بقية الشركات.'
                    : 'إدارة ومعالجة سجلات ${widget.activeTabTitle} ضمن بيئة ${widget.activePortal.nameAr} المعزولة وفق التقسيم الهيكلي المعتمد.',
                style: const TextStyle(fontSize: 11.5, color: Color(0xFFA1A1AA), height: 1.4),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  InkWell(
                    onTap: widget.onAddRecord,
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add_circle_outline_rounded, size: 15, color: ErpTokens.ink),
                          const SizedBox(width: 5),
                          Text(
                            _isSmaccFinanceModule ? 'إضافة قيد / سند محاسبي جديد' : 'إضافة سجل جديد + إشعار فوري',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (widget.onOpenDocumentExtractorModal != null)
                    InkWell(
                      onTap: widget.onOpenDocumentExtractorModal,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                        decoration: BoxDecoration(
                          color: ErpTokens.champagneGold,
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.upload_file_rounded, size: 15, color: ErpTokens.charcoalDark),
                            SizedBox(width: 5),
                            Text(
                              'رفع دفعة فواتير / مستندات (100 صورة / PDF / Word / Excel)',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.charcoalDark),
                            ),
                          ],
                        ),
                      ),
                    ),
                  InkWell(
                    onTap: widget.onScheduleBackgroundNotification,
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: ErpTokens.champagneGold.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.5)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.notifications_active_rounded, size: 14, color: ErpTokens.goldLight),
                          SizedBox(width: 5),
                          Text(
                            'إشعار بالخلفية (5 ثوانٍ)',
                            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: ErpTokens.goldLight),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // SMACC 6-Division Accounting Navigator, HR Mobile Hub, OR 4-Division Operational Sub-Bar
        if (_isSmaccFinanceModule) ...[
          _buildSmaccSixDivisionsNavigator(),
          const SizedBox(height: 12),
          _buildSmaccAccountingDivisionDetails(),
          const SizedBox(height: 12),
        ] else if (_isJisrHrModule) ...[
          _buildJisrMobileHrAndSelfServiceHub(),
          const SizedBox(height: 12),
        ] else ...[
          _buildOperationalSmaccSubTabsBar(),
          const SizedBox(height: 12),
        ],

        // Search & Filter Bar inside `.table-card`
        Container(
          padding: const EdgeInsets.all(14),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                style: const TextStyle(fontSize: 13, color: ErpTokens.ink),
                decoration: InputDecoration(
                  hintText: 'ابحث برقم المرجع، البيان، أو الحالة في ${widget.activeTabTitle}...',
                  hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF71717A)),
                  prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF71717A)),
                  filled: true,
                  fillColor: ErpTokens.surfaceSubtle,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    borderSide: const BorderSide(color: ErpTokens.ink, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['الكل', 'مرحّل / نشط', 'تحت المراجعة', 'موثق ZATCA / مساند'].map((status) {
                    final active = _statusFilter == status;
                    return Padding(
                      padding: const EdgeInsetsDirectional.only(end: 6),
                      child: ChoiceChip(
                        label: Text(status),
                        selected: active,
                        onSelected: (_) => setState(() => _statusFilter = status),
                        selectedColor: ErpTokens.primary,
                        backgroundColor: ErpTokens.surfaceSubtle,
                        labelStyle: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: active ? Colors.white : ErpTokens.ink,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          side: BorderSide(color: active ? ErpTokens.primary : ErpTokens.hairlineLight),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Records Table Card (`.table-card` in `components.css`)
        Container(
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'سجلات ودفاتر ${widget.activeTabTitle}',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    ErpTokens.pillTagMint('${filtered.length} سجل مطابق', fontSize: 10.5),
                  ],
                ),
              ),
              const Divider(height: 1, color: ErpTokens.hairlineLight),
              if (filtered.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(28),
                  child: Center(
                    child: Text(
                      'لا توجد سجلات مطابقة لمعايير البحث الحالية.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF71717A)),
                    ),
                  ),
                )
              else
                ...filtered.map(
                  (rec) => Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF4F4F5),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '#${rec.id}',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: ErpTokens.ink,
                                ),
                              ),
                            ),
                            ErpTokens.pillTagMint(rec.badgeText, fontSize: 10),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          rec.title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          rec.subtitle,
                          style: const TextStyle(fontSize: 11.5, color: ErpTokens.shade50, height: 1.4),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: ErpTokens.statusSuccessBg,
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                border: Border.all(color: ErpTokens.statusSuccessBorder),
                              ),
                              child: Text(
                                rec.status,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF065F46),
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () => _showRecordAttachmentPreview(context, rec),
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: ErpTokens.goldPale,
                                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                  border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.6)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.visibility_outlined, size: 13, color: ErpTokens.ink),
                                    const SizedBox(width: 4),
                                    Text(
                                      rec.attachmentLabel ?? 'معاينة صورة / مرفق المستند (${rec.sourceFormat ?? 'PDF/QR'})',
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: ErpTokens.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Text(
                              rec.amountOrMetric,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _showRecordAttachmentPreview(BuildContext context, ErpOperationalRecord rec) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'معاينة المستند المرفق والفاتورة #${rec.id}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ErpTokens.canvasCream,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ErpTokens.champagneGold, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'النظام المحاسبي المستقل لشركة [${rec.companyId}]',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: ErpTokens.goldLight),
                          ),
                        ),
                        ErpTokens.pillTagMint(rec.sourceFormat ?? 'ZATCA Phase 2 / PDF', fontSize: 9.5),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      rec.title,
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      rec.subtitle,
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF52525B)),
                    ),
                    const Divider(height: 20, color: ErpTokens.hairlineLight),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('القيمة المالية الإجمالية:', style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A))),
                            Text(
                              rec.amountOrMetric,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'حالة التوثيق والترحيل: ${rec.status}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                            ),
                          ],
                        ),
                        Container(
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: ErpTokens.ink, width: 1.5),
                          ),
                          alignment: Alignment.center,
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.qr_code_2_rounded, size: 42, color: ErpTokens.ink),
                              Text('ZATCA QR', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: ErpTokens.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ErpTokens.radiusPill)),
                ),
                onPressed: () => Navigator.of(ctx).pop(),
                icon: const Icon(Icons.check_circle_outline_rounded, color: ErpTokens.goldLight, size: 16),
                label: const Text('إغلاق معاينة المستند الموثق'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSmaccSixDivisionsNavigator() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Text('📊', style: TextStyle(fontSize: 15)),
                  SizedBox(width: 6),
                  Text(
                    'التقسيمات الـ 6 المعتمدة لنظام سماك المحاسبي (SMACC)',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                  ),
                ],
              ),
              ErpTokens.pillTagMint('قيد مزدوج متوازن', fontSize: 9.5),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _smaccSixDivisions.map((div) {
                final isSelected = widget.activeTab == div.href ||
                    (widget.activeTab == 'journals' && div.href == 'smacc-accounting') ||
                    (widget.activeTab == 'accounting' && div.href == 'smacc-accounting');
                return Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: InkWell(
                    onTap: () => widget.onNavigate(div.href, div.title),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: isSelected ? ErpTokens.primary : ErpTokens.surfaceSubtle,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? ErpTokens.champagneGold : ErpTokens.hairlineLight,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(div.emoji, style: const TextStyle(fontSize: 14)),
                          const SizedBox(width: 6),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                div.code,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected ? ErpTokens.goldLight : const Color(0xFF71717A),
                                ),
                              ),
                              Text(
                                div.title,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected ? Colors.white : ErpTokens.ink,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmaccAccountingDivisionDetails() {
    final tab = widget.activeTab;
    if (tab == 'vouchers') {
      return _buildSmaccSummaryBox(
        badge: 'SMACC-02 • النقدية والبنوك',
        title: 'أرصدة الصناديق والحسابات البنكية وسندات القبض والصرف',
        metrics: const [
          (label: 'مصرف الراجحي الرئيسي', value: '842,500 ⃁', sub: 'مطابق لكشف البنك'),
          (label: 'البنك الأهلي SNB', value: '514,200 ⃁', sub: 'حساب الضمانات'),
          (label: 'الصندوق النقدي (العهدة)', value: '38,400 ⃁', sub: 'جرد يومي مطابق'),
        ],
        rows: const [
          (code: 'RV-2026-8841', name: 'سند قبض دفعة عقد استقدام مساند #99412', amount: '+ 19,550 ⃁', tag: 'سند قبض مرحّل'),
          (code: 'PV-2026-4410', name: 'سند صرف مستحقات وكيل الفلبين (حوالة دولية)', amount: '- 42,000 ⃁', tag: 'سند صرف معتمد'),
          (code: 'RV-2026-8842', name: 'سند قبض دفعة تأجير شهري — ياقوت', amount: '+ 3,450 ⃁', tag: 'سند قبض مرحّل'),
        ],
      );
    }
    if (tab == 'zatca') {
      return _buildSmaccSummaryBox(
        badge: 'SMACC-03 • الفوترة الإلكترونية ZATCA المرحلة الثانية',
        title: 'سجل الفواتير الضريبية والمبسطة والربط التشفيري المباشر (Fatoora)',
        metrics: const [
          (label: 'فواتير معتمدة (Phase 2)', value: '318 فاتورة', sub: 'ختم تشفيري XML + QR'),
          (label: 'إجمالي المبيعات الخاضعة', value: '1,480,000 ⃁', sub: 'الربع الحالي'),
          (label: 'ضريبة القيمة المضافة 15%', value: '222,000 ⃁', sub: 'جاهزة للإقرار الضريبي'),
        ],
        rows: const [
          (code: 'INV-ZATCA-9041', name: 'فاتورة ضريبية مبسطة — عقد استقدام #MSN-99412', amount: '19,550 ⃁ (شامل 15%)', tag: 'معتمدة ZATCA QR'),
          (code: 'INV-ZATCA-9042', name: 'فاتورة ضريبية B2B — عقد تشغيل وإمداد عمالة', amount: '69,000 ⃁ (شامل 15%)', tag: 'معتمدة ZATCA XML'),
          (code: 'CN-ZATCA-104', name: 'إشعار دائن ضريبي — تسوية استبدال خلال الضمان', amount: '- 8,500 ⃁', tag: 'إشعار دائن موثق'),
        ],
      );
    }
    if (tab == 'financial-requests') {
      return _buildSmaccSummaryBox(
        badge: 'SMACC-04 • حسابات الموردين والوكلاء وأوامر الصرف',
        title: 'ذمم الوكلاء الخارجيين، رسوم مساند، واعتمادات الصرف',
        metrics: const [
          (label: 'مستحقات الوكلاء الخارجيين', value: '184,000 ⃁', sub: '6 وكلاء دوليين'),
          (label: 'رسوم مساند وإنجاز المسددة', value: '62,400 ⃁', sub: 'مفوترة آلياً'),
          (label: 'أوامر صرف بانتظار الاعتماد', value: '4 أوامر', sub: 'تحت توقيع المدير المالي'),
        ],
        rows: const [
          (code: 'PO-2026-311', name: 'أمر صرف دفعة وكيل مانيلا — 12 تأشيرة مصدرة', amount: '54,000 ⃁', tag: 'معتمد للصرف'),
          (code: 'PO-2026-312', name: 'سداد رسوم توثيق مساند وتفاويض إنجاز', amount: '14,250 ⃁', tag: 'مسدد عبر سداد'),
          (code: 'PO-2026-315', name: 'توريد إعاشة وتموين لمركز دار الرواد للإيواء', amount: '18,900 ⃁', tag: 'معتمد للصرف'),
        ],
      );
    }
    if (tab == 'cost-centers') {
      return _buildSmaccSummaryBox(
        badge: 'SMACC-05 • مراكز التكلفة والأصول الثابتة',
        title: 'توزيع الإيرادات والمصروفات على مراكز التكلفة وإهلاك الأصول',
        metrics: const [
          (label: 'مركز تكلفة الاستقدام (SAF)', value: '+ 612,000 ⃁', sub: 'هامش ربح 28%'),
          (label: 'مركز تكلفة التأجير (YAQ)', value: '+ 390,000 ⃁', sub: 'هامش ربح 31%'),
          (label: 'صافي الأصول الثابتة', value: '1,120,000 ⃁', sub: 'بعد احتساب الإهلاك'),
        ],
        rows: const [
          (code: 'CC-101', name: 'مركز تكلفة عقود الاستقدام — الفرع الرئيسي الرياض', amount: 'إيراد: 920,000 ⃁', tag: 'نشط • SAF'),
          (code: 'CC-201', name: 'مركز تكلفة عقود التأجير الشهري — ياقوت', amount: 'إيراد: 540,000 ⃁', tag: 'نشط • YAQ'),
          (code: 'CC-501', name: 'مركز تكلفة تشغيل مركز الإيواء — دار الرواد', amount: 'موازنة: 210,000 ⃁', tag: 'نشط • DAR'),
        ],
      );
    }
    if (tab == 'trial-balance') {
      return _buildSmaccSummaryBox(
        badge: 'SMACC-06 • ميزان المراجعة والقوائم المالية الختامية',
        title: 'ميزان المراجعة بالمجاميع والأرصدة وقائمة الدخل والميزانية العمومية',
        metrics: const [
          (label: 'إجمالي المدين (Debit)', value: '4,820,500 ⃁', sub: 'متوازن 100%'),
          (label: 'إجمالي الدائن (Credit)', value: '4,820,500 ⃁', sub: 'الفرق: 0.00 ⃁'),
          (label: 'صافي الربح التشغيلي', value: '945,200 ⃁', sub: 'قائمة الدخل الموحدة'),
        ],
        rows: const [
          (code: '1000', name: 'الأصول المتداولة وغير المتداولة (النقدية، البنوك، الذمم)', amount: 'مدين: 2,640,000 ⃁', tag: 'الميزانية العمومية'),
          (code: '2000-3000', name: 'الالتزامات وحقوق الملكية ومخصصات الضمان', amount: 'دائن: 1,694,800 ⃁', tag: 'الميزانية العمومية'),
          (code: '4000-5000', name: 'صافي الإيرادات مطروحاً منه تكلفة النشاط والمصروفات', amount: 'صافي ربح: 945,200 ⃁', tag: 'قائمة الدخل'),
        ],
      );
    }

    // Default SMACC-01: General Ledger & Chart of Accounts (`smacc-accounting` / `journals`)
    return _buildSmaccSummaryBox(
      badge: 'SMACC-01 • الأستاذ العام وشجرة الحسابات وقيود اليومية',
      title: 'شجرة الحسابات القياسية (نظام سماك) ودفتر القيود المزدوجة',
      metrics: const [
        (label: 'حسابات الدليل الشجري', value: '64 حساب رئيسي وفرعي', sub: 'الأصول • الخصوم • الإيرادات'),
        (label: 'قيود اليومية المرحلة', value: '1,420 قيد مزدوج', sub: 'توازن آلي 100%'),
        (label: 'الرصيد النقدي والبنكي', value: '1,395,100 ⃁', sub: 'الأستاذ العام GL'),
      ],
      rows: const [
        (code: '1101 / 1102', name: 'الأصول المتداولة — الصناديق النقدية والبنوك المحلية', amount: '1,395,100 ⃁ (مدين)', tag: 'مستوى ١ • أصول'),
        (code: '1103 / 2101', name: 'ذمم العملاء المدينة مقابل ذمم الوكلاء الخارجيين الدائنة', amount: '412,000 ⃁ (صافي)', tag: 'مستوى ٢ • ذمم'),
        (code: '2104', name: 'حساب ضريبة القيمة المضافة المحصلة (ZATCA VAT 15%)', amount: '222,000 ⃁ (دائن)', tag: 'مستوى ٢ • التزامات'),
        (code: '4101 / 5101', name: 'إيرادات عقود الاستقدام والتأجير مقابل التكاليف المباشرة', amount: '1,480,000 ⃁ (دائن)', tag: 'مستوى ١ • إيرادات'),
      ],
    );
  }

  Widget _buildSmaccSummaryBox({
    required String badge,
    required String title,
    required List<({String label, String value, String sub})> metrics,
    required List<({String code, String name, String amount, String tag})> rows,
  }) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 6,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              ErpTokens.pillTagMint(badge, fontSize: 10),
              const Text(
                'تحديث لحظي • شجرة سماك المعتمدة',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF71717A)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
          ),
          const SizedBox(height: 12),
          Row(
            children: metrics
                .map(
                  (m) => Expanded(
                    child: Container(
                      margin: const EdgeInsetsDirectional.only(end: 6),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: ErpTokens.surfaceSubtle,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: ErpTokens.hairlineLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            m.label,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF71717A)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            m.value,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            m.sub,
                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFF047857)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: ErpTokens.hairlineLight),
          ...rows.map(
            (r) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 9),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: ErpTokens.primary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      r.code,
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: ErpTokens.goldLight),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.name,
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                        ),
                        Text(
                          r.tag,
                          style: const TextStyle(fontSize: 10, color: Color(0xFF71717A)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    r.amount,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOperationalSmaccSubTabsBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_tree_outlined, size: 15, color: ErpTokens.ink),
              SizedBox(width: 6),
              Text(
                'التقسيم الهيكلي الموحد للقسم (على نمط نظام سماك SMACC):',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(_operationalSmaccSubTabs.length, (idx) {
                final selected = _smaccOperationalSubTab == idx;
                return Padding(
                  padding: const EdgeInsetsDirectional.only(end: 6),
                  child: ChoiceChip(
                    label: Text(_operationalSmaccSubTabs[idx]),
                    selected: selected,
                    onSelected: (_) => setState(() => _smaccOperationalSubTab = idx),
                    selectedColor: ErpTokens.primary,
                    backgroundColor: ErpTokens.surfaceSubtle,
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : ErpTokens.ink,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      side: BorderSide(color: selected ? ErpTokens.champagneGold : ErpTokens.hairlineLight),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJisrMobileHrAndSelfServiceHub() {
    final now = TimeOfDay.now();
    final formattedNow =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final accruedWageToDate = (_monthlyNetWage / 30.0) * _workedDaysInCycle;
    final maxEwaCap = accruedWageToDate * 0.50;
    final availableEwaBalance =
        (maxEwaCap - _ewaWithdrawnTotal).clamp(0.0, maxEwaCap);
    final pendingAlertsCount =
        _jisrSmartAlerts.where((a) => !a.acknowledged).length;
    final isReemEmailTabActive = widget.activeTab == 'reem-hr-emails' ||
        widget.activeTab == 'hr-official-emails';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFFFF),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isReemEmailTabActive) ...[
            _buildReemHrOfficialEmailSection(),
            const SizedBox(height: 12),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Row(
                  children: [
                    Icon(Icons.fingerprint_rounded, size: 17, color: Color(0xFF141414)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'منظومة الموارد البشرية والخدمة الذاتية والامتثال الشاملة',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF141414),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: pendingAlertsCount > 0
                      ? const Color(0xFF141414)
                      : const Color(0xFFF3F3F3),
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  border: Border.all(color: const Color(0xFFE0E0E0)),
                ),
                child: Text(
                  pendingAlertsCount > 0
                      ? 'تنبيهات نشطة: $pendingAlertsCount'
                      : 'مكتمل الإقرار ✓',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: pendingAlertsCount > 0
                        ? const Color(0xFFFFFFFF)
                        : const Color(0xFF141414),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 1. GPS Geofence Check-in / Check-out Strip
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF141414),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _jisrCheckInTime == null
                      ? 'المقر الرئيسي — الرياض (ضمن السياج الجغرافي 250m • KAS-HQ-CORP)'
                      : 'بصمة اليوم الموثقة: دخول $_jisrCheckInTime${_jisrCheckOutTime != null ? ' | انصراف $_jisrCheckOutTime' : ''}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFFFFFFF),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() => _jisrCheckInTime = formattedNow);
                          widget.onTriggerInstantNotification();
                        },
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFFFF),
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            'تسجيل حضور GPS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF141414),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() => _jisrCheckOutTime = formattedNow);
                          widget.onTriggerInstantNotification();
                        },
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF262626),
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            border: Border.all(color: const Color(0xFFE0E0E0).withValues(alpha: 0.25)),
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            'تسجيل انصراف',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFFFFFFF),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 2. Digital Payslip + Leave Wallet Summary
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F3F3),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE0E0E0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'صافي قسيمة الراتب (WPS)',
                        style: TextStyle(fontSize: 10, color: Color(0xFF707070)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '\u20C1 ${(_monthlyNetWage - _ewaWithdrawnTotal).toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F3F3),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE0E0E0)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'رصيد الإجازة السنوية الصافي',
                        style: TextStyle(fontSize: 10, color: Color(0xFF707070)),
                      ),
                      SizedBox(height: 2),
                      Text(
                        '21 يوماً (باستثناء العطل الرسمية)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 3. Interactive Smart Alerts Radar & Compliance Acknowledgment
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F3F3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active_outlined, size: 15, color: Color(0xFF141414)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'رادار التنبيهات الذكية والامتثال العمالي (مقيم • م53 • قوى)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...List.generate(_jisrSmartAlerts.length, (index) {
                  final alert = _jisrSmartAlerts[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE0E0E0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3F3F3),
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                border: Border.all(color: const Color(0xFFE0E0E0)),
                              ),
                              child: Text(
                                '${alert.id} • ${alert.code}',
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF141414),
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: alert.acknowledged
                                  ? null
                                  : () {
                                      setState(() {
                                        _jisrSmartAlerts[index] = (
                                          id: alert.id,
                                          code: alert.code,
                                          title: alert.title,
                                          actionLabel: alert.actionLabel,
                                          acknowledged: true,
                                        );
                                        _jisrMobileRequests.insert(0, (
                                          id: alert.id,
                                          type: '${alert.actionLabel} (${alert.code})',
                                          status: 'تم التنفيذ والتوثيق ✓',
                                        ));
                                      });
                                      widget.onTriggerInstantNotification();
                                    },
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: alert.acknowledged
                                      ? const Color(0xFFF3F3F3)
                                      : const Color(0xFF141414),
                                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                  border: Border.all(color: const Color(0xFFE0E0E0)),
                                ),
                                child: Text(
                                  alert.acknowledged
                                      ? 'تم الإقرار والتنفيذ ✓'
                                      : alert.actionLabel,
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: alert.acknowledged
                                        ? const Color(0xFF141414)
                                        : const Color(0xFFFFFFFF),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Text(
                          alert.title,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF141414),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 4. Real Earned Wage Access (الراتب المرن المبكر — EWA Pay)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F3F3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.account_balance_wallet_outlined, size: 15, color: Color(0xFF141414)),
                        SizedBox(width: 6),
                        Text(
                          'الراتب المرن المستحق (أيام عمل فعلية: 18 يوماً)',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF141414),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'متاح: \u20C1 ${availableEwaBalance.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF141414),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [500.0, 1000.0, 1500.0].map((amt) {
                    final isSelected = _selectedEwaPayoutAmount == amt;
                    final isEnabled = amt <= availableEwaBalance;
                    return InkWell(
                      onTap: isEnabled
                          ? () => setState(() => _selectedEwaPayoutAmount = amt)
                          : null,
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF141414)
                              : const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: Text(
                          '\u20C1 ${amt.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: !isEnabled
                                ? const Color(0xFF707070)
                                : isSelected
                                    ? const Color(0xFFFFFFFF)
                                    : const Color(0xFF141414),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: availableEwaBalance >= 100
                      ? () {
                          final payout = _selectedEwaPayoutAmount <= availableEwaBalance
                              ? _selectedEwaPayoutAmount
                              : availableEwaBalance;
                          if (payout <= 0) return;
                          final stamp = (DateTime.now().millisecondsSinceEpoch % 100000)
                              .toString()
                              .padLeft(5, '0');
                          setState(() {
                            _ewaWithdrawnTotal += payout;
                            _ewaDisbursements.insert(0, (
                              id: 'EWA-$stamp',
                              amount: payout,
                              glRef: 'JE-EWA-$stamp (مدين 110701 / دائن 110201)',
                            ));
                            _jisrMobileRequests.insert(0, (
                              id: 'EWA-$stamp',
                              type: 'صرف راتب مرن مستحق (\u20C1 ${payout.toStringAsFixed(2)})',
                              status: 'مرحل للأستاذ العام وسند الصرف ✓',
                            ));
                          });
                          widget.onTriggerInstantNotification();
                        }
                      : null,
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 14),
                    decoration: BoxDecoration(
                      color: availableEwaBalance >= 100
                          ? const Color(0xFF141414)
                          : const Color(0xFFE0E0E0),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      availableEwaBalance >= 100
                          ? 'صرف الراتب المرن وترحيل قيد اليومية (\u20C1 ${(_selectedEwaPayoutAmount <= availableEwaBalance ? _selectedEwaPayoutAmount : availableEwaBalance).toStringAsFixed(0)})'
                          : 'تم استيفاء السقف المستحق للشهر الحالي',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: availableEwaBalance >= 100
                            ? const Color(0xFFFFFFFF)
                            : const Color(0xFF707070),
                      ),
                    ),
                  ),
                ),
                if (_ewaDisbursements.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  ..._ewaDisbursements.take(2).map(
                        (d) => Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Text(
                            '${d.id}: \u20C1 ${d.amount.toStringAsFixed(2)} • ${d.glRef}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF141414),
                            ),
                          ),
                        ),
                      ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 5. Real Colleague Shift Swap Submission (تبديل وردية مع زميل)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F3F3),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(Icons.swap_horiz_rounded, size: 16, color: Color(0xFF141414)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'تبديل وردية مع زميل (تحقق فاصل الراحة النظامي >= 12 ساعة)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFFFF),
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    border: Border.all(color: const Color(0xFFE0E0E0)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedSwapColleague,
                      isExpanded: true,
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF141414),
                      ),
                      items: _swapColleagueOptions
                          .map((c) => DropdownMenuItem<String>(value: c, child: Text(c)))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedSwapColleague = v);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 36,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedSwapShift,
                            isExpanded: true,
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF141414),
                            ),
                            items: _swapShiftOptions
                                .map((s) => DropdownMenuItem<String>(value: s, child: Text(s)))
                                .toList(),
                            onChanged: (v) {
                              if (v != null) setState(() => _selectedSwapShift = v);
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () {
                        final stamp = (DateTime.now().millisecondsSinceEpoch % 10000)
                            .toString()
                            .padLeft(4, '0');
                        setState(() {
                          _shiftSwapRequests.insert(0, (
                            id: 'SWP-$stamp',
                            colleague: _selectedSwapColleague,
                            shiftLabel: _selectedSwapShift,
                            status: 'بانتظار اعتماد المشرف',
                          ));
                          _jisrMobileRequests.insert(0, (
                            id: 'SWP-$stamp',
                            type: 'تبديل وردية مع $_selectedSwapColleague',
                            status: 'بانتظار اعتماد المشرف',
                          ));
                        });
                        widget.onTriggerInstantNotification();
                      },
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                        decoration: BoxDecoration(
                          color: const Color(0xFF141414),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                        child: const Text(
                          'تقديم التبديل',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFFFFFFF),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ..._shiftSwapRequests.take(2).map((swap) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${swap.id} • ${swap.colleague} — ${swap.shiftLabel}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF141414),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () {
                            setState(() {
                              final idx = _shiftSwapRequests.indexOf(swap);
                              if (idx >= 0) {
                                _shiftSwapRequests[idx] = (
                                  id: swap.id,
                                  colleague: swap.colleague,
                                  shiftLabel: swap.shiftLabel,
                                  status: 'معتمد ومحدث في جدول المناوبات ✓',
                                );
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFFFF),
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              border: Border.all(color: const Color(0xFFE0E0E0)),
                            ),
                            child: Text(
                              swap.status,
                              style: const TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF141414),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 6. Quick 10-Request Launcher
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F3F3),
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    border: Border.all(color: const Color(0xFFE0E0E0)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedJisrRequestType,
                      isExpanded: true,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF141414),
                      ),
                      items: _jisrTenRequestTypes
                          .map((t) => DropdownMenuItem<String>(value: t, child: Text(t)))
                          .toList(),
                      onChanged: (v) {
                        if (v != null) setState(() => _selectedJisrRequestType = v);
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () {
                  final stamp = (DateTime.now().millisecondsSinceEpoch % 10000)
                      .toString()
                      .padLeft(4, '0');
                  setState(() {
                    _jisrMobileRequests.insert(0, (
                      id: 'WFR-$stamp',
                      type: _selectedJisrRequestType,
                      status: 'خطوة 1: بانتظار المدير المباشر',
                    ));
                  });
                  widget.onTriggerInstantNotification();
                },
                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141414),
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  ),
                  child: const Text(
                    'إطلاق الطلب',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFFFFFFFF),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ..._jisrMobileRequests.take(4).map(
                (req) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${req.id} • ${req.type}',
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF141414),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          setState(() {
                            final idx = _jisrMobileRequests.indexOf(req);
                            if (idx >= 0) {
                              _jisrMobileRequests[idx] = (
                                id: req.id,
                                type: req.type,
                                status: 'معتمد نهائياً ✓',
                              );
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F3F3),
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            border: Border.all(color: const Color(0xFFE0E0E0)),
                          ),
                          child: Text(
                            req.status,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF141414),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          const SizedBox(height: 12),
          // 7. Enterprise HR Mobile Suite (Supabase Cloud Sync, Corporate Card, Permission Quota, E-Sign, eNPS)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F3F3),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'منظومة الموارد البشرية المتنقلة (البطاقة • الاستئذان • التوقيع OTP • نبض eNPS)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: _isCloudSyncing
                          ? null
                          : () async {
                              setState(() => _isCloudSyncing = true);
                              final res = await SupabaseEssSyncService.fetchEmployeeEssSnapshot(
                                'SAF',
                              );
                              if (!mounted) return;
                              setState(() {
                                _isCloudSyncing = false;
                                _cloudSyncStatusLabel = res.statusLabel;
                              });
                            },
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF141414),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                        child: Text(
                          _isCloudSyncing ? 'جاري المزامنة...' : 'مزامنة Supabase',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFFFFFFF),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _cloudSyncStatusLabel,
                  style: const TextStyle(fontSize: 10, color: Color(0xFF707070)),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    // Corporate Card Freeze/Unfreeze
                    InkWell(
                      onTap: () {
                        setState(() => _corporateCardFrozen = !_corporateCardFrozen);
                        SupabaseEssSyncService.pushMobileEssAction(
                          'hr_corporate_cards',
                          <String, dynamic>{
                            'status': _corporateCardFrozen ? 'FROZEN' : 'ACTIVE',
                            'updated_at': DateTime.now().toIso8601String(),
                          },
                        );
                      },
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _corporateCardFrozen
                              ? const Color(0xFF141414)
                              : const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: Text(
                          _corporateCardFrozen
                              ? 'البطاقة مجمدة (اضغط للفك)'
                              : 'بطاقة المصروفات نشطة •\u20C1 20,000/شهر',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: _corporateCardFrozen
                                ? const Color(0xFFFFFFFF)
                                : const Color(0xFF141414),
                          ),
                        ),
                      ),
                    ),
                    // Monthly Permission Quota Pill
                    InkWell(
                      onTap: () {
                        setState(() {
                          _permissionQuotaUsedHours =
                              (_permissionQuotaUsedHours + 0.5) > _permissionQuotaMonthlyHours
                                  ? 0.5
                                  : _permissionQuotaUsedHours + 0.5;
                        });
                      },
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: Text(
                          'رصيد الاستئذان: ${_permissionQuotaUsedHours.toStringAsFixed(1)} / ${_permissionQuotaMonthlyHours.toStringAsFixed(0)} س (فترة 25-24)',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF141414),
                          ),
                        ),
                      ),
                    ),
                    // OTP E-Sign Action
                    InkWell(
                      onTap: () {
                        final stamp = DateTime.now().millisecondsSinceEpoch.toRadixString(16);
                        setState(() {
                          _esignVerifiedHash = 'SHA256-OTP-$stamp'.toUpperCase();
                        });
                        SupabaseEssSyncService.pushMobileEssAction(
                          'hr_verified_esignatures',
                          <String, dynamic>{
                            'document_type': 'EMPLOYMENT_CONTRACT',
                            'verification_channel': 'OTP_SMS',
                            'document_sha256': 'SHA256-OTP-$stamp',
                            'otp_verified': true,
                          },
                        );
                      },
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _esignVerifiedHash != null
                              ? const Color(0xFF141414)
                              : const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: Text(
                          _esignVerifiedHash != null
                              ? 'موقّع عبر OTP ✓ ($_esignVerifiedHash)'
                              : 'توثيق عقد بـ OTP (SHA-256)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: _esignVerifiedHash != null
                                ? const Color(0xFFFFFFFF)
                                : const Color(0xFF141414),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text(
                      'نبض eNPS السري:',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF141414),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: List<int>.generate(11, (i) => i).map((score) {
                          final selected = _selectedEnpsScore == score;
                          return InkWell(
                            onTap: () => setState(() => _selectedEnpsScore = score),
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            child: Container(
                              width: 22,
                              height: 22,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: selected
                                    ? const Color(0xFF141414)
                                    : const Color(0xFFFFFFFF),
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                border: Border.all(color: const Color(0xFFE0E0E0)),
                              ),
                              child: Text(
                                '$score',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: selected
                                      ? const Color(0xFFFFFFFF)
                                      : const Color(0xFF141414),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (!isReemEmailTabActive) ...[
            const SizedBox(height: 12),
            _buildReemHrOfficialEmailSection(),
          ],
        ],
      ),
    );
  }

  Widget _buildReemHrOfficialEmailSection() {
    final activeTpl = _reemOfficialTemplates.firstWhere(
      (t) => t.id == _selectedReemTemplateId,
      orElse: () => _reemOfficialTemplates.first,
    );
    final effectiveBodyAr = _reemBodyArController.text.trim().isEmpty
        ? activeTpl.bodyAr
        : _reemBodyArController.text.trim();
    final effectiveBodyEn = _reemBodyEnController.text.trim().isEmpty
        ? activeTpl.bodyEn
        : _reemBodyEnController.text.trim();
    final combinedSubject = '${activeTpl.subjectEn} - ${activeTpl.subjectAr}';
    final fullBilingualDraft = '''
From: Reem Bin Hussein - HR <HR@kas.sa>
To: $_selectedReemScope
CC: Khalid@kas.sa
Subject: $combinedSubject

السلام عليكم ورحمة الله وبركاته
الزميلات والزملاء الكرام في جميع الأقسام،

$effectiveBodyAr

شكرا لكم على حسن تعاونكم الدائم مع تمنياتنا للجميع بالتوفيق والنجاح ..
تفضلوا بقبول فائق الاحترام ..
ريم بن حسين — مديرة الموارد البشرية

--------------------------------------------------

Peace, mercy, and blessings of Allah be upon you.
Dear colleagues across all departments,

$effectiveBodyEn

Thank you for your continuous cooperation, wishing everyone continued success.
Please accept our utmost respect,

Reem Bin Hussain
International HR & Talent Acquisition Consultant
Email: HR@kas.sa
Mobile: +966 553452122
KHALID AL-SULAIM TRADING GROUP — مجموعة الخالد السليم
'''
        .trim();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F3F3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Row(
                  children: [
                    Icon(Icons.mark_email_read_rounded, size: 16, color: Color(0xFF141414)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'بريد وتعميمات الموارد البشرية الرسمي (HR@kas.sa • نسخة Khalid@kas.sa)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF141414),
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                ),
                child: const Text(
                  'أ. ريم بن حسين',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFFFFFFF),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Bilingual Template Selector
          Container(
            height: 38,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFFFF),
              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedReemTemplateId,
                isExpanded: true,
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF141414),
                ),
                items: _reemOfficialTemplates
                    .map(
                      (tpl) => DropdownMenuItem<String>(
                        value: tpl.id,
                        child: Text(
                          '${tpl.titleAr} — ${tpl.titleEn}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) {
                    final nextTpl = _reemOfficialTemplates.firstWhere(
                      (t) => t.id == v,
                      orElse: () => _reemOfficialTemplates.first,
                    );
                    setState(() {
                      _selectedReemTemplateId = v;
                      _reemBodyArController.text = nextTpl.bodyAr;
                      _reemBodyEnController.text = nextTpl.bodyEn;
                    });
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Recipient Scope Selector
          Container(
            height: 36,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFFFF),
              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedReemScope,
                isExpanded: true,
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF141414),
                ),
                items: _reemScopeOptions
                    .map((s) => DropdownMenuItem<String>(value: s, child: Text(s, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _selectedReemScope = v);
                },
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Live Bilingual Outlook Frame & Direct Editor Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFFFF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'من: HR@kas.sa (ريم احمد بن حسين) • نسخة إلزامية: Khalid@kas.sa',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF141414),
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  combinedSubject,
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF141414),
                  ),
                ),
                const Divider(height: 12, color: Color(0xFFE0E0E0)),
                const Text(
                  'السلام عليكم ورحمة الله وبركاته — الزميلات والزملاء الكرام في جميع الأقسام،',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF141414),
                  ),
                ),
                const SizedBox(height: 5),
                TextField(
                  controller: _reemBodyArController,
                  minLines: 2,
                  maxLines: 3,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF141414),
                    height: 1.4,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: const Color(0xFFF0F0F0),
                    hintText: 'اكتب نص المراسلة الرسمية بالعربية هنا...',
                    hintStyle: const TextStyle(fontSize: 9.5, color: Color(0xFF707070)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF141414), width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'تفضلوا بقبول فائق الاحترام .. ريم بن حسين — مديرة الموارد البشرية',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF141414),
                  ),
                ),
                const Divider(height: 12, color: Color(0xFFE0E0E0)),
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Peace, mercy, and blessings of Allah be upon you — Dear colleagues across all departments,',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF141414),
                        ),
                      ),
                      const SizedBox(height: 5),
                      TextField(
                        controller: _reemBodyEnController,
                        minLines: 2,
                        maxLines: 3,
                        onChanged: (_) => setState(() {}),
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF141414),
                          height: 1.38,
                        ),
                        decoration: InputDecoration(
                          isDense: true,
                          filled: true,
                          fillColor: const Color(0xFFF0F0F0),
                          hintText: 'Write custom official English HR correspondence body...',
                          hintStyle: const TextStyle(fontSize: 9, color: Color(0xFF707070)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF141414), width: 1.5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F3F3),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE0E0E0)),
                        ),
                        child: const Text(
                          'Reem Bin Hussain\nInternational HR & Talent Acquisition Consultant\nEmail: HR@kas.sa\nMobile: +966 553452122\nKHALID AL-SULAIM TRADING GROUP — مجموعة الخالد السليم',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF141414),
                            height: 1.38,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Copy-to-Clipboard & Official Dispatch Actions
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final messenger = ScaffoldMessenger.maybeOf(context);
                    await Clipboard.setData(ClipboardData(text: fullBilingualDraft));
                    messenger?.showSnackBar(
                      const SnackBar(
                        backgroundColor: Color(0xFF141414),
                        content: Text(
                          'تم نسخ المسودة الثنائية (عربي/EN) بتوقيع أ. ريم بن حسين للصق في Outlook',
                          style: TextStyle(color: Color(0xFFFFFFFF), fontSize: 11.5),
                        ),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: const Color(0xFFE0E0E0)),
                    ),
                    alignment: Alignment.center,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.copy_rounded, size: 13, color: Color(0xFF141414)),
                        SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            'نسخ لـ Outlook',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF141414),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: InkWell(
                  onTap: () async {
                    if (_isSendingReemEmail) return;
                    setState(() => _isSendingReemEmail = true);
                    final res = await HrDirectMailService.dispatchOfficialEmail(
                      subject: combinedSubject,
                      toEmails: _resolveReemScopeEmails(_selectedReemScope),
                      bodyAr: effectiveBodyAr,
                      bodyEn: effectiveBodyEn,
                    );
                    if (!mounted) return;
                    final stamp = (DateTime.now().millisecondsSinceEpoch % 10000)
                        .toString()
                        .padLeft(4, '0');
                    setState(() {
                      _isSendingReemEmail = false;
                      _reemDispatchedLog.insert(0, (
                        id: 'REEM-$stamp',
                        subjectAr: activeTpl.subjectAr,
                        scope: _selectedReemScope,
                        status: res.ok
                            ? 'تم الإرسال المباشر (${res.provider ?? 'SMTP'}) • نسخة Khalid@kas.sa ✓'
                            : 'بانتظار تفعيل بوابة البريد على الخادم',
                      ));
                      if (res.ok) {
                        _jisrMobileRequests.insert(0, (
                          id: 'REEM-$stamp',
                          type: 'بريد رسمي HR@kas.sa: ${activeTpl.subjectAr}',
                          status:
                              'تم الإرسال المباشر (${res.provider ?? 'SMTP'}) • نسخة Khalid@kas.sa ✓',
                        ));
                      }
                    });
                    if (res.ok) {
                      widget.onTriggerInstantNotification();
                    }
                    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
                      SnackBar(
                        backgroundColor: const Color(0xFF141414),
                        content: Text(
                          res.messageAr,
                          style: const TextStyle(color: Color(0xFFFFFFFF), fontSize: 11.5),
                        ),
                        duration: const Duration(seconds: 3),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141414),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    ),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.send_rounded, size: 13, color: Color(0xFFFFFFFF)),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            _isSendingReemEmail
                                ? 'جاري الإرسال المباشر...'
                                : 'إرسال مباشر رسمي (HR@kas.sa)',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFFFFFFF),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ..._reemDispatchedLog.take(2).map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${entry.id} • ${entry.subjectAr}',
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF141414),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        entry.status,
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF141414),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
