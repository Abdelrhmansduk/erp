import 'dart:convert';
import 'dart:io';

/// Live Supabase REST & Edge ESS Sync Service for Khalid Al-Sulaim ERP Mobile.
/// Reads configuration strictly from `--dart-define=SUPABASE_URL=...` and
/// `--dart-define=SUPABASE_ANON_KEY=...` (zero hardcoded credentials).
class SupabaseEssSyncResult {
  const SupabaseEssSyncResult({
    required this.syncedFromCloud,
    required this.pendingApprovalsCount,
    required this.activeCardsCount,
    required this.activeAlertsCount,
    required this.statusLabel,
  });

  final bool syncedFromCloud;
  final int pendingApprovalsCount;
  final int activeCardsCount;
  final int activeAlertsCount;
  final String statusLabel;
}

class SupabaseEssSyncService {
  static const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String _supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static bool get isConfigured => _supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty;

  static Future<SupabaseEssSyncResult> fetchEmployeeEssSnapshot(String companyId) async {
    if (!isConfigured) {
      return const SupabaseEssSyncResult(
        syncedFromCloud: false,
        pendingApprovalsCount: 0,
        activeCardsCount: 0,
        activeAlertsCount: 0,
        statusLabel: 'وضع محلي نشط — البيانات المضافة من قبلك فقط (بدون محاكاة)',
      );
    }

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 6);
    try {
      final base = _supabaseUrl.replaceAll(RegExp(r'/+$'), '');
      Future<List<dynamic>> fetchTable(String table) async {
        final uri = Uri.parse('$base/rest/v1/$table?company_id=eq.$companyId&select=id&limit=50');
        final req = await client.getUrl(uri);
        req.headers.set('apikey', _supabaseAnonKey);
        req.headers.set('Authorization', 'Bearer $_supabaseAnonKey');
        final res = await req.close();
        if (res.statusCode < 200 || res.statusCode >= 300) return <dynamic>[];
        final body = await res.transform(utf8.decoder).join();
        final decoded = jsonDecode(body);
        return decoded is List ? decoded : <dynamic>[];
      }

      final results = await Future.wait([
        fetchTable('hr_approval_requests'),
        fetchTable('hr_corporate_cards'),
        fetchTable('hr_smart_alerts'),
      ]);

      return SupabaseEssSyncResult(
        syncedFromCloud: true,
        pendingApprovalsCount: results[0].length,
        activeCardsCount: results[1].length,
        activeAlertsCount: results[2].length,
        statusLabel:
            'مزامنة Supabase حية ✓ (${results[0].length} طلبات • ${results[1].length} بطاقات)',
      );
    } catch (_) {
      return const SupabaseEssSyncResult(
        syncedFromCloud: false,
        pendingApprovalsCount: 0,
        activeCardsCount: 0,
        activeAlertsCount: 0,
        statusLabel: 'تعذر الوصول للشبكة — يعمل بوضع التخزين المحلي الآمن (بدون محاكاة)',
      );
    } finally {
      client.close(force: true);
    }
  }

  static Future<bool> pushMobileEssAction(
    String table,
    Map<String, dynamic> payload,
  ) async {
    if (!isConfigured) return false;
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 6);
    try {
      final base = _supabaseUrl.replaceAll(RegExp(r'/+$'), '');
      final uri = Uri.parse('$base/rest/v1/$table');
      final req = await client.postUrl(uri);
      req.headers.set('apikey', _supabaseAnonKey);
      req.headers.set('Authorization', 'Bearer $_supabaseAnonKey');
      req.headers.set('Content-Type', 'application/json');
      req.headers.set('Prefer', 'return=minimal');
      req.write(jsonEncode(payload));
      final res = await req.close();
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    } finally {
      client.close(force: true);
    }
  }
}
