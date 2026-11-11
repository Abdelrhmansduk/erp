import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'data/erp_system_data.dart';
import 'theme/erp_tokens.dart';
import 'widgets/workspace_views.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: ErpTokens.canvasLight,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const AlsulaimErpMobileApp());
}

class ErpNotificationItem {
  final String id;
  final String title;
  final String message;
  final String timestamp;
  final String companyCode;
  final String tabKey;
  final String tabTitle;
  bool read;

  ErpNotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.companyCode,
    this.tabKey = 'dashboard',
    this.tabTitle = 'الرئيسية والمؤشرات التشغيلية',
    this.read = false,
  });
}

class OfflineQueueAction {
  final String id;
  final String actionType;
  final String description;
  final String companyCode;
  final String createdAt;

  const OfflineQueueAction({
    required this.id,
    required this.actionType,
    required this.description,
    required this.companyCode,
    required this.createdAt,
  });
}

class AlsulaimErpMobileApp extends StatelessWidget {
  const AlsulaimErpMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'مجموعة خالد السليم ERP',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: ErpTokens.canvasCream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: ErpTokens.champagneGold,
          primary: ErpTokens.primary,
          secondary: ErpTokens.champagneGold,
          surface: ErpTokens.canvasLight,
        ),
        fontFamily: 'Roboto',
      ),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const ErpMasterFlowHost(),
    );
  }
}

/// Exact 4-Stage Flow Host matching `src/App.tsx` (`landing` -> `login` -> `launcher` -> `workspace`)
class ErpMasterFlowHost extends StatefulWidget {
  const ErpMasterFlowHost({super.key});

  @override
  State<ErpMasterFlowHost> createState() => _ErpMasterFlowHostState();
}

class _ErpMasterFlowHostState extends State<ErpMasterFlowHost> with WidgetsBindingObserver {
  static const MethodChannel _nativeChannel = MethodChannel('sa.alsulaim.erp/native_mobile');
  final GlobalKey<ScaffoldState> _workspaceScaffoldKey = GlobalKey<ScaffoldState>();

  // 1. Flow State (`landing` | `login` | `launcher` | `workspace`)
  String _flowState = 'landing';
  SystemPortalOption _selectedPortal = ErpSystemData.systemPortals.first;
  CorporateDepartment _activeDepartment = ErpSystemData.departments['recruitment']!;
  String _activeTab = 'recruitment-contracts';
  String _activeTabTitle = 'عقود الاستقدام الموثقة (مساند)';
  ErpBranchOption _selectedBranch = ErpSystemData.branches.first;

  // 2. Unified Auth Form State (`LoginPage.tsx`)
  String _authMode = 'signin'; // 'signin' | 'register'
  bool _portalSwitcherExpanded = false;
  String _staffDirectoryCompanyFilter = 'ALL';
  String? _manualSignInDeptOverride;
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _authError;
  String _authenticatedUserName = 'م. سلطان بن خالد السليم';
  String _authenticatedUserRole = 'مدير قسم الاستقدام وتوثيق مساند';

  // 3-Step Registration Wizard State (`LoginPage.tsx`)
  int _regStep = 1; // 1..3
  String _regAccountType = 'employee'; // 'employee' | 'client' | 'agency'
  String _regSelectedDepartmentId = 'recruitment';
  final TextEditingController _regFullNameController = TextEditingController();
  final TextEditingController _regNationalIdController = TextEditingController();
  final TextEditingController _regPhoneController = TextEditingController();
  final TextEditingController _regEmailController = TextEditingController();
  final TextEditingController _regPasswordController = TextEditingController();
  String? _regReferenceNumber;

  // 4. AppLauncher & Sidebar State
  String _launcherCategory = 'all';
  String _launcherSearch = '';
  String _sidebarSearch = '';
  final Map<String, bool> _expandedSidebarGroups = {
    'finance-section': true,
    'operations-section': true,
    'crm-section': true,
    'hr-section': true,
    'governance-section': true,
  };

  // 5. Native Mobile Notifications, Background Execution & Offline Queue
  bool _bgServiceRunning = true;
  bool _wakeLockEnabled = false;
  bool _simulatedOfflineMode = false;
  int _heartbeatCount = 1;
  String _lastSyncTime = 'الآن';
  Timer? _uiPoller;

  late List<ErpOperationalRecord> _allRecords;
  final List<ErpNotificationItem> _notifications = [];
  final List<OfflineQueueAction> _offlineQueue = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _allRecords = List<ErpOperationalRecord>.from(ErpSystemData.buildInitialRecords());
    _applyPortalDefaults(_selectedPortal);
    _seedInitialNotifications(_selectedPortal);
    _initializeNativeMobileEngine();

    _uiPoller = Timer.periodic(const Duration(seconds: 6), (_) {
      _refreshBackgroundStatus();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _uiPoller?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    _regFullNameController.dispose();
    _regNationalIdController.dispose();
    _regPhoneController.dispose();
    _regEmailController.dispose();
    _regPasswordController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshBackgroundStatus();
      if (!_simulatedOfflineMode && _offlineQueue.isNotEmpty) {
        _flushOfflineQueue(reason: 'استعادة التطبيق من الخلفية');
      }
    }
  }

  void _applyPortalDefaults(SystemPortalOption portal) {
    _emailController.text = portal.demoEmail;
    _passwordController.text = '';
    _activeDepartment = ErpSystemData.departments[portal.defaultDepartmentId] ??
        ErpSystemData.departments['recruitment']!;
    _regSelectedDepartmentId = _activeDepartment.id;
    _authError = null;
  }

  void _seedInitialNotifications(SystemPortalOption portal) {
    final co = portal.companyId == 'all' ? 'GRP' : portal.companyId;
    _notifications
      ..clear()
      ..addAll([
        ErpNotificationItem(
          id: 'NTF-101',
          title: 'توثيق عقد استقدام مساند #MSN-8841',
          message: 'تم ربط وتوثيق العقد إلكترونياً وتفعيل ضمان الـ 90 يوماً في [$co].',
          timestamp: 'منذ دقيقتين',
          companyCode: co,
          tabKey: _activeDepartment.defaultTab,
          tabTitle: _activeDepartment.defaultTabTitle,
        ),
        ErpNotificationItem(
          id: 'NTF-102',
          title: 'اعتماد فاتورة ZATCA المرحلة الثانية (نظام سماك)',
          message: 'تم التوقيع التشفيري ECDSA وترحيل القيد المزدوج للأستاذ العام بنجاح.',
          timestamp: 'منذ 10 دقائق',
          companyCode: co,
          tabKey: 'smacc-accounting',
          tabTitle: '١. الأستاذ العام وشجرة الحسابات (SMACC GL)',
        ),
      ]);
  }

  Future<void> _initializeNativeMobileEngine() async {
    try {
      await _nativeChannel.invokeMethod('requestNotificationPermission');
      await _nativeChannel.invokeMethod('startBackgroundService', {
        'companyName': _selectedPortal.nameAr,
      });
      await _refreshBackgroundStatus();
    } catch (_) {
      // Safe fallback in widget tests
    }
  }

  Future<void> _refreshBackgroundStatus() async {
    try {
      final res = await _nativeChannel.invokeMethod<Map<dynamic, dynamic>>('getBackgroundServiceStatus');
      if (res != null && mounted) {
        setState(() {
          _bgServiceRunning = (res['isRunning'] as bool?) ?? _bgServiceRunning;
          final hb = (res['heartbeatCount'] as int?) ?? _heartbeatCount;
          if (hb > 0) _heartbeatCount = hb;
          final ts = (res['lastSyncTimestamp'] as String?) ?? '';
          if (ts.isNotEmpty) _lastSyncTime = ts;
        });
      }
    } catch (_) {}
  }

  Future<void> _triggerInstantNativeNotification({
    String? customTitle,
    String? customBody,
    String tabKey = 'dashboard',
    String tabTitle = 'الرئيسية والمؤشرات التشغيلية',
  }) async {
    final co = _selectedPortal.companyId == 'all' ? 'GRP' : _selectedPortal.companyId;
    final title = customTitle ?? 'تنبيه فوري — ${_selectedPortal.nameAr}';
    final body = customBody ??
        'تم تنفيذ العملية بنجاح وتحديث السجلات السحابية لقسم [${_activeDepartment.shortNameAr}] في [$co].';

    setState(() {
      _notifications.insert(
        0,
        ErpNotificationItem(
          id: 'NTF-${DateTime.now().millisecondsSinceEpoch}',
          title: title,
          message: body,
          timestamp: 'الآن',
          companyCode: co,
          tabKey: tabKey,
          tabTitle: tabTitle,
        ),
      );
    });

    try {
      await _nativeChannel.invokeMethod('showSystemNotification', {
        'title': title,
        'body': body,
        'companyName': _selectedPortal.nameAr,
      });
    } catch (_) {}

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: ErpTokens.primary,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        content: Text('🔔 $title', style: const TextStyle(color: Colors.white, fontSize: 12.5)),
      ),
    );
  }

  Future<void> _scheduleBackgroundNotification5s() async {
    final co = _selectedPortal.companyId == 'all' ? 'GRP' : _selectedPortal.companyId;
    final title = 'إشعار خلفي مجدول — ${_selectedPortal.nameAr}';
    final body = 'تم تنفيذ المزامنة الخلفية لقسم [${_activeDepartment.shortNameAr}] في [$co] حتى مع إغلاق الشاشة.';

    try {
      await _nativeChannel.invokeMethod('scheduleBackgroundNotification', {
        'delayMs': 5000,
        'title': title,
        'body': body,
        'companyName': _selectedPortal.nameAr,
      });
    } catch (_) {}

    Future.delayed(const Duration(seconds: 5), () {
      if (!mounted) return;
      setState(() {
        _notifications.insert(
          0,
          ErpNotificationItem(
            id: 'NTF-BG-${DateTime.now().millisecondsSinceEpoch}',
            title: title,
            message: body,
            timestamp: 'الآن (خلفي)',
            companyCode: co,
          ),
        );
      });
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: ErpTokens.charcoalDark,
        behavior: SnackBarBehavior.floating,
        content: Text(
          '⏳ تم جدولة إشعار بعد 5 ثوانٍ — يمكنك قفل الشاشة أو الخروج للتحقق من وصوله!',
          style: TextStyle(color: Colors.white, fontSize: 12),
        ),
      ),
    );
  }

  Future<void> _flushOfflineQueue({required String reason}) async {
    if (_offlineQueue.isEmpty) return;
    final count = _offlineQueue.length;
    setState(() {
      _offlineQueue.clear();
      _heartbeatCount += 1;
      _lastSyncTime = 'الآن';
    });
    await _triggerInstantNativeNotification(
      customTitle: 'اكتملت مزامنة طابور الأوفلاين ($count عمليات)',
      customBody: 'تم ترحيل العمليات المعلقة ($reason) للكيان [${_selectedPortal.companyId}].',
    );
  }

  int get _unreadCount => _notifications.where((n) => !n.read).length;

  List<ErpOperationalRecord> get _scopedRecords {
    final co = _selectedPortal.companyId;
    if (co == 'all') return _allRecords;
    final matching = _allRecords.where((r) => r.companyId == co).toList();
    return matching.isNotEmpty ? matching : _allRecords.take(3).toList();
  }

  // Navigation & Unified Portal + Department Isolation Handlers
  void _navigateToCompanyLogin(String rawCode) {
    final resolved = ErpSystemData.resolvePortalByCode(rawCode);
    setState(() {
      _selectedPortal = resolved;
      _applyPortalDefaults(resolved);
      _flowState = 'login';
      _authMode = 'signin';
      _portalSwitcherExpanded = false;
    });
  }

  void _handleQuickStaffLogin(StaffDirectoryAccount staff) {
    final resolvedPortal = ErpSystemData.resolvePortalByCode(staff.companyId);
    final resolvedDept =
        ErpSystemData.departments[staff.departmentId] ?? ErpSystemData.departments['recruitment']!;
    setState(() {
      _emailController.text = staff.email;
      _passwordController.text = '';
      _authError = null;
      _selectedPortal = resolvedPortal;
      _activeDepartment = resolvedDept;
      _authenticatedUserName = staff.fullName;
      _authenticatedUserRole = staff.role;
      _activeTab = staff.defaultTab ?? resolvedDept.defaultTab;
      _activeTabTitle = staff.defaultTabTitle ?? resolvedDept.defaultTabTitle;
      _seedInitialNotifications(resolvedPortal);
      _flowState = 'workspace';
    });
    _initializeNativeMobileEngine();
  }

  void _handleSignIn() {
    final identifier = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (identifier.isEmpty) {
      setState(() => _authError = 'يرجى إدخال البريد الإلكتروني المؤسسي (@kas.sa) أو اسم المستخدم.');
      return;
    }
    final whitelistErr = ErpSystemData.validateCorporateEmail(identifier);
    if (whitelistErr != null) {
      setState(() => _authError = whitelistErr);
      return;
    }
    if (password.length < 4) {
      setState(() => _authError = 'يرجى إدخال كلمة المرور المعتمدة.');
      return;
    }

    // Unified Corporate Login Resolution: Auto-detects Company + Department from Employee Account
    final resolved = ErpSystemData.resolveUnifiedCredentials(
      identifier,
      fallbackCompanyCode: _selectedPortal.companyId,
      fallbackDepartmentId: _manualSignInDeptOverride,
    );

    setState(() {
      _authError = null;
      _selectedPortal = resolved.portal;
      _activeDepartment = resolved.department;
      _authenticatedUserName =
          resolved.staffAccount?.fullName ?? resolved.portal.demoEmployeeName;
      _authenticatedUserRole =
          resolved.staffAccount?.role ?? '${resolved.department.nameAr} — ${resolved.portal.nameAr}';
      _activeTab = resolved.staffAccount?.defaultTab ?? resolved.department.defaultTab;
      _activeTabTitle =
          resolved.staffAccount?.defaultTabTitle ?? resolved.department.defaultTabTitle;
      _seedInitialNotifications(resolved.portal);
      _flowState = 'workspace';
    });

    _initializeNativeMobileEngine();
  }

  void _handleSelectTab(String href, String title) {
    if (href == 'logout') {
      _handleLogout();
      return;
    }
    if (href == 'profile') {
      _openEmployeeProfileModal();
      return;
    }

    // Strict Department + Company Isolation Guard (`isTabAuthorized`)
    final authorized = ErpSystemData.isTabAuthorized(
      departmentId: _activeDepartment.id,
      companyId: _selectedPortal.companyId,
      tabHref: href,
    );
    if (!authorized) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: ErpTokens.statusDanger,
          behavior: SnackBarBehavior.floating,
          content: Text(
            '🔒 عذراً، حسابك مقيد بـ (${_activeDepartment.nameAr}) في (${_selectedPortal.nameAr}) فقط ولا يملك صلاحية الدخول لهذا القسم.',
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
      );
      return;
    }

    setState(() {
      _activeTab = href;
      _activeTabTitle = title.isNotEmpty ? title : href;
      _flowState = 'workspace';
    });
  }

  void _handleLogout() {
    setState(() {
      _flowState = 'login';
      _authError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    switch (_flowState) {
      case 'landing':
        return _buildLandingPageReplica();
      case 'login':
        return _buildLoginPageReplica();
      case 'launcher':
        return _buildAppLauncherPageReplica();
      case 'workspace':
      default:
        return _buildWorkspaceAppShellReplica();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: LANDING PAGE REPLICA (`src/pages/LandingPage.tsx`)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildLandingPageReplica() {
    return Scaffold(
      backgroundColor: ErpTokens.canvasLight,
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.8),
            radius: 1.4,
            colors: [
              ErpTokens.canvasCream,
              ErpTokens.canvasLight,
              Color(0xFFF4F6F9),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Sticky Luxury White Frosted Top Header (`LandingPage.tsx` lines 156-223)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.94),
                  border: const Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.65)),
                          ),
                          child: ClipOval(
                            child: Image.asset(
                              'assets/logo.png',
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Icon(Icons.apartment_rounded, size: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'مجموعة خالد السليم',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: ErpTokens.ink,
                              ),
                            ),
                            Text(
                              'KHALID AL-SULAIM GROUP • ERP',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF71717A),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        InkWell(
                          onTap: () => _navigateToCompanyLogin('admin'),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              border: Border.all(color: ErpTokens.hairlineLight),
                            ),
                            child: const Text(
                              'الإدارة المركزية',
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: ErpTokens.ink),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () => _navigateToCompanyLogin('saf'),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: ErpTokens.primary,
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.login_rounded, size: 13, color: Colors.white),
                                SizedBox(width: 4),
                                Text(
                                  'بوابات الشركات',
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white),
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

              // 2. Scrollable Landing Body (`Hero` + `Faris & Noura` + `Companies Grid`)
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                  children: [
                    // Eyebrow Badge (`LandingPage.tsx`)
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: ErpTokens.pillTagMint(
                        'منظومة أعمال مؤسسية متكاملة • KHALID AL-SULAIM GROUP',
                        icon: Icons.verified_user_rounded,
                        fontSize: 10.5,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Official Flag Slogan (`LandingPage.tsx`)
                    const Text(
                      'نستثمر في الفرص..',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: ErpTokens.ink,
                        height: 1.15,
                      ),
                    ),
                    const Text(
                      'نصنع المستقبل.',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: ErpTokens.goldDark,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'بوابة الحوكمة والتشغيل المؤسسي لمجموعة خالد السليم: تنوع في القطاعات، قوة في التنفيذ، واستدامة في النمو. بوابة نفاذ موحدة توجه كل موظف تلقائياً إلى قسمه المخصص داخل شركته مع نظام سماك المحاسبي (SMACC) بـ 6 تقسيمات قياسية.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF52525B),
                        height: 1.55,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Primary & Secondary CTA Pills
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _navigateToCompanyLogin('saf'),
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              decoration: BoxDecoration(
                                color: ErpTokens.primary,
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.login_rounded, size: 16, color: ErpTokens.goldLight),
                                  SizedBox(width: 6),
                                  Text(
                                    '🏛️ بوابة النفاذ الموحدة للأقسام والشركات',
                                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Colors.white),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () => _navigateToCompanyLogin('admin'),
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              border: Border.all(color: ErpTokens.hairlineLight),
                            ),
                            child: const Text(
                              '🛡️ الإدارة العليا',
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Compliance & Vision 2030 Badges
                    Wrap(
                      spacing: 10,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: const [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified_user_rounded, size: 14, color: Color(0xFF059669)),
                            SizedBox(width: 4),
                            Text('الفوترة المشفرة ZATCA المرحلة الثانية', style: TextStyle(fontSize: 11, color: Color(0xFF3F3F46), fontWeight: FontWeight.w600)),
                          ],
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF0284C7)),
                            SizedBox(width: 4),
                            Text('منصة مساند و HRSD', style: TextStyle(fontSize: 11, color: Color(0xFF3F3F46), fontWeight: FontWeight.w600)),
                          ],
                        ),
                        Text('• 🇸🇦 رؤية المملكة 2030', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.ink)),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Institutional Corporate Governance & SMACC 6-Division Panel (Replaces AI Mascot Card)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: ErpTokens.cardPricingDecoration(
                        borderColor: ErpTokens.champagneGold.withValues(alpha: 0.55),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Text('🏛️', style: TextStyle(fontSize: 16)),
                                  SizedBox(width: 6),
                                  Text(
                                    'بوابة الحوكمة والتشغيل المؤسسي الموحدة',
                                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                                  ),
                                ],
                              ),
                              ErpTokens.pillTagMint('عزل الأقسام 100%', fontSize: 9.5),
                            ],
                          ),
                          const Divider(height: 18, color: ErpTokens.hairlineLight),
                          const Text(
                            'نظام دخول موحد يوجه كل موظف تلقائياً إلى قسمه المخصص في شركته فقط، مع هيكلة المحاسبة وجميع الأقسام وفق تقسيمات نظام سماك (SMACC) المعتمدة:',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF3F3F46), height: 1.45),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: const [
                              _InstitutionalPillBadge(emoji: '📊', label: '١. الأستاذ العام وقيود اليومية'),
                              _InstitutionalPillBadge(emoji: '🏦', label: '٢. النقدية والبنوك والسندات'),
                              _InstitutionalPillBadge(emoji: '🧾', label: '٣. العملاء والفوترة ZATCA'),
                              _InstitutionalPillBadge(emoji: '📑', label: '٤. الموردين والوكلاء والصرف'),
                              _InstitutionalPillBadge(emoji: '🏗️', label: '٥. مراكز التكلفة والأصول'),
                              _InstitutionalPillBadge(emoji: '📈', label: '٦. القوائم وميزان المراجعة'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Section Title: الشركات التابعة للمجموعة (`LandingPage.tsx` `#companies`)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'الشركات التابعة للمجموعة (بوابات وأقسام معزولة)',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'يدخل كل موظف إلى قسمه المخصص داخل شركته فقط (Strict Department RLS)',
                                style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        ErpTokens.pillTagMint('5 شركات • 9 أقسام', fontSize: 10.5),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 5 Main Subsidiary Company Cards (`SAF`, `YAQ`, `TOP`, `KAS`, `DAR`)
                    ...ErpSystemData.mainSubsidiaryCompanies.map((comp) => _buildLandingCompanyCard(comp)),

                    const SizedBox(height: 20),
                    const Text(
                      'بوابات الأقسام المتخصصة والإدارة المركزية',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 10),
                    ...ErpSystemData.systemPortals
                        .where((p) => p.category != 'شركات المجموعة')
                        .map((portal) => _buildDigitalPortalCompactRow(portal)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLandingCompanyCard(SystemPortalOption comp) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: ErpTokens.surfaceSubtle,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpTokens.hairlineLight),
                ),
                child: Image.asset(
                  comp.assetLogo,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => Icon(comp.icon, color: comp.themeColor),
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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${comp.emoji} ${comp.companyCodeBadge}',
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: ErpTokens.goldLight,
                            ),
                          ),
                        ),
                        ErpTokens.pillTagMint(comp.stats, fontSize: 9.5),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      comp.nameAr,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    Text(
                      comp.nameEn,
                      style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            comp.desc,
            style: const TextStyle(fontSize: 11.5, color: Color(0xFF52525B), height: 1.45),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  comp.license,
                  style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF71717A)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => _navigateToCompanyLogin(comp.key),
                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: ErpTokens.primary,
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${comp.emoji} دخول بوابة الشركة والأقسام',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_back_rounded, size: 13, color: ErpTokens.goldLight),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDigitalPortalCompactRow(SystemPortalOption portal) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: ErpTokens.cardPricingDecoration(),
      child: ListTile(
        onTap: () => _navigateToCompanyLogin(portal.key),
        leading: Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: ErpTokens.goldPale,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(portal.emoji, style: const TextStyle(fontSize: 18)),
        ),
        title: Text(
          portal.nameAr,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
        ),
        subtitle: Text(
          '${portal.license} • ${portal.routePath}',
          style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
        ),
        trailing: const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: ErpTokens.ink),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: UNIFIED CORPORATE LOGIN PORTAL (`src/pages/LoginPage.tsx`)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildLoginPageReplica() {
    final portal = _selectedPortal;
    return Scaffold(
      backgroundColor: ErpTokens.loginAuthSurface,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // 1. Mobile Top Bar (`LoginPage.tsx`)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => setState(() => _flowState = 'landing'),
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: ErpTokens.primary,
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.home_rounded, size: 14, color: ErpTokens.goldLight),
                          SizedBox(width: 5),
                          Text(
                            'الرئيسية',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('🇸🇦', style: TextStyle(fontSize: 11)),
                        SizedBox(width: 5),
                        Text(
                          'بوابة موحدة • مساند • ZATCA • سماك',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF065F46)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 2. Unified Authentication Card & 1-Click Staff Directory
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Unified Corporate Identity Header Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.55), width: 1.5),
                      boxShadow: ErpTokens.elevation3Shadow,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: ErpTokens.surfaceSubtle,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: ErpTokens.hairlineLight),
                              ),
                              child: Image.asset(
                                portal.assetLogo,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => Icon(portal.icon, color: ErpTokens.ink),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: ErpTokens.primary,
                                          borderRadius: BorderRadius.circular(5),
                                        ),
                                        child: Text(
                                          '🏛️ بوابة النفاذ الموحدة (${portal.companyId == 'all' ? 'GRP' : portal.companyId})',
                                          style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: ErpTokens.goldLight),
                                        ),
                                      ),
                                      Text(
                                        '@${portal.emailDomain}',
                                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: ErpTokens.goldDark),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  const Text(
                                    'بوابة تسجيل الدخول المؤسسي الموحدة للأقسام',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                                  ),
                                  const Text(
                                    'يدخل أي موظف تلقائياً إلى قسمه المخصص في شركته فقط',
                                    style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                                  ),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(() => _portalSwitcherExpanded = !_portalSwitcherExpanded),
                              child: Text(
                                _portalSwitcherExpanded ? 'إخفاء' : 'الشركات',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.goldDark),
                              ),
                            ),
                          ],
                        ),
                        if (_portalSwitcherExpanded) ...[
                          const Divider(height: 16, color: ErpTokens.hairlineLight),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: ErpSystemData.systemPortals.map((p) {
                              final selected = p.id == portal.id;
                              return ChoiceChip(
                                label: Text('${p.emoji} ${p.nameAr}', style: const TextStyle(fontSize: 10.5)),
                                selected: selected,
                                selectedColor: ErpTokens.primary,
                                labelStyle: TextStyle(
                                  color: selected ? Colors.white : ErpTokens.ink,
                                  fontWeight: FontWeight.w700,
                                ),
                                onSelected: (_) => _navigateToCompanyLogin(p.key),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Mode Switcher Tabs (`تسجيل الدخول الموحد` vs `إنشاء حساب موظف/عميل`)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE4E4E7).withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _authMode = 'signin'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _authMode == 'signin' ? ErpTokens.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '🔐 دخول موحد للقسم والشركة',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: _authMode == 'signin' ? Colors.white : ErpTokens.ink,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _authMode = 'register'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _authMode == 'register' ? ErpTokens.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '📝 تسجيل حساب قسم جديد',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  color: _authMode == 'register' ? Colors.white : ErpTokens.ink,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  if (_authError != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: ErpTokens.statusDangerBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: ErpTokens.statusDangerBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: ErpTokens.statusDanger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _authError!,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: ErpTokens.statusDanger),
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (_authMode == 'signin')
                    _buildSignInFormCard(portal)
                  else
                    _buildRegistrationWizardCard(portal),
                ],
              ),
            ),

            // 3. Sovereign KAFD Architectural Hero & Telemetry (`LEFT SECTION` in `LoginPage.tsx`)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: ErpTokens.kafdHeroBg,
                image: DecorationImage(
                  image: const AssetImage('assets/login-hero-pro.jpg'),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    ErpTokens.kafdHeroBg.withValues(alpha: 0.85),
                    BlendMode.darken,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: ErpTokens.champagneGold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.4)),
                    ),
                    child: const Text(
                      '🏛️ بوابة النفاذ المؤسسي الموحدة • عزل الأقسام والشركات',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ErpTokens.goldLight),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'مجموعة خالد السليم القابضة',
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${portal.emoji} ${portal.nameAr} — ${portal.sectorTagAr}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: ErpTokens.goldLight),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'تسجيل دخول موحد يكتشف تلقائياً شركة الموظف وقسمه الإداري (سماك المحاسبي، الاستقدام، التأجير، الفرز ATS، الموارد البشرية، المنافسات، أو الإيواء) ويحصر صلاحياته داخل قسمه فقط.',
                    style: TextStyle(fontSize: 11.5, color: Color(0xFFCBD5E1), height: 1.45),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: ErpTokens.charcoalDark.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            Text('📊 نظام سماك SMACC', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                            Text('6 تقسيمات محاسبية', style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                          ],
                        ),
                        Column(
                          children: [
                            Text('🔐 عزل الأقسام RLS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                            Text('9 أقسام • 5 شركات', style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                          ],
                        ),
                        Column(
                          children: [
                            Text('🧾 ZATCA & مساند', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                            Text('ربط حكومي 100%', style: TextStyle(fontSize: 9.5, color: Color(0xFF94A3B8))),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignInFormCard(SystemPortalOption portal) {
    final liveResolved = ErpSystemData.resolveUnifiedCredentials(
      _emailController.text,
      fallbackCompanyCode: portal.companyId,
      fallbackDepartmentId: _manualSignInDeptOverride,
    );

    final filteredStaff = ErpSystemData.staffDirectory.where((s) {
      if (_staffDirectoryCompanyFilter == 'ALL') return true;
      return s.companyId == _staffDirectoryCompanyFilter;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Interactive Company + Department Quick Selector (Matches Web `LoginPage.tsx`)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ErpTokens.canvasCream,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpTokens.hairlineLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '🏛️ ١. اختيار الشركة مباشرة (أو يتم التعرف عليها تلقائياً):',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          const MapEntry('SAF', '💎 السفير SAF'),
                          const MapEntry('YAQ', '🏢 ياقوت YAQ'),
                          const MapEntry('TOP', '🗂️ توب تالنت TOP'),
                          const MapEntry('KAS', '⚖️ كاس KAS'),
                          const MapEntry('DAR', '🏨 دار الرواد DAR'),
                          const MapEntry('all', '🛡️ الإدارة العليا'),
                        ].map((co) {
                          final active = portal.companyId == co.key;
                          return Padding(
                            padding: const EdgeInsetsDirectional.only(end: 6),
                            child: ChoiceChip(
                              label: Text(co.value),
                              selected: active,
                              selectedColor: ErpTokens.primary,
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: active ? ErpTokens.goldLight : ErpTokens.ink,
                              ),
                              onSelected: (_) {
                                final nextPortal = ErpSystemData.resolvePortalByCode(co.key);
                                final matchStaff = ErpSystemData.staffDirectory.firstWhere(
                                  (s) =>
                                      s.companyId == co.key &&
                                      (_manualSignInDeptOverride == null ||
                                          s.departmentId == _manualSignInDeptOverride),
                                  orElse: () => ErpSystemData.staffDirectory.firstWhere(
                                    (s) => s.companyId == co.key,
                                    orElse: () => ErpSystemData.staffDirectory.first,
                                  ),
                                );
                                setState(() {
                                  _selectedPortal = nextPortal;
                                  _emailController.text = matchStaff.email;
                                  _passwordController.text = '';
                                  _authError = null;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '🗂️ ٢. اختيار القسم المختص للموظف (عزل صلاحي كامل للقسم):',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ErpSystemData.departments.values.map((dept) {
                          final active = liveResolved.department.id == dept.id;
                          return Padding(
                            padding: const EdgeInsetsDirectional.only(end: 6),
                            child: ChoiceChip(
                              label: Text('${dept.emoji} ${dept.shortNameAr}'),
                              selected: active,
                              selectedColor: ErpTokens.primary,
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: active ? ErpTokens.goldLight : ErpTokens.ink,
                              ),
                              onSelected: (_) {
                                final matchStaff = ErpSystemData.staffDirectory.where(
                                  (s) =>
                                      s.companyId == portal.companyId &&
                                      s.departmentId == dept.id,
                                );
                                setState(() {
                                  _manualSignInDeptOverride = dept.id;
                                  if (matchStaff.isNotEmpty) {
                                    _emailController.text = matchStaff.first.email;
                                  } else {
                                    _emailController.text = '${dept.id}@${portal.emailDomain}';
                                  }
                                  _passwordController.text = '';
                                  _authError = null;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              const Text(
                'البريد الإلكتروني المؤسسي أو اسم المستخدم للقسم',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _emailController,
                onChanged: (_) => setState(() {
                  _manualSignInDeptOverride = null;
                }),
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(fontSize: 13.5, color: ErpTokens.ink, fontWeight: FontWeight.w700),
                decoration: InputDecoration(
                  hintText: 'khalid@kas.sa أو a.alkinani.acc@kas.sa',
                  prefixIcon: const Icon(Icons.alternate_email_rounded, size: 18, color: Color(0xFF71717A)),
                  filled: true,
                  fillColor: ErpTokens.surfaceSubtle,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Live Auto-Detected Company & Locked Department Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ErpTokens.goldPale.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.55)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(liveResolved.department.emoji, style: const TextStyle(fontSize: 15)),
                            const SizedBox(width: 6),
                            const Text(
                              'التوجيه التلقائي للقسم والشركة:',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                            ),
                          ],
                        ),
                        ErpTokens.pillTagMint('عزل القسم مفعل', fontSize: 9.5),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'الشركة: ${liveResolved.portal.emoji} ${liveResolved.portal.nameAr}',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'القسم المخصص: ${liveResolved.department.emoji} ${liveResolved.department.nameAr}',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                    ),
                    if (liveResolved.staffAccount != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'الموظف: ${liveResolved.staffAccount!.fullName} (${liveResolved.staffAccount!.role})',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF52525B)),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              const Text(
                'كلمة المرور المشفرة',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                style: const TextStyle(fontSize: 13.5, color: ErpTokens.ink),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 18, color: Color(0xFF71717A)),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      size: 18,
                      color: const Color(0xFF71717A),
                    ),
                  ),
                  filled: true,
                  fillColor: ErpTokens.surfaceSubtle,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Primary Sign In Button (`.btn-odoo-primary` pure `#000000` pill)
              ElevatedButton.icon(
                onPressed: _handleSignIn,
                style: ElevatedButton.styleFrom(
                  backgroundColor: ErpTokens.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                  ),
                ),
                icon: const Icon(Icons.login_rounded, size: 18, color: ErpTokens.goldLight),
                label: Text(
                  '${liveResolved.department.emoji} دخول مباشر إلى ${liveResolved.department.shortNameAr}',
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 10),

              // Biometric Auth & Quick Demo Fill Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        if (_emailController.text.trim().isEmpty) {
                          _applyPortalDefaults(portal);
                        }
                        _handleSignIn();
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ErpTokens.ink,
                        side: const BorderSide(color: ErpTokens.hairlineLight),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        ),
                      ),
                      icon: const Icon(Icons.fingerprint_rounded, size: 18, color: ErpTokens.goldDark),
                      label: const Text(
                        'الدخول بالبصمة البيومترية',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () => setState(() => _applyPortalDefaults(portal)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ErpTokens.goldDark,
                      side: BorderSide(color: ErpTokens.champagneGold.withValues(alpha: 0.5)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                    ),
                    child: const Text(
                      'تعبئة تلقائية',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Interactive 1-Click Corporate Department Staff Directory (28 Department-Scoped Accounts)
        Container(
          padding: const EdgeInsets.all(15),
          decoration: ErpTokens.cardPricingDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      '🏛️ دليل حسابات أقسام وشركات المجموعة (دخول مباشر للقسم)',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                    ),
                  ),
                  ErpTokens.pillTagMint('${filteredStaff.length} حساب قسم', fontSize: 9.5),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'اضغط على أي موظف للدخول الفوري إلى قسمه المخصص في شركته فقط (مع عزل باقي الأقسام):',
                style: TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    MapEntry('ALL', 'جميع الشركات (${ErpSystemData.staffDirectory.length})'),
                    const MapEntry('SAF', '💎 السفير SAF'),
                    const MapEntry('YAQ', '🏢 ياقوت YAQ'),
                    const MapEntry('TOP', '🗂️ توباز TOP'),
                    const MapEntry('KAS', '⚖️ كاس KAS'),
                    const MapEntry('DAR', '🏨 دار الرواد DAR'),
                    const MapEntry('all', '🛡️ الإدارة العليا'),
                  ].map((filter) {
                    final selected = _staffDirectoryCompanyFilter == filter.key;
                    return Padding(
                      padding: const EdgeInsetsDirectional.only(end: 6),
                      child: ChoiceChip(
                        label: Text(filter.value),
                        selected: selected,
                        onSelected: (_) => setState(() => _staffDirectoryCompanyFilter = filter.key),
                        selectedColor: ErpTokens.primary,
                        backgroundColor: ErpTokens.surfaceSubtle,
                        labelStyle: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: selected ? Colors.white : ErpTokens.ink,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 10),
              ...filteredStaff.map((staff) {
                final dept = ErpSystemData.departments[staff.departmentId] ??
                    ErpSystemData.departments['recruitment']!;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: ErpTokens.surfaceSubtle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: ErpTokens.hairlineLight),
                  ),
                  child: InkWell(
                    onTap: () => _handleQuickStaffLogin(staff),
                    borderRadius: BorderRadius.circular(10),
                    child: Row(
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF1D2428), Color(0xFF273036)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(13),
                                border: Border.all(color: ErpTokens.champagneGold, width: 1.5),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x1F000000),
                                    blurRadius: 6,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Icon(
                                staff.departmentId == 'executive'
                                    ? Icons.workspace_premium_rounded
                                    : staff.departmentId == 'finance'
                                        ? Icons.account_balance_wallet_rounded
                                        : staff.departmentId == 'tenders'
                                            ? Icons.engineering_rounded
                                            : staff.departmentId == 'shelter'
                                                ? Icons.health_and_safety_rounded
                                                : Icons.person_pin_rounded,
                                size: 22,
                                color: ErpTokens.goldLight,
                              ),
                            ),
                            Positioned(
                              bottom: -2,
                              right: -2,
                              child: Container(
                                width: 13,
                                height: 13,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: ErpTokens.goldPale,
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: Text(
                                      '${staff.companyId == 'all' ? 'GRP' : staff.companyId} • ${dept.shortNameAr}',
                                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      staff.fullName,
                                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                staff.role,
                                style: const TextStyle(fontSize: 10.5, color: Color(0xFF52525B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '${staff.email}  •  @${staff.username}',
                                style: const TextStyle(fontSize: 9.8, fontWeight: FontWeight.w700, color: Color(0xFF71717A)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          ),
                          child: const Text(
                            'دخول للقسم ←',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ],
    );
  }

  /// 3-Step Department Account Registration Wizard (`LoginPage.tsx`)
  Widget _buildRegistrationWizardCard(SystemPortalOption portal) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: ErpTokens.cardPricingDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'معالج تسجيل حساب قسم جديد — خطوة $_regStep من 3',
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
              ),
              ErpTokens.pillTagMint(portal.companyId == 'all' ? 'GRP' : portal.companyId, fontSize: 10),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: LinearProgressIndicator(
              value: _regStep / 3.0,
              minHeight: 5,
              backgroundColor: const Color(0xFFF4F4F5),
              valueColor: const AlwaysStoppedAnimation<Color>(ErpTokens.champagneGold),
            ),
          ),
          const SizedBox(height: 14),
          if (_regStep == 1) ...[
            const Text('١. اختر نوع الحساب والقسم الإداري المخصص:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...[
              const MapEntry('employee', '🏛️ حساب موظف قسم مختص (يدخل لقسمه فقط)'),
              const MapEntry('client', '🤝 حساب عميل / مستفيد (متابعة العقود والضمان)'),
              const MapEntry('agency', '📑 حساب وكالة خارجية / مورد دولي'),
            ].map((item) {
              final active = _regAccountType == item.key;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  onTap: () => setState(() => _regAccountType = item.key),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: active ? ErpTokens.primary : ErpTokens.hairlineLight, width: active ? 1.5 : 1),
                  ),
                  tileColor: active ? ErpTokens.goldPale.withValues(alpha: 0.45) : ErpTokens.surfaceSubtle,
                  leading: Icon(
                    active ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                    color: active ? ErpTokens.primary : const Color(0xFF71717A),
                  ),
                  title: Text(item.value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                ),
              );
            }),
            const SizedBox(height: 6),
            const Text('القسم الإداري المعزول للموظف:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: ErpSystemData.departments.values.map((dept) {
                final selected = _regSelectedDepartmentId == dept.id;
                return ChoiceChip(
                  label: Text('${dept.emoji} ${dept.shortNameAr}'),
                  selected: selected,
                  selectedColor: ErpTokens.primary,
                  labelStyle: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : ErpTokens.ink,
                  ),
                  onSelected: (_) => setState(() => _regSelectedDepartmentId = dept.id),
                );
              }).toList(),
            ),
          ] else if (_regStep == 2) ...[
            TextField(
              controller: _regFullNameController,
              decoration: const InputDecoration(
                labelText: 'الاسم الرباعي الكامل للموظف',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _regNationalIdController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'رقم الهوية الوطنية / الإقامة (10 أرقام)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _regPhoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'رقم الجوال الموثق (05XXXXXXXX)',
                border: OutlineInputBorder(),
              ),
            ),
          ] else ...[
            TextField(
              controller: _regEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'البريد الإلكتروني المؤسسي (@${portal.emailDomain})',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _regPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'كلمة المرور المشفرة',
                border: OutlineInputBorder(),
              ),
            ),
            if (_regReferenceNumber != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ErpTokens.statusSuccessBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpTokens.statusSuccessBorder),
                ),
                child: Text(
                  '✅ تم إصدار الهوية الرقمية للقسم بنجاح! الرقم المرجعي: $_regReferenceNumber',
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                ),
              ),
            ],
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              if (_regStep > 1)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _regStep -= 1),
                    child: const Text('السابق'),
                  ),
                ),
              if (_regStep > 1) const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ErpTokens.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ErpTokens.radiusPill)),
                  ),
                  onPressed: () {
                    if (_regStep < 3) {
                      setState(() => _regStep += 1);
                    } else {
                      final ref = 'REG-${portal.companyId}-${DateTime.now().millisecondsSinceEpoch % 10000}';
                      final chosenDept = ErpSystemData.departments[_regSelectedDepartmentId] ??
                          ErpSystemData.departments['recruitment']!;
                      final regEmail = _regEmailController.text.trim();
                      final regErr = ErpSystemData.validateCorporateEmail(regEmail);
                      if (regErr != null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: ErpTokens.statusDanger,
                            behavior: SnackBarBehavior.floating,
                            content: Text(
                              regErr,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                          ),
                        );
                        return;
                      }
                      final registeredAccount = ErpSystemData.registerCustomStaffAccount(
                        email: regEmail,
                        fullName: _regFullNameController.text.trim(),
                        companyId: portal.companyId,
                        departmentId: chosenDept.id,
                      );
                      final lockedDept = ErpSystemData.departments[registeredAccount.departmentId] ?? chosenDept;
                      final lockedPortal = ErpSystemData.resolvePortalByCode(registeredAccount.companyId);
                      setState(() {
                        _regReferenceNumber = ref;
                        _selectedPortal = lockedPortal;
                        _activeDepartment = lockedDept;
                        _authenticatedUserName = registeredAccount.fullName;
                        _authenticatedUserRole = registeredAccount.role;
                        _emailController.text = registeredAccount.email;
                        _activeTab = registeredAccount.defaultTab ?? lockedDept.defaultTab;
                        _activeTabTitle = registeredAccount.defaultTabTitle ?? lockedDept.defaultTabTitle;
                        _flowState = 'workspace';
                      });
                      _triggerInstantNativeNotification(
                        customTitle: 'اكتمال التسجيل والدخول للقسم ($ref)',
                        customBody: 'تم تفعيل حسابك في ${chosenDept.nameAr} (${portal.nameAr}) بنجاح.',
                      );
                    }
                  },
                  child: Text(_regStep < 3 ? 'الخطوة التالية' : 'تفعيل الحساب والدخول للقسم'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: APP LAUNCHER PAGE REPLICA (`src/pages/AppLauncherPage.tsx`)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildAppLauncherPageReplica() {
    final co = _selectedPortal.companyId;
    final visibleApps = ErpSystemData.allSystemApps.where((app) {
      final authorized = ErpSystemData.isTabAuthorized(
        departmentId: _activeDepartment.id,
        companyId: co,
        tabHref: app.href,
      );
      if (!authorized) return false;
      if (_launcherCategory != 'all' && app.category != _launcherCategory) {
        return false;
      }
      if (_launcherSearch.trim().isNotEmpty) {
        final q = _launcherSearch.trim().toLowerCase();
        return app.title.toLowerCase().contains(q) || app.subtitle.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: ErpTokens.canvasCream,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(_activeDepartment.emoji, style: const TextStyle(fontSize: 17)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'شاشات ${_activeDepartment.nameAr}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '${_selectedPortal.nameAr} • ${visibleApps.length} شاشة مصرح بها للقسم',
                                style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InkWell(
                        onTap: () => setState(() => _flowState = 'workspace'),
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          ),
                          child: const Text(
                            'لوحة القسم',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: _handleLogout,
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                          decoration: BoxDecoration(
                            color: ErpTokens.statusDangerBg,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                            border: Border.all(color: ErpTokens.statusDangerBorder),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.logout_rounded, size: 13, color: ErpTokens.statusDanger),
                              SizedBox(width: 4),
                              Text(
                                'خروج',
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: ErpTokens.statusDanger),
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

            // Search & Category Filter Pills
            Container(
              padding: const EdgeInsets.all(14),
              color: Colors.white,
              child: Column(
                children: [
                  TextField(
                    onChanged: (v) => setState(() => _launcherSearch = v),
                    decoration: InputDecoration(
                      hintText: 'ابحث في شاشات ${_activeDepartment.shortNameAr}...',
                      prefixIcon: const Icon(Icons.search_rounded, size: 18),
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
                    ),
                  ),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: const [
                        MapEntry('all', '🏛️ شاشات القسم المعتمدة'),
                        MapEntry('finance', '📊 نظام سماك المحاسبي SMACC'),
                        MapEntry('operations', '📑 العمليات والعقود'),
                        MapEntry('crm', '🤝 العملاء والتواصل'),
                        MapEntry('hr', '👥 الموارد البشرية WPS'),
                        MapEntry('governance', '🛡️ الحوكمة والقيادة'),
                      ].map((cat) {
                        final selected = _launcherCategory == cat.key;
                        return Padding(
                          padding: const EdgeInsetsDirectional.only(end: 6),
                          child: ChoiceChip(
                            label: Text(cat.value),
                            selected: selected,
                            selectedColor: ErpTokens.primary,
                            labelStyle: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: selected ? Colors.white : ErpTokens.ink,
                            ),
                            onSelected: (_) => setState(() => _launcherCategory = cat.key),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),

            // Apps Grid
            Expanded(
              child: visibleApps.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_activeDepartment.emoji, style: const TextStyle(fontSize: 34)),
                            const SizedBox(height: 8),
                            Text(
                              'حسابك مقيد بـ (${_activeDepartment.nameAr}) فقط.',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton(
                              onPressed: () => setState(() => _launcherCategory = 'all'),
                              child: const Text('عرض شاشات القسم المصرح بها'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(14),
                      itemCount: visibleApps.length,
                      itemBuilder: (context, idx) {
                        final app = visibleApps[idx];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: ErpTokens.cardPricingDecoration(),
                          child: ListTile(
                            onTap: () => _handleSelectTab(app.href, app.title),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            leading: Container(
                              width: 42,
                              height: 42,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: ErpTokens.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(app.emoji, style: const TextStyle(fontSize: 19)),
                            ),
                            title: Row(
                              children: [
                                if (app.smaccCode.isNotEmpty) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: ErpTokens.goldPale,
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: Text(
                                      app.smaccCode,
                                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                ],
                                Expanded(
                                  child: Text(
                                    app.title,
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                  ),
                                ),
                                if (app.metricBadge != null)
                                  ErpTokens.pillTagMint(app.metricBadge!, fontSize: 9.5),
                              ],
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                app.subtitle,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF71717A), height: 1.35),
                              ),
                            ),
                            trailing: const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: ErpTokens.ink),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 4: WORKSPACE APPSHELL (`AppShell.tsx` + `Header.tsx` + `Sidebar.tsx` + `MobileBottomNav.tsx`)
  // ═══════════════════════════════════════════════════════════════════════════
  Widget _buildWorkspaceAppShellReplica() {
    return Scaffold(
      key: _workspaceScaffoldKey,
      backgroundColor: ErpTokens.canvasCream,
      drawer: _buildSidebarDrawerReplica(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: InkWell(
        onTap: _openFarisNouraAdvisorSheet,
        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF1D2428),
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            border: Border.all(color: ErpTokens.champagneGold, width: 1.5),
            boxShadow: ErpTokens.elevation3Shadow,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 28,
                height: 28,
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: ErpTokens.canvasCream,
                  shape: BoxShape.circle,
                  border: Border.all(color: ErpTokens.champagneGold),
                ),
                child: Image.asset(
                  'assets/mascot.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(Icons.support_agent_rounded, size: 16, color: ErpTokens.ink),
                ),
              ),
              const SizedBox(width: 7),
              const Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'فارس ونُورة',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  Text(
                    'المستشار المؤسسي',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: ErpTokens.champagneGold),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 1. Sticky White Top Header (`src/components/layout/Header.tsx`)
            _buildTopHeaderReplica(),

            // 2. Main Scrollable Workspace Content Body (`.content-body` in `layout.css`)
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 96),
                children: [
                  if (_activeTab == 'dashboard')
                    DashboardViewReplica(
                      activePortal: _selectedPortal,
                      currentUserName: _authenticatedUserName,
                      currentUserRole: _authenticatedUserRole,
                      records: _scopedRecords,
                      onNavigate: _handleSelectTab,
                      onOpenAddRecordModal: _openCreateRecordSheet,
                      onOpenDocumentExtractorModal: _openUniversalDocumentExtractorSheet,
                    )
                  else
                    EnterpriseModuleWorkspaceView(
                      activeTab: _activeTab,
                      activeTabTitle: _activeTabTitle,
                      activePortal: _selectedPortal,
                      records: _scopedRecords,
                      onAddRecord: _openCreateRecordSheet,
                      onOpenDocumentExtractorModal: _openUniversalDocumentExtractorSheet,
                      onTriggerInstantNotification: () => _triggerInstantNativeNotification(
                        tabKey: _activeTab,
                        tabTitle: _activeTabTitle,
                      ),
                      onScheduleBackgroundNotification: _scheduleBackgroundNotification5s,
                      onNavigate: _handleSelectTab,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildMobileBottomNavReplica(),
    );
  }

  /// Exact Replica of `src/components/layout/Header.tsx` (Institutional Header with Department Badge & Logout)
  Widget _buildTopHeaderReplica() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: const BoxDecoration(
        color: ErpTokens.canvasLight,
        border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
      ),
      child: Row(
        children: [
          // Hamburger Button (`Header.tsx`)
          InkWell(
            onTap: () => _workspaceScaffoldKey.currentState?.openDrawer(),
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: ErpTokens.hairlineLight),
              ),
              child: const Icon(Icons.menu_rounded, size: 18, color: ErpTokens.ink),
            ),
          ),
          const SizedBox(width: 8),

          // Current Page Title & Branch Picker
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _activeTabTitle,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                GestureDetector(
                  onTap: _openBranchPickerSheet,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on_outlined, size: 11, color: ErpTokens.goldDark),
                      const SizedBox(width: 3),
                      Text(
                        _selectedBranch.name,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF71717A)),
                      ),
                      const Icon(Icons.keyboard_arrow_down_rounded, size: 12, color: Color(0xFF71717A)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Universal Document & 100-Invoice Batch Auto-Extractor Button (`Header.tsx`)
          InkWell(
            onTap: _openUniversalDocumentExtractorSheet,
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: ErpTokens.primary,
                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.upload_file_rounded, size: 13, color: ErpTokens.goldLight),
                  SizedBox(width: 3),
                  Text(
                    'رفع مستندات',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 5),

          // Faris & Noura Header Quick Trigger (`Header.tsx`)
          InkWell(
            onTap: _openFarisNouraAdvisorSheet,
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
              decoration: BoxDecoration(
                color: ErpTokens.goldPale,
                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                border: Border.all(color: ErpTokens.champagneGold),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: Image.asset(
                      'assets/mascot.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const Icon(Icons.support_agent_rounded, size: 13, color: ErpTokens.ink),
                    ),
                  ),
                  const SizedBox(width: 3),
                  const Text(
                    'فارس/نُورة',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 5),

          // Locked Department & Employee Identity Pill (`Header.tsx` Profile Modal Trigger)
          InkWell(
            onTap: _openEmployeeProfileModal,
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: ErpTokens.goldPale,
                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.6)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_activeDepartment.emoji, style: const TextStyle(fontSize: 12.5)),
                  const SizedBox(width: 4),
                  Text(
                    _activeDepartment.shortNameAr,
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 6),

          // Notification Bell with Unread Badge (`Header.tsx`)
          InkWell(
            onTap: _openNotificationsAndBackgroundSheet,
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 35,
                  height: 35,
                  decoration: BoxDecoration(
                    color: ErpTokens.surfaceSubtle,
                    shape: BoxShape.circle,
                    border: Border.all(color: ErpTokens.hairlineLight),
                  ),
                  child: const Icon(Icons.notifications_none_rounded, size: 18, color: ErpTokens.ink),
                ),
                if (_unreadCount > 0)
                  Positioned(
                    top: -2,
                    left: -2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE11D48),
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                      child: Text(
                        '$_unreadCount',
                        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 6),

          // Logout to Unified Corporate Login Portal (`Header.tsx`)
          InkWell(
            onTap: _handleLogout,
            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
            child: Container(
              width: 35,
              height: 35,
              decoration: BoxDecoration(
                color: ErpTokens.statusDangerBg.withValues(alpha: 0.75),
                shape: BoxShape.circle,
                border: Border.all(color: ErpTokens.statusDangerBorder),
              ),
              child: const Icon(Icons.logout_rounded, size: 16, color: ErpTokens.statusDanger),
            ),
          ),
        ],
      ),
    );
  }

  /// Exact Replica of `src/components/layout/Sidebar.tsx` (Department-Isolated Tree Drawer + Logout Footer)
  Widget _buildSidebarDrawerReplica() {
    final co = _selectedPortal.companyId;
    return Drawer(
      width: 305,
      backgroundColor: ErpTokens.canvasLight,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Sidebar Brand & Locked Department Header
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: ErpTokens.champagneGold),
                        ),
                        child: Image.asset(
                          _selectedPortal.assetLogo,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const Icon(Icons.apartment_rounded),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedPortal.nameAr,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${_activeDepartment.emoji} ${_activeDepartment.nameAr}',
                              style: const TextStyle(fontSize: 10.5, color: ErpTokens.goldDark, fontWeight: FontWeight.w800),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close_rounded, size: 20),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Quick Search inside Sidebar (`Sidebar.tsx`)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
              child: TextField(
                onChanged: (v) => setState(() => _sidebarSearch = v),
                style: const TextStyle(fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'بحث في قوائم ${_activeDepartment.shortNameAr}...',
                  prefixIcon: const Icon(Icons.search_rounded, size: 17),
                  filled: true,
                  fillColor: ErpTokens.surfaceSubtle,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                  ),
                ),
              ),
            ),

            // Tree Items Strictly Filtered by Department & Company (`Sidebar.tsx`)
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                children: ErpSystemData.sidebarMenu.map((item) {
                  if (item.children.isEmpty) {
                    if (item.href != null &&
                        !ErpSystemData.isTabAuthorized(
                          departmentId: _activeDepartment.id,
                          companyId: co,
                          tabHref: item.href!,
                        )) {
                      return const SizedBox.shrink();
                    }
                    final isActive = _activeTab == item.href;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      child: ListTile(
                        dense: true,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        tileColor: isActive ? ErpTokens.primary : Colors.transparent,
                        leading: Icon(
                          item.icon,
                          size: 18,
                          color: isActive ? ErpTokens.goldLight : ErpTokens.ink,
                        ),
                        title: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: isActive ? Colors.white : ErpTokens.ink,
                          ),
                        ),
                        onTap: () {
                          Navigator.of(context).pop();
                          if (item.href != null) _handleSelectTab(item.href!, item.title);
                        },
                      ),
                    );
                  }

                  final visibleChildren = item.children.where((c) {
                    if (c.href != null &&
                        !ErpSystemData.isTabAuthorized(
                          departmentId: _activeDepartment.id,
                          companyId: co,
                          tabHref: c.href!,
                        )) {
                      return false;
                    }
                    if (_sidebarSearch.trim().isNotEmpty) {
                      return c.title.toLowerCase().contains(_sidebarSearch.trim().toLowerCase());
                    }
                    return true;
                  }).toList();

                  if (visibleChildren.isEmpty) return const SizedBox.shrink();

                  final expanded = _sidebarSearch.trim().isNotEmpty || (_expandedSidebarGroups[item.id] ?? true);

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      InkWell(
                        onTap: () => setState(() => _expandedSidebarGroups[item.id] = !expanded),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                          decoration: BoxDecoration(
                            color: expanded ? const Color(0xFFF4F4F5) : Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                            border: expanded ? Border.all(color: ErpTokens.hairlineLight) : null,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: ErpTokens.primary,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Icon(item.icon, size: 15, color: Colors.white),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  item.title,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                ),
                              ),
                              Icon(
                                expanded ? Icons.keyboard_arrow_down_rounded : Icons.keyboard_arrow_left_rounded,
                                size: 18,
                                color: const Color(0xFF71717A),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (expanded)
                        Padding(
                          padding: const EdgeInsetsDirectional.only(start: 14, bottom: 8),
                          child: Column(
                            children: visibleChildren.map((child) {
                              final isDirectActive = _activeTab == child.href;
                              return InkWell(
                                onTap: () {
                                  Navigator.of(context).pop();
                                  if (child.href != null) _handleSelectTab(child.href!, child.title);
                                },
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 3),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isDirectActive ? ErpTokens.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        child.icon,
                                        size: 15,
                                        color: isDirectActive ? ErpTokens.goldLight : const Color(0xFF71717A),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          child.title,
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: isDirectActive ? FontWeight.w800 : FontWeight.w600,
                                            color: isDirectActive ? Colors.white : const Color(0xFF3F3F46),
                                          ),
                                        ),
                                      ),
                                      if (child.badge != null)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isDirectActive ? const Color(0xFF18181B) : const Color(0xFFF4F4F5),
                                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                          ),
                                          child: Text(
                                            child.badge!,
                                            style: TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w800,
                                              color: isDirectActive ? ErpTokens.goldLight : ErpTokens.ink,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                    ],
                  );
                }).toList(),
              ),
            ),

            // Sticky Institutional Employee Identity & Direct Logout Footer (`Sidebar.tsx`)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: ErpTokens.hairlineLight)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: ErpTokens.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(_activeDepartment.emoji, style: const TextStyle(fontSize: 16)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _authenticatedUserName,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              _authenticatedUserRole,
                              style: const TextStyle(fontSize: 10.5, color: Color(0xFF71717A)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _handleLogout();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ErpTokens.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                      ),
                    ),
                    icon: const Icon(Icons.logout_rounded, size: 16, color: ErpTokens.goldLight),
                    label: const Text(
                      'تسجيل الخروج من القسم',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Exact Replica of `src/components/layout/MobileBottomNav.tsx` (Department-Aware Bottom Navigation)
  Widget _buildMobileBottomNavReplica() {
    final opsHref = _activeDepartment.defaultTab;
    final opsLabel = _activeDepartment.shortNameAr;
    final opsTitle = _activeDepartment.defaultTabTitle;

    IconData opsIcon = Icons.work_outline_rounded;
    if (_activeDepartment.id == 'finance') {
      opsIcon = Icons.account_balance_wallet_outlined;
    } else if (_activeDepartment.id == 'hr') {
      opsIcon = Icons.badge_outlined;
    } else if (_activeDepartment.id == 'crm') {
      opsIcon = Icons.people_outline_rounded;
    } else if (_activeDepartment.id == 'shelter') {
      opsIcon = Icons.hotel_outlined;
    } else if (_activeDepartment.id == 'tenders') {
      opsIcon = Icons.gavel_rounded;
    } else if (_activeDepartment.id == 'ats') {
      opsIcon = Icons.rule_folder_outlined;
    }

    final isHomeActive = _activeTab == 'dashboard';
    final isOpsActive = _activeTab == opsHref && _activeTab != 'dashboard';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.97),
        border: const Border(top: BorderSide(color: ErpTokens.hairlineLight)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14091725),
            blurRadius: 24,
            offset: Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Micro Status Strip when Offline or Pending Queue
            if (_simulatedOfflineMode || _offlineQueue.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: _simulatedOfflineMode
                      ? ErpTokens.statusWarning.withValues(alpha: 0.15)
                      : ErpTokens.statusSuccess.withValues(alpha: 0.15),
                  border: const Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _simulatedOfflineMode
                            ? 'وضع عدم الاتصال • العمل في الخلفية نشط (${_offlineQueue.length} بالانتظار)'
                            : 'طابور المزامنة الخلفية (${_offlineQueue.length} عمليات جاهزة للمزامنة)',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!_simulatedOfflineMode && _offlineQueue.isNotEmpty)
                      InkWell(
                        onTap: () => _flushOfflineQueue(reason: 'شريط الهاتف السفلي'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: ErpTokens.statusSuccess,
                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                          ),
                          child: const Text(
                            'مزامنة الآن',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                      ),
                  ],
                ),
              ),

            // 5-Column Ergonomic Bar (`MobileBottomNav.tsx`)
            SizedBox(
              height: 64,
              child: Row(
                children: [
                  // 1. الرئيسية (أو شاشة القسم الرئيسية)
                  Expanded(
                    child: _buildBottomNavButton(
                      icon: Icons.home_outlined,
                      label: 'الرئيسية',
                      active: isHomeActive,
                      onTap: () {
                        if (_activeDepartment.id == 'executive') {
                          _handleSelectTab('dashboard', 'الرئيسية والمؤشرات التشغيلية');
                        } else {
                          _handleSelectTab(opsHref, opsTitle);
                        }
                      },
                    ),
                  ),
                  // 2. القسم المخصص للموظف
                  Expanded(
                    child: _buildBottomNavButton(
                      icon: opsIcon,
                      label: opsLabel,
                      active: isOpsActive,
                      onTap: () => _handleSelectTab(opsHref, opsTitle),
                    ),
                  ),
                  // 3. Center Elevated Action Button: شاشات القسم (`AppLauncherPage`)
                  Expanded(
                    child: Center(
                      child: InkWell(
                        onTap: () => setState(() => _flowState = 'launcher'),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: ErpTokens.primary,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: ErpTokens.champagneGold,
                              width: 1.8,
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x3F18181B),
                                blurRadius: 12,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.grid_view_rounded, size: 18, color: ErpTokens.goldLight),
                              SizedBox(height: 1),
                              Text(
                                'الأقسام',
                                style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w900, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // 4. الإشعارات والعمل في الخلفية
                  Expanded(
                    child: _buildBottomNavButton(
                      icon: Icons.notifications_none_rounded,
                      label: 'الإشعارات',
                      active: false,
                      badgeCount: _unreadCount,
                      onTap: _openNotificationsAndBackgroundSheet,
                    ),
                  ),
                  // 5. القائمة الجانبية الكاملة
                  Expanded(
                    child: _buildBottomNavButton(
                      icon: Icons.menu_rounded,
                      label: 'القائمة',
                      active: false,
                      onTap: () => _workspaceScaffoldKey.currentState?.openDrawer(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavButton({
    required IconData icon,
    required String label,
    required bool active,
    int badgeCount = 0,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 36,
                height: 26,
                decoration: BoxDecoration(
                  color: active ? ErpTokens.goldPale : Colors.transparent,
                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: active ? ErpTokens.ink : const Color(0xFF71717A),
                ),
              ),
              if (badgeCount > 0)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE11D48),
                      borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                    ),
                    child: Text(
                      badgeCount > 99 ? '99+' : '$badgeCount',
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: active ? FontWeight.w900 : FontWeight.w600,
              color: active ? ErpTokens.ink : const Color(0xFF71717A),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS & INTERACTIVE SHEETS (Notifications, Background Engine, Employee Profile, Add Record)
  // ═══════════════════════════════════════════════════════════════════════════
  void _openNotificationsAndBackgroundSheet() {
    setState(() {
      for (final n in _notifications) {
        n.read = true;
      }
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.78,
              maxChildSize: 0.94,
              minChildSize: 0.5,
              builder: (_, scrollController) {
                return ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(18),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'مركز الإشعارات والعمل في الخلفية الأصلي',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Native Background Engine Status Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: ErpTokens.charcoalDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.45)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'محرك الخلفية الأصلي (Android & iOS)',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white),
                              ),
                              ErpTokens.pillTagMint(
                                _bgServiceRunning ? 'نشط ($_heartbeatCount نبضة)' : 'متوقف',
                                fontSize: 10,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'آخر مزامنة: $_lastSyncTime • الطابور غير المتصل: ${_offlineQueue.length} عملية',
                            style: const TextStyle(fontSize: 11, color: Color(0xFFD4D4D8)),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.of(ctx).pop();
                                    _triggerInstantNativeNotification();
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: ErpTokens.champagneGold,
                                    foregroundColor: ErpTokens.charcoalDark,
                                  ),
                                  icon: const Icon(Icons.notifications_active_rounded, size: 16),
                                  label: const Text('إشعار فوري الآن', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.of(ctx).pop();
                                    _scheduleBackgroundNotification5s();
                                  },
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Colors.white38),
                                  ),
                                  icon: const Icon(Icons.timer_outlined, size: 16),
                                  label: const Text('إشعار بعد 5 ثوانٍ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          SwitchListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: const Text('منع قفل الشاشة أثناء العمليات (WakeLock)', style: TextStyle(fontSize: 11.5, color: Colors.white)),
                            value: _wakeLockEnabled,
                            activeThumbColor: ErpTokens.champagneGold,
                            onChanged: (v) async {
                              setState(() => _wakeLockEnabled = v);
                              setModalState(() {});
                              try {
                                await _nativeChannel.invokeMethod('setWakeLock', {'enable': v});
                              } catch (_) {}
                            },
                          ),
                          SwitchListTile(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            title: const Text('محاكاة انقطاع الإنترنت (Offline Queue Mode)', style: TextStyle(fontSize: 11.5, color: Colors.white)),
                            value: _simulatedOfflineMode,
                            activeThumbColor: ErpTokens.statusWarning,
                            onChanged: (v) {
                              setState(() => _simulatedOfflineMode = v);
                              setModalState(() {});
                              if (!v && _offlineQueue.isNotEmpty) {
                                _flushOfflineQueue(reason: 'عودة الاتصال');
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'سجل الإشعارات والتنبيهات الفورية',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 8),
                    ..._notifications.map(
                      (n) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: ErpTokens.cardPricingDecoration(),
                        child: ListTile(
                          onTap: () {
                            Navigator.of(ctx).pop();
                            _handleSelectTab(n.tabKey, n.tabTitle);
                          },
                          leading: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(color: ErpTokens.goldPale, shape: BoxShape.circle),
                            child: const Icon(Icons.notifications_rounded, size: 18, color: ErpTokens.goldDark),
                          ),
                          title: Text(n.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                          subtitle: Text('${n.message}\n${n.timestamp}', style: const TextStyle(fontSize: 11)),
                          isThreeLine: true,
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  void _openCreateRecordSheet() {
    final titleCtrl = TextEditingController();
    final amountCtrl = TextEditingController(text: '17,250 ⃁');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(18, 18, 18, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'إضافة سجل جديد في ${_activeDepartment.nameAr}',
                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, color: ErpTokens.ink),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'عنوان العقد / الطلب / القيد المحاسبي',
                  hintText: 'مثال: قيد يومية أو عقد استقدام مساند',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: amountCtrl,
                decoration: const InputDecoration(
                  labelText: 'القيمة المالية أو المؤشر',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: ErpTokens.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ErpTokens.radiusPill)),
                ),
                onPressed: () {
                  final co = _selectedPortal.companyId == 'all' ? 'SAF' : _selectedPortal.companyId;
                  final newId = '$co-${DateTime.now().millisecondsSinceEpoch % 10000}';
                  final recTitle = titleCtrl.text.trim().isEmpty
                      ? 'عملية جديدة #$newId — $_activeTabTitle'
                      : titleCtrl.text.trim();

                  setState(() {
                    _allRecords.insert(
                      0,
                      ErpOperationalRecord(
                        id: newId,
                        companyId: co,
                        moduleKey: 'contracts',
                        title: recTitle,
                        subtitle: 'تم الإنشاء عبر تطبيق الهاتف • القسم: ${_activeDepartment.shortNameAr} • الفرع: ${_selectedBranch.name}',
                        status: _simulatedOfflineMode ? 'في طابور الأوفلاين' : 'مرحّل وموثق',
                        badgeText: 'جديد ($co)',
                        amountOrMetric: amountCtrl.text.trim(),
                        updatedAt: 'الآن',
                      ),
                    );
                    if (_simulatedOfflineMode) {
                      _offlineQueue.add(
                        OfflineQueueAction(
                          id: newId,
                          actionType: 'CREATE_RECORD',
                          description: recTitle,
                          companyCode: co,
                          createdAt: 'الآن',
                        ),
                      );
                    }
                  });
                  Navigator.of(ctx).pop();
                  _triggerInstantNativeNotification(
                    customTitle: 'تم حفظ العملية #$newId (${_activeDepartment.shortNameAr})',
                    customBody: recTitle,
                    tabKey: _activeTab,
                    tabTitle: _activeTabTitle,
                  );
                },
                icon: const Icon(Icons.check_circle_outline_rounded, color: ErpTokens.goldLight),
                label: const Text('حفظ وترحيل وإرسال إشعار للهاتف', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Exact Mobile Replica of `UniversalDocumentExtractorModal.tsx`
  /// Supports 1 to 100+ Invoices / PDF / Word / Excel / External Accounting Systems with Auto-Department Routing & Isolated Company Ledgers
  void _openUniversalDocumentExtractorSheet() {
    String targetCompanyCode = _selectedPortal.companyId == 'all' ? 'SAF' : _selectedPortal.companyId;
    String selectedFormat = 'IMAGE_QR'; // 'IMAGE_QR' | 'PDF_DOC' | 'WORD_DOCX' | 'EXTERNAL_ERP_EXCEL'
    String routingMode = 'auto'; // 'auto' | 'finance' | 'recruitment' | 'rental' | 'ats' | 'hr' | 'shelter'
    int batchCount = 100;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final formatLabels = <String, ({String title, String sub, String badge, String deptKey, String deptName})>{
              'IMAGE_QR': (
                title: '📷 صور فواتير ضريبية (JPG / PNG / WebP)',
                sub: 'قراءة باركود ZATCA QR واستخلاص الضريبة 15% وإرفاق صورة كل فاتورة في الجدول',
                badge: 'صورة فاتورة + ZATCA QR',
                deptKey: 'finance',
                deptName: 'قسم المحاسبة والمالية (نظام سماك SMACC — الفوترة ZATCA)',
              ),
              'PDF_DOC': (
                title: '📄 مستند PDF متعدد الصفحات (.pdf)',
                sub: 'فصل الفواتير والعقود تلقائياً من ملف PDF وإدراج كل صفحة كسجل مستقل مع المرفق',
                badge: 'مستند PDF موثق',
                deptKey: 'finance',
                deptName: 'قسم المحاسبة والمالية (نظام سماك SMACC)',
              ),
              'WORD_DOCX': (
                title: '📝 مستندات وعقود Word (.docx / .doc)',
                sub: 'استخلاص بيانات العقود أو السير الذاتية أو الخطابات وتوجيهها للقسم المعني',
                badge: 'مستند Word رسمي',
                deptKey: 'recruitment',
                deptName: 'قسم عقود الاستقدام (مساند)',
              ),
              'EXTERNAL_ERP_EXCEL': (
                title: '📊 نظام محاسبي منفصل للشركة الأخرى (Excel / XML / CSV)',
                sub: 'استيراد قيود اليومية والفواتير وميزان المراجعة من نظام محاسبي خارجي لعزلها في دفاتر الشركة',
                badge: 'نظام محاسبي منفصل Excel/XML',
                deptKey: 'finance',
                deptName: 'قسم المحاسبة والمالية (الأستاذ العام SMACC GL)',
              ),
            };

            final currentFmt = formatLabels[selectedFormat]!;
            final effectiveDeptName = routingMode == 'auto'
                ? 'التعرف التلقائي ← ${currentFmt.deptName}'
                : (ErpSystemData.departments[routingMode]?.nameAr ?? currentFmt.deptName);

            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.86,
              maxChildSize: 0.95,
              minChildSize: 0.6,
              builder: (_, scrollCtrl) {
                return ListView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.all(18),
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: ErpTokens.charcoalDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: ErpTokens.champagneGold.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: ErpTokens.champagneGold),
                            ),
                            child: const Icon(Icons.upload_file_rounded, color: ErpTokens.goldLight, size: 22),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'بوابة الاستخلاص التلقائي للمستندات والفواتير والأنظمة المحاسبية',
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Colors.white),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'رفع 1 إلى 100+ فاتورة أو مستند (PDF / Word / Excel / صور) وتوجيهه تلقائياً للقسم المعني والنظام المحاسبي المستقل للشركة',
                                  style: TextStyle(fontSize: 10.5, color: Color(0xFFD4D4D8)),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(ctx).pop(),
                            icon: const Icon(Icons.close_rounded, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 1. Per-Company Isolated Accounting System Selector
                    const Text(
                      '١. النظام المحاسبي المستقل للشركة (دفتر محاسبي معزول لكل شركة):',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: ErpSystemData.mainSubsidiaryCompanies.map((comp) {
                        final active = targetCompanyCode == comp.companyId;
                        return ChoiceChip(
                          label: Text('[${comp.companyId}] ${comp.nameAr}', style: const TextStyle(fontSize: 10.5)),
                          selected: active,
                          selectedColor: ErpTokens.primary,
                          labelStyle: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: active ? Colors.white : ErpTokens.ink,
                          ),
                          onSelected: (_) => setModalState(() => targetCompanyCode = comp.companyId),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),

                    // 2. Document Format Selector (Any Format)
                    const Text(
                      '٢. صيغة الملفات المرفوعة (يتم التعرف على أي صيغة تلقائياً):',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    ...formatLabels.entries.map((entry) {
                      final active = selectedFormat == entry.key;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 7),
                        child: ListTile(
                          onTap: () => setModalState(() => selectedFormat = entry.key),
                          dense: true,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: active ? ErpTokens.primary : ErpTokens.hairlineLight,
                              width: active ? 1.5 : 1,
                            ),
                          ),
                          tileColor: active ? ErpTokens.goldPale.withValues(alpha: 0.45) : ErpTokens.surfaceSubtle,
                          leading: Icon(
                            active ? Icons.check_circle_rounded : Icons.insert_drive_file_outlined,
                            color: active ? ErpTokens.primary : const Color(0xFF71717A),
                          ),
                          title: Text(entry.value.title, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800)),
                          subtitle: Text(entry.value.sub, style: const TextStyle(fontSize: 10, color: Color(0xFF52525B))),
                        ),
                      );
                    }),
                    const SizedBox(height: 10),

                    // 3. Department Auto-Recognition Mode
                    const Text(
                      '٣. التوجيه التلقائي إلى القسم المعني:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.verified_rounded, size: 18, color: Color(0xFF047857)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'القسم المكتشف تلقائياً: $effectiveDeptName • الشركة المعزولة: [$targetCompanyCode]',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // 4. Batch Size Selector (1, 10, 50, 100 Invoices/Documents)
                    const Text(
                      '٤. عدد الفواتير / المستندات المراد رفعها واستخلاصها دفعة واحدة:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [1, 10, 50, 100].map((cnt) {
                        final selected = batchCount == cnt;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsetsDirectional.only(end: 6),
                            child: ChoiceChip(
                              label: Text('$cnt فاتورة/مستند', style: const TextStyle(fontSize: 10.5)),
                              selected: selected,
                              selectedColor: ErpTokens.primary,
                              labelStyle: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: selected ? Colors.white : ErpTokens.ink,
                              ),
                              onSelected: (_) => setModalState(() => batchCount = cnt),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // 5. Execute Extraction & Auto-Route Button
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ErpTokens.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ErpTokens.radiusPill)),
                      ),
                      onPressed: () {
                        final nowSuffix = DateTime.now().millisecondsSinceEpoch % 10000;
                        final insertedPreviewCount = batchCount > 15 ? 15 : batchCount;
                        final List<ErpOperationalRecord> newBatch = [];

                        for (int i = 1; i <= insertedPreviewCount; i++) {
                          final invNum = 'DOC-$targetCompanyCode-${nowSuffix + i}';
                          final netVal = 12000 + (i * 450);
                          final vatVal = (netVal * 0.15).round();
                          final totalVal = netVal + vatVal;
                          newBatch.add(
                            ErpOperationalRecord(
                              id: invNum,
                              companyId: targetCompanyCode,
                              moduleKey: currentFmt.deptKey == 'finance' ? 'finance' : 'contracts',
                              title: i == 1 && batchCount > 1
                                  ? 'دفعة مستخلصة ($batchCount مستند/فاتورة) — #$invNum (${currentFmt.badge})'
                                  : 'مستند مستخلص #$invNum — ${currentFmt.badge}',
                              subtitle: 'تم التعرف التلقائي وتوجيهه إلى ${currentFmt.deptName} • دفتر شركة [$targetCompanyCode] المستقل • صافي: $netVal ⃁ + ضريبة: $vatVal ⃁',
                              status: 'مرحّل وموثق + مرفق محفوظ',
                              badgeText: '${currentFmt.badge} • $targetCompanyCode',
                              amountOrMetric: '$totalVal ⃁ (شامل 15%)',
                              updatedAt: 'الآن',
                              attachmentLabel: 'معاينة المرفق (${currentFmt.badge})',
                              sourceFormat: currentFmt.badge,
                            ),
                          );
                        }

                        setState(() {
                          _allRecords.insertAll(0, newBatch);
                        });

                        Navigator.of(ctx).pop();
                        _triggerInstantNativeNotification(
                          customTitle: 'اكتمال استخلاص وتوجيه $batchCount مستند/فاتورة [$targetCompanyCode]',
                          customBody: 'تم التعرف على الصيغة (${currentFmt.badge}) وإدراجها في ${currentFmt.deptName} وترحيل القيود في النظام المحاسبي المستقل لشركة $targetCompanyCode.',
                          tabKey: _activeTab,
                          tabTitle: _activeTabTitle,
                        );
                      },
                      icon: const Icon(Icons.bolt_rounded, color: ErpTokens.goldLight),
                      label: Text(
                        'استخلاص وإدراج ($batchCount) مستند/فاتورة في القسم المعني ودفاتر [$targetCompanyCode]',
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  void _openBranchPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(16),
          children: [
            const Text('اختر الفرع التشغيلي النشط', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            ...ErpSystemData.branches.map(
              (b) => ListTile(
                leading: const Icon(Icons.location_on_rounded, color: ErpTokens.goldDark),
                title: Text(b.name, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                subtitle: Text(b.city, style: const TextStyle(fontSize: 11)),
                trailing: _selectedBranch.id == b.id ? const Icon(Icons.check_circle_rounded, color: ErpTokens.statusSuccess) : null,
                onTap: () {
                  setState(() => _selectedBranch = b);
                  Navigator.of(ctx).pop();
                },
              ),
            ),
          ],
        );
      },
    );
  }

  void _openEmployeeProfileModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: ErpTokens.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(_activeDepartment.emoji, style: const TextStyle(fontSize: 22)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _authenticatedUserName,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                        ),
                        Text(
                          _authenticatedUserRole,
                          style: const TextStyle(fontSize: 11.5, color: Color(0xFF71717A)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ErpTokens.goldPale.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpTokens.champagneGold.withValues(alpha: 0.6)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الشركة المعزولة: ${_selectedPortal.emoji} ${_selectedPortal.nameAr}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'القسم الإداري المقفل: ${_activeDepartment.emoji} ${_activeDepartment.nameAr}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'الفرع النشط: ${_selectedBranch.name}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF52525B)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        setState(() => _flowState = 'launcher');
                      },
                      icon: const Icon(Icons.grid_view_rounded, size: 16),
                      label: const Text('شاشات القسم'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        _handleLogout();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ErpTokens.primary,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.logout_rounded, size: 16, color: ErpTokens.goldLight),
                      label: const Text('تسجيل الخروج'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  /// Exact Replica of `AICopilotWidget.tsx` & `localAiService.ts` (Faris & Noura Employee Task Co-Pilot 2.0)
  void _openFarisNouraAdvisorSheet() {
    String activePersona =
        (_activeDepartment.id == 'shelter' || _activeDepartment.id == 'hr' || _activeDepartment.id == 'crm')
            ? 'noura'
            : 'faris';
    final TextEditingController queryController = TextEditingController();
    final compName = _selectedPortal.nameAr;
    final compCode = _selectedPortal.companyId == 'all' ? 'GROUP' : _selectedPortal.companyId.toUpperCase();
    final totalRecordsCount = _scopedRecords.length;

    String buildWelcome(String p) {
      if (p == 'noura') {
        return 'أهلاً بكِ يا $_authenticatedUserName في نطاق ($compName) — قسم (${_activeDepartment.nameAr})!\n'
            '• أنا "نُورة"، المساعدة التنفيذية لمهام الموظفين. أستطيع تنفيذ مهام قسمكِ مباشرة: تسكين نزيلة بالإيواء، حساب مكافأة نهاية الخدمة (مادة 84/85)، صياغة خطاب رسمي أو رد واتساب، تسجيل عقد مساند/تأجير، أو استخلاص 100 فاتورة ومستند تلقائياً.';
      }
      return 'أهلاً بك يا $_authenticatedUserName في نطاق ($compName) — قسم (${_activeDepartment.nameAr})!\n'
          '• أنا "فارس"، المساعد التنفيذي لمهام الموظفين. أستطيع تنفيذ مهام قسمك مباشرة: إصدار فاتورة ضريبية ZATCA، قيد يومية، سند قبض/صرف، عقد مساند/تأجير، تسعير جدول كميات BOQ، أو استخلاص 100 فاتورة ومستند تلقائياً.';
    }

    String buildDailyBriefing(String p) {
      final header = p == 'noura'
          ? '📋 إيجاز المهام اليومي من "نُورة" لـ $_authenticatedUserName (${_activeDepartment.nameAr}):'
          : '📋 إيجاز المهام اليومي من "فارس" لـ $_authenticatedUserName (${_activeDepartment.nameAr}):';
      return '$header\n'
          '• الكيان النشط: $compName [$compCode]\n'
          '• إجمالي السجلات النشطة في نطاقك: $totalRecordsCount سجل تشغيلي ومحاسبي\n'
          '• الحالة الضريبية والمحاسبية (SMACC & ZATCA): متوازنة ومشفرة 100%\n'
          '• مهامك السريعة الجاهزة للتنفيذ اليوم:\n'
          '  1) اضغط على أي شريحة مهمة بالأسفل لتنفيذها فوراً.\n'
          '  2) اطلب إنشاء فاتورة أو عقد أو قيد أو خطاب رسمي وسيتم إدراجه في دفاتر [$compCode].';
    }

    final List<Map<String, String>> chatMessages = [
      {
        'sender': 'advisor',
        'persona': activePersona,
        'text': buildWelcome(activePersona),
        'actionLabel': 'فتح ${_activeDepartment.defaultTabTitle}',
        'actionKey': _activeDepartment.defaultTab,
      },
    ];

    List<Map<String, String>> getDepartmentQuickPrompts() {
      switch (_activeDepartment.id) {
        case 'finance':
          return [
            {'label': '🧾 إصدار فاتورة ZATCA فورية', 'query': 'أصدر فاتورة ضريبية جديدة بمبلغ 5000 ريال شاملة الضريبة'},
            {'label': '📘 تسجيل قيد يومية SMACC', 'query': 'سجل قيد يومية محاسبي بمبلغ 12000 ريال في دفتر الأستاذ'},
            {'label': '💵 إنشاء سند قبض / صرف', 'query': 'أنشئ سند قبض جديد بمبلغ 8500 ريال تحويل بنكي'},
            {'label': '🏦 رصيد الصندوق والبنوك', 'query': 'كم رصيد الصندوق والبنوك والسيولة الحالية؟'},
            {'label': '📄 رفع 100 فاتورة / مستند', 'query': 'أريد رفع 100 فاتورة أو مستند PDF وWord وExcel واستخلاصها'},
          ];
        case 'recruitment':
          return [
            {'label': '📑 إنشاء عقد استقدام مساند', 'query': 'أنشئ عقد استقدام مساند جديد بمبلغ 17250 ريال'},
            {'label': '🔍 فحص حالة عقود مساند', 'query': 'ما هي حالة عقود مساند السارية وتفويض إنجاز؟'},
            {'label': '✉️ صياغة رسالة للعميل', 'query': 'اكتب رسالة واتساب رسمية للعميل لإشعاره بصدور التأشيرة'},
            {'label': '📄 رفع مستندات العقود', 'query': 'أريد رفع مستندات عقود واستخلاصها تلقائياً'},
          ];
        case 'rental':
          return [
            {'label': '🤝 إنشاء عقد تأجير وتشغيل', 'query': 'أنشئ عقد تأجير شهري جديد بمبلغ 3450 ريال'},
            {'label': '💵 متابعة تحصيل الإيجارات', 'query': 'ما هي حالة عقود التأجير والتحصيل الشهري؟'},
            {'label': '✉️ إشعار تجديد عقد تأجير', 'query': 'اكتب رسالة رسمية لتذكير العميل بتجديد عقد التأجير'},
          ];
        case 'ats':
          return [
            {'label': '🗂️ تسجيل سيرة ذاتية ATS', 'query': 'سجل سيرة ذاتية جديدة في بنك السير الذاتية ATS'},
            {'label': '🌍 حالة الوكالات الخارجية', 'query': 'ما هي حالة السير الذاتية والوكالات الخارجية؟'},
            {'label': '📄 استخلاص سير ذاتية PDF', 'query': 'أريد رفع ملفات سير ذاتية واستخلاص بياناتها تلقائياً'},
          ];
        case 'hr':
          return [
            {'label': '🧮 حساب مكافأة نهاية الخدمة', 'query': 'احسب مكافأة نهاية الخدمة لموظف راتبه 8000 ريال وخدمته 6 سنوات انتهاء عقد'},
            {'label': '🪪 فحص الإقامات المنتهية', 'query': 'افحص الإقامات والعقود القريبة من الانتهاء وحالة WPS'},
            {'label': '✉️ صياغة خطاب تعريف بالراتب', 'query': 'اكتب خطاب رسمي للتعريف بالراتب موجه للبنك'},
          ];
        case 'crm':
          return [
            {'label': '👤 تسجيل عميل جديد CRM', 'query': 'سجل عميل جديد في قاعدة بيانات العملاء CRM'},
            {'label': '🎫 فتح تذكرة شكوى SLA', 'query': 'افتح تذكرة شكوى جديدة للعميل وتابع اتفاقية SLA'},
            {'label': '✉️ صياغة رد رسمي لعميل', 'query': 'اكتب رسالة اعتذار ومتابعة رسمية للعميل عبر واتساب'},
          ];
        case 'shelter':
          return [
            {'label': '🏠 تسكين نزيلة جديدة بالإيواء', 'query': 'سجل تسكين نزيلة جديدة في مركز الإيواء بالجناح أ'},
            {'label': '🛏️ نسبة الإشغال والأسرة الشاغرة', 'query': 'ما هي الطاقة الاستيعابية وحالة مراكز الإيواء؟'},
            {'label': '🩺 الكشف الطبي والرعاية HRSD', 'query': 'اعرض حالة الرعاية الصحية والامتثال في مركز الإيواء'},
          ];
        case 'tenders':
          return [
            {'label': '📐 تسعير جدول كميات BOQ', 'query': 'احسب تسعير جدول كميات BOQ لمنافسة كاس مع ضريبة 15%'},
            {'label': '🏗️ منافسات منصة اعتماد', 'query': 'استعرض منافسات اعتماد وجداول الكميات BOQ'},
            {'label': '✉️ صياغة خطاب عرض فني ومالي', 'query': 'اكتب خطاب رسمي لتقديم عرض فني ومالي لمنافسة حكومية'},
          ];
        default:
          return [
            {'label': '📄 رفع 100 فاتورة / مستند', 'query': 'أريد رفع 100 فاتورة أو مستند PDF وWord وExcel واستخلاصها'},
            {'label': '📊 محاسبة سماك (6 أنظمة)', 'query': 'استعرض نظام سماك المحاسبي والدفاتر المعزولة للشركة'},
            {'label': '🧾 إصدار فاتورة ZATCA', 'query': 'أصدر فاتورة ضريبية جديدة بمبلغ 5000 ريال شاملة الضريبة'},
            {'label': '🧮 حساب نهاية الخدمة', 'query': 'احسب مكافأة نهاية الخدمة لموظف راتبه 8000 ريال وخدمته 6 سنوات'},
            {'label': '✉️ صياغة خطاب رسمي', 'query': 'اكتب خطاب رسمي باسم الشركة'},
          ];
      }
    }

    Map<String, String> generateTopicResponse(String query, String p) {
      final lower = query.toLowerCase();
      final intro = p == 'noura'
          ? 'معكِ "نُورة" المساعدة المؤسسية في نطاق ($compName):'
          : 'معك "فارس" المساعد التنفيذي في نطاق ($compName):';

      // 1. Direct Task: Create Invoice / Journal / Voucher / Contract / CV / Shelter Record
      if (lower.contains('أصدر فاتور') ||
          lower.contains('انشئ فاتور') ||
          lower.contains('سجل قيد') ||
          lower.contains('أنشئ سند') ||
          lower.contains('أنشئ عقد') ||
          lower.contains('سجل سير') ||
          lower.contains('سجل عميل') ||
          lower.contains('افتح تذكر') ||
          lower.contains('تسكين نزيل')) {
        final nowId = 'AI-$compCode-${DateTime.now().millisecondsSinceEpoch % 10000}';
        final isFinance = lower.contains('فاتور') || lower.contains('قيد') || lower.contains('سند');
        final newRec = ErpOperationalRecord(
          id: nowId,
          companyId: compCode == 'GROUP' ? 'SAF' : compCode,
          moduleKey: isFinance ? 'finance' : 'contracts',
          title: 'عملية منفذة عبر المساعد الذكي #$nowId — $query',
          subtitle: 'تم التنفيذ والاعتماد بواسطة $_authenticatedUserName عبر ${p == 'noura' ? 'نُورة' : 'فارس'} • شركة [$compCode]',
          status: 'معتمد ومرحّل',
          badgeText: 'تنفيذ ذكي • $compCode',
          amountOrMetric: isFinance ? '5,750 ⃁ (شامل 15%)' : 'مكتمل 100%',
          updatedAt: 'الآن',
        );
        setState(() {
          _allRecords.insert(0, newRec);
        });
        return {
          'text': '$intro\n'
              '✅ تم تنفيذ مهمتك فوراً وإدراج السجل الرسمي رقم ($nowId) في دفاتر شركة [$compCode]!\n'
              '• البيان: $query\n'
              '• الحالة: معتمد ومرحّل في قاعدة البيانات الحية.',
          'actionLabel': isFinance ? 'معاينة في مركز محاسبة سماك' : 'معاينة السجل في القسم',
          'actionKey': isFinance ? 'smacc-accounting' : _activeDepartment.defaultTab,
        };
      }

      // 2. Direct Task: Saudi Labor Law End-of-Service (EOS) Calculator
      if (lower.contains('نهاية الخدم') || lower.contains('مكافأ') || lower.contains('المادة 84')) {
        return {
          'text': '$intro\n'
              '🧮 حاسبة مستحقات نهاية الخدمة (نظام العمل السعودي - المادتان 84 و85):\n'
              '• الراتب الأساسي مع البدلات الثابتة: 8,000 ⃁ | مدة الخدمة: 6 سنوات\n'
              '• السنوات الخمس الأولى (نصف راتب عن كل سنة): 20,000 ⃁\n'
              '• السنوات التالية (راتب كامل عن كل سنة): 8,000 ⃁\n'
              '• إجمالي الاستحقاق الكامل (انتهاء عقد - مادة 84): 28,000 ⃁\n'
              '• في حال الاستقالة (مادة 85 - ثلثا المكافأة من 5 إلى 10 سنوات): 18,667 ⃁.',
          'actionLabel': 'فتح شاشة نهاية الخدمة والرواتب',
          'actionKey': 'hr',
        };
      }

      // 3. Direct Task: Official Corporate Letter / WhatsApp Message Drafting
      if (lower.contains('اكتب خطاب') ||
          lower.contains('صياغ') ||
          lower.contains('اكتب رسال') ||
          lower.contains('رد رسمي') ||
          lower.contains('تعريف بالراتب')) {
        return {
          'text': '$intro\n'
              '📝 مسودة الخطاب / الرسالة الرسمية الجاهزة للإرسال:\n'
              '━━━━━━━━━━━━━━━━━━━━\n'
              'بسم الله الرحمن الرحيم\n'
              'التاريخ: ${DateTime.now().toString().split(' ').first} | الصادر: $compCode/${DateTime.now().millisecondsSinceEpoch % 1000}\n'
              'السادة الكرام / العميل العزيز حفظه الله\n'
              'السلام عليكم ورحمة الله وبركاته،،\n'
              'تهديكم إدارة ($compName) أطيب التحيات، ونفيدكم بأنه تم إنجاز طلبكم ($query) بنجاح وفق أعلى معايير الجودة والامتثال المؤسسي.\n'
              'وتفضلوا بقبول فائق الاحترام والتقدير،،\n'
              'إدارة $_authenticatedUserName — ${_activeDepartment.nameAr}\n'
              '━━━━━━━━━━━━━━━━━━━━',
          'actionLabel': 'فتح مركز التواصل الموحد والواتساب',
          'actionKey': 'unified-communication',
        };
      }

      if (lower.contains('رفع') ||
          lower.contains('استخلاص') ||
          lower.contains('100') ||
          lower.contains('مستند') ||
          lower.contains('ملف') ||
          lower.contains('pdf') ||
          lower.contains('excel') ||
          lower.contains('word')) {
        return {
          'text': '$intro\n'
              '• يمكنك رفع من فاتورة واحدة وحتى أكثر من 100 صورة فاتورة أو مستندات PDF وWord وExcel وملفات الأنظمة المحاسبية الخارجية دفعة واحدة.\n'
              '• يتعرف المحرك تلقائياً على الصيغة ويستخلص الرقم الضريبي والضريبة 15% والإجمالي ويدرجها في القسم المعني ودفاتر [$compCode].',
          'actionLabel': 'فتح محرك استخلاص المستندات والـ 100 فاتورة',
          'actionKey': 'open-document-extractor',
        };
      }
      if (lower.contains('سماك') ||
          lower.contains('smacc') ||
          lower.contains('محاسب') ||
          lower.contains('قيد') ||
          lower.contains('قبض') ||
          lower.contains('صرف') ||
          lower.contains('ميزان') ||
          lower.contains('رصيد') ||
          lower.contains('مالي')) {
        return {
          'text': '$intro\n'
              '• منظومة المحاسبة في ($compName) تعمل بهيكلة نظام سماك (6 أنظمة متكاملة):\n'
              '  1) المحاسبة المالية والأستاذ العام\n'
              '  2) المبيعات والعملاء\n'
              '  3) المشتريات والموردون\n'
              '  4) المخزون والمستودعات\n'
              '  5) البنوك والصناديق (القبض والصرف)\n'
              '  6) مراكز التكلفة والأصول الثابتة\n'
              '• جميع الدفاتر معزولة كلياً لشركة [$compCode] بإجمالي $totalRecordsCount سجل تشغيلي ومحاسبي نشط.',
          'actionLabel': 'فتح مركز محاسبة سماك (SMACC)',
          'actionKey': 'smacc-accounting',
        };
      }
      if (lower.contains('زكاة') || lower.contains('zatca') || lower.contains('ضريب') || lower.contains('فاتور')) {
        return {
          'text': '$intro\n'
              '• الفوترة الإلكترونية ZATCA المرحلة الثانية (الربط والتكامل) مفعلة بنسبة امتثال 100% لشركة [$compCode] مع ختم تشفير TLV Base64 QR وتوقيع ECDSA.',
          'actionLabel': 'فتح بوابة الفوترة الضريبية ZATCA',
          'actionKey': 'zatca',
        };
      }
      if (lower.contains('مساند') || lower.contains('استقدام') || lower.contains('تأشير') || lower.contains('إنجاز')) {
        return {
          'text': '$intro\n'
              '• قطاع عقود الاستقدام (مساند): 113 عقداً سارياً في مراحل المعالجة والتفويض الإلكتروني عبر إنجاز مع تفعيل بوالص التأمين وفترة الضمان (90 يوماً).',
          'actionLabel': 'فتح عقود استقدام مساند',
          'actionKey': 'recruitment-contracts',
        };
      }
      if (lower.contains('تأجير') || lower.contains('إيجار') || lower.contains('ياقوت') || lower.contains('باقات')) {
        return {
          'text': '$intro\n'
              '• قطاع التأجير والتشغيل المرن: 890+ عقد تشغيلي نشط للأفراد وقطاع الأعمال مع ربط آلي بسندات القبض في نظام سماك.',
          'actionLabel': 'فتح عقود التأجير والتشغيل',
          'actionKey': 'rent-contracts',
        };
      }
      if (lower.contains('إيواء') || lower.contains('سكن') || lower.contains('تسكين') || lower.contains('دار الرواد')) {
        return {
          'text': '$intro\n'
              '• مركز الإيواء والتسكين والرعاية (دار الرواد - مرخص من HRSD): طاقة استيعابية 120 سريراً، نسبة إشغال 42% (28 سريراً متاحاً)، ورعاية صحية وغذائية متكاملة.',
          'actionLabel': 'فتح بوابة مركز الإيواء والتسكين',
          'actionKey': 'shelter',
        };
      }
      if (lower.contains('منافس') || lower.contains('اعتماد') || lower.contains('boq') || lower.contains('كاس')) {
        return {
          'text': '$intro\n'
              '• منظومة منافسات اعتماد وجداول الكميات (KAS BOQ): 2,651+ منافسة مرصودة، مع حساب آلي للبنود وضريبة 15% والتفقيط بالريال السعودي.',
          'actionLabel': 'فتح منظومة منافسات كاس وجداول BOQ',
          'actionKey': 'tenders-boq',
        };
      }
      return {
        'text': '$intro\n'
            '• أنت تعمل حالياً ضمن قسم (${_activeDepartment.nameAr}) في شركة ($compName).\n'
            '• إجمالي السجلات المعزولة في نطاقك: $totalRecordsCount سجل.\n'
            '• يمكنك طلب إصدار فاتورة، قيد يومية، عقد مساند/تأجير، حساب مكافأة نهاية الخدمة، صياغة خطاب رسمي، أو استخلاص 100 فاتورة.',
        'actionLabel': 'فتح ${_activeDepartment.defaultTabTitle}',
        'actionKey': _activeDepartment.defaultTab,
      };
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            void sendQuery(String q) {
              final trimmed = q.trim();
              if (trimmed.isEmpty) return;
              final reply = generateTopicResponse(trimmed, activePersona);
              setModalState(() {
                chatMessages.add({
                  'sender': 'user',
                  'persona': activePersona,
                  'text': trimmed,
                });
                chatMessages.add({
                  'sender': 'advisor',
                  'persona': activePersona,
                  'text': reply['text']!,
                  'actionLabel': reply['actionLabel']!,
                  'actionKey': reply['actionKey']!,
                });
                queryController.clear();
              });
            }

            final quickPrompts = getDepartmentQuickPrompts();

            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
              child: SizedBox(
                height: MediaQuery.of(ctx).size.height * 0.85,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Obsidian Black + Warm Champagne Gold Institutional Header
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1D2428),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
                        border: Border(bottom: BorderSide(color: ErpTokens.champagneGold, width: 1.2)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: ErpTokens.canvasCream,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: ErpTokens.champagneGold, width: 1.5),
                                ),
                                child: Image.asset(
                                  activePersona == 'noura' ? 'assets/noura.png' : 'assets/mascot.png',
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, _, _) => const Icon(Icons.support_agent_rounded, color: ErpTokens.ink),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            activePersona == 'noura'
                                                ? 'نُورة • المستشارة المؤسسية'
                                                : 'فارس • المستشار التنفيذي',
                                            style: const TextStyle(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: ErpTokens.champagneGold,
                                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                          ),
                                          child: Text(
                                            activePersona == 'noura' ? 'نُورة' : 'فارس',
                                            style: const TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w900,
                                              color: ErpTokens.ink,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'مساعد مهام الموظفين: $compName (${_activeDepartment.shortNameAr})',
                                      style: const TextStyle(fontSize: 10.5, color: ErpTokens.goldPale),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: () => Navigator.of(ctx).pop(),
                                icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // Persona Switcher Bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(3),
                                decoration: BoxDecoration(
                                  color: Colors.black54,
                                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                  border: Border.all(color: Colors.white24),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    GestureDetector(
                                      onTap: () {
                                        setModalState(() {
                                          activePersona = 'faris';
                                          chatMessages.add({
                                            'sender': 'advisor',
                                            'persona': 'faris',
                                            'text': buildWelcome('faris'),
                                            'actionLabel': 'فتح منظومة محاسبة سماك (SMACC)',
                                            'actionKey': 'smacc-accounting',
                                          });
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: activePersona == 'faris' ? ErpTokens.champagneGold : Colors.transparent,
                                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                        ),
                                        child: Text(
                                          'فارس (تنفيذي)',
                                          style: TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w900,
                                            color: activePersona == 'faris' ? ErpTokens.ink : Colors.white70,
                                          ),
                                        ),
                                      ),
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        setModalState(() {
                                          activePersona = 'noura';
                                          chatMessages.add({
                                            'sender': 'advisor',
                                            'persona': 'noura',
                                            'text': buildWelcome('noura'),
                                            'actionLabel': 'فتح بوابة مركز الإيواء والتسكين',
                                            'actionKey': 'shelter',
                                          });
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: activePersona == 'noura' ? ErpTokens.champagneGold : Colors.transparent,
                                          borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                        ),
                                        child: Text(
                                          'نُورة (مؤسسي)',
                                          style: TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w900,
                                            color: activePersona == 'noura' ? ErpTokens.ink : Colors.white70,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: ErpTokens.goldPale,
                                  borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                  border: Border.all(color: ErpTokens.champagneGold),
                                ),
                                child: Text(
                                  '🔐 $compCode',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // 1.5 Employee Identity & Daily Task Bar
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: ErpTokens.goldPale,
                        border: Border(bottom: BorderSide(color: ErpTokens.champagneGold.withValues(alpha: 0.5))),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                const Icon(Icons.verified_user_rounded, size: 14, color: ErpTokens.goldDark),
                                const SizedBox(width: 5),
                                Flexible(
                                  child: Text(
                                    '$_authenticatedUserName • ${_activeDepartment.shortNameAr}',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: ErpTokens.ink),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              InkWell(
                                onTap: () {
                                  setModalState(() {
                                    chatMessages.add({
                                      'sender': 'user',
                                      'persona': activePersona,
                                      'text': '📋 أعطني إيجاز مهامي اليومي ومؤشرات قسمي',
                                    });
                                    chatMessages.add({
                                      'sender': 'advisor',
                                      'persona': activePersona,
                                      'text': buildDailyBriefing(activePersona),
                                      'actionLabel': 'فتح ${_activeDepartment.defaultTabTitle}',
                                      'actionKey': _activeDepartment.defaultTab,
                                    });
                                  });
                                },
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: ErpTokens.primary,
                                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                    border: Border.all(color: ErpTokens.champagneGold),
                                  ),
                                  child: const Text(
                                    '📋 إيجاز مهامي',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: ErpTokens.champagneGold),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              InkWell(
                                onTap: () {
                                  Navigator.of(ctx).pop();
                                  _openUniversalDocumentExtractorSheet();
                                },
                                borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                    border: Border.all(color: ErpTokens.champagneGold),
                                  ),
                                  child: const Text(
                                    '📎 مستخرج 100 فاتورة',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // 2. Quick Department Task Playbook Bar
                    Container(
                      height: 44,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: const BoxDecoration(
                        color: ErpTokens.canvasCream,
                        border: Border(bottom: BorderSide(color: ErpTokens.hairlineLight)),
                      ),
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: quickPrompts.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 6),
                        itemBuilder: (_, idx) {
                          final qp = quickPrompts[idx];
                          return Center(
                            child: ActionChip(
                              backgroundColor: Colors.white,
                              side: const BorderSide(color: ErpTokens.hairlineLight),
                              label: Text(
                                qp['label']!,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
                              ),
                              onPressed: () => sendQuery(qp['query']!),
                            ),
                          );
                        },
                      ),
                    ),

                    // 3. Messages List
                    Expanded(
                      child: Container(
                        color: ErpTokens.canvasCream,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(14),
                          itemCount: chatMessages.length,
                          itemBuilder: (_, idx) {
                            final msg = chatMessages[idx];
                            final isUser = msg['sender'] == 'user';
                            final msgPersona = msg['persona'] ?? activePersona;
                            return Align(
                              alignment: isUser ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(12),
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(ctx).size.width * 0.84),
                                decoration: BoxDecoration(
                                  color: isUser ? const Color(0xFF1D2428) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isUser ? ErpTokens.ink : ErpTokens.hairlineLight,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!isUser)
                                      Padding(
                                        padding: const EdgeInsets.only(bottom: 5),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            SizedBox(
                                              width: 18,
                                              height: 18,
                                              child: Image.asset(
                                                msgPersona == 'noura' ? 'assets/noura.png' : 'assets/mascot.png',
                                                fit: BoxFit.contain,
                                              ),
                                            ),
                                            const SizedBox(width: 5),
                                            Text(
                                              msgPersona == 'noura' ? 'نُورة • المستشارة المؤسسية' : 'فارس • المستشار التنفيذي',
                                              style: const TextStyle(
                                                fontSize: 10.5,
                                                fontWeight: FontWeight.w900,
                                                color: ErpTokens.goldDark,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    Text(
                                      msg['text'] ?? '',
                                      style: TextStyle(
                                        fontSize: 12,
                                        height: 1.45,
                                        fontWeight: FontWeight.w600,
                                        color: isUser ? Colors.white : ErpTokens.ink,
                                      ),
                                    ),
                                    if (!isUser && msg['actionKey'] != null) ...[
                                      const SizedBox(height: 8),
                                      InkWell(
                                        onTap: () {
                                          final actionKey = msg['actionKey']!;
                                          final actionLabel = msg['actionLabel'] ?? actionKey;
                                          Navigator.of(ctx).pop();
                                          if (actionKey == 'open-document-extractor') {
                                            _openUniversalDocumentExtractorSheet();
                                          } else {
                                            _handleSelectTab(actionKey, actionLabel);
                                          }
                                        },
                                        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                          decoration: BoxDecoration(
                                            color: ErpTokens.primary,
                                            borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
                                            border: Border.all(color: ErpTokens.champagneGold),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.bolt_rounded, size: 14, color: ErpTokens.champagneGold),
                                              const SizedBox(width: 4),
                                              Flexible(
                                                child: Text(
                                                  msg['actionLabel'] ?? 'انتقال للقسم',
                                                  style: const TextStyle(
                                                    fontSize: 10.5,
                                                    fontWeight: FontWeight.w900,
                                                    color: ErpTokens.champagneGold,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    // 4. Input Bar
                    Container(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        border: Border(top: BorderSide(color: ErpTokens.hairlineLight)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: queryController,
                              onSubmitted: sendQuery,
                              style: const TextStyle(fontSize: 12.5, color: ErpTokens.ink),
                              decoration: InputDecoration(
                                hintText: activePersona == 'noura'
                                    ? 'اكتبي سؤالكِ لنُورة (الإيواء، سماك، رفع 100 فاتورة...)'
                                    : 'اكتب سؤالك لفارس (سماك، ZATCA، مساند، رفع 100 فاتورة...)',
                                hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                                filled: true,
                                fillColor: ErpTokens.canvasCream,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: ErpTokens.hairlineLight),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: ErpTokens.champagneGold, width: 1.5),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => sendQuery(queryController.text),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: ErpTokens.primary,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: ErpTokens.champagneGold),
                              ),
                              child: const Icon(Icons.send_rounded, size: 18, color: ErpTokens.champagneGold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _InstitutionalPillBadge extends StatelessWidget {
  final String emoji;
  final String label;

  const _InstitutionalPillBadge({
    required this.emoji,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: ErpTokens.surfaceSubtle,
        borderRadius: BorderRadius.circular(ErpTokens.radiusPill),
        border: Border.all(color: ErpTokens.hairlineLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: ErpTokens.ink),
          ),
        ],
      ),
    );
  }
}
