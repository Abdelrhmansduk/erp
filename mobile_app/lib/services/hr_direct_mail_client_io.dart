import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'hr_direct_mail_types.dart';

Future<HrDirectMailResult> sendHrOfficialEmailDirectPlatform({
  required String endpointBase,
  required List<String> ccEmails,
  required String htmlBody,
  required String plainTextBody,
  required String subject,
  required List<String> toEmails,
}) async {
  final normalizedBase = endpointBase.trim().replaceAll(RegExp(r'/+$'), '');
  final uri = Uri.tryParse('$normalizedBase/api/hr-email-send');
  if (uri == null || !uri.hasScheme) {
    return const HrDirectMailResult(
      ok: false,
      unconfigured: true,
      messageAr: 'عنوان خادم الإرسال المباشر غير صالح — يرجى تحديد رابط الخادم.',
    );
  }

  final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
  try {
    final request = await client.postUrl(uri).timeout(const Duration(seconds: 15));
    request.headers.contentType = ContentType.json;
    request.write(
      jsonEncode({
        'subject': subject,
        'toEmails': toEmails,
        'ccEmails': ccEmails,
        'htmlBody': htmlBody,
        'cidHtmlBody': htmlBody,
        'plainTextBody': plainTextBody,
      }),
    );

    final response = await request.close().timeout(const Duration(seconds: 20));
    final bodyStr = await utf8.decoder.bind(response).join();

    Map<String, dynamic> decoded = const {};
    if (bodyStr.trim().isNotEmpty) {
      final parsed = jsonDecode(bodyStr);
      if (parsed is Map<String, dynamic>) {
        decoded = parsed;
      }
    }

    if (response.statusCode >= 200 &&
        response.statusCode < 300 &&
        decoded['ok'] == true) {
      return HrDirectMailResult(
        ok: true,
        unconfigured: false,
        provider: decoded['provider']?.toString(),
        messageId: decoded['messageId']?.toString(),
        messageAr:
            'تم الإرسال المباشر من HR@kas.sa عبر ${decoded['provider'] ?? 'SMTP'} بنسخة إلى ${ccEmails.join(', ')}',
      );
    }

    final isUnconfigured =
        response.statusCode == 428 ||
        response.statusCode == 404 ||
        decoded['code'] == 'MAIL_GATEWAY_NOT_CONFIGURED';

    return HrDirectMailResult(
      ok: false,
      unconfigured: isUnconfigured,
      messageAr: decoded['errorAr']?.toString() ??
          (isUnconfigured
              ? 'بوابة البريد المباشر غير مفعّلة بعد على الخادم (HTTP ${response.statusCode}).'
              : 'تعذر إرسال البريد المباشر (HTTP ${response.statusCode}).'),
    );
  } on SocketException catch (err) {
    return HrDirectMailResult(
      ok: false,
      unconfigured: true,
      messageAr: 'تعذر الوصول إلى خادم البريد ($normalizedBase): ${err.message}',
    );
  } on TimeoutException {
    return const HrDirectMailResult(
      ok: false,
      unconfigured: true,
      messageAr: 'انتهت مهلة الاتصال بخادم الإرسال المباشر — تحقق من الخادم.',
    );
  } catch (err) {
    return HrDirectMailResult(
      ok: false,
      unconfigured: false,
      messageAr: 'خطأ في إرسال البريد المباشر: $err',
    );
  } finally {
    client.close(force: true);
  }
}
