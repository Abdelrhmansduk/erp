import 'hr_direct_mail_types.dart';
import 'hr_direct_mail_client_stub.dart'
    if (dart.library.io) 'hr_direct_mail_client_io.dart' as platform_client;

export 'hr_direct_mail_types.dart';

class HrDirectMailService {
  static const String fromEmail = 'HR@kas.sa';
  static const String mandatoryCcEmail = 'Khalid@kas.sa';
  static const Set<String> excludedKasEmails = {'o.saeed.hospitality@kas.sa'};
  static const String defaultApiBase = String.fromEnvironment(
    'HR_MAIL_API_BASE',
    defaultValue: 'https://kas-erp.vercel.app',
  );

  static String buildOfficialHtml({
    required String subject,
    required String bodyAr,
    required String bodyEn,
  }) {
    String esc(String s) => s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\n', '<br/>');

    return '''
<div style="font-family:'Segoe UI',Arial,sans-serif;color:#141414;line-height:1.6;">
  <div dir="rtl" style="text-align:right;margin-bottom:16px;">
    <h3 style="margin:0 0 8px 0;color:#141414;">${esc(subject)}</h3>
    <p style="margin:0;">${esc(bodyAr)}</p>
  </div>
  <hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;" />
  <div dir="ltr" style="text-align:left;margin-bottom:18px;">
    <p style="margin:0;">${esc(bodyEn)}</p>
  </div>
  <div dir="ltr" style="text-align:left;font-family:'Times New Roman',Times,Georgia,serif;font-size:13.5px;line-height:1.5;color:#141414;">
    <div><strong>Reem Bin Hussain</strong></div>
    <div>International HR &amp; Talent Acquisition Consultant</div>
    <div>Email: HR@kas.sa</div>
    <div>Mobile: +966 553452122</div>
  </div>
</div>
''';
  }

  static String buildOfficialPlainText({
    required String subject,
    required String bodyAr,
    required String bodyEn,
  }) {
    return '''
$subject

$bodyAr

---

$bodyEn

Reem Bin Hussain
International HR & Talent Acquisition Consultant
Email: HR@kas.sa
Mobile: +966 553452122
''';
  }

  static Future<HrDirectMailResult> dispatchOfficialEmail({
    String? apiBaseUrl,
    required String subject,
    required List<String> toEmails,
    required String bodyAr,
    required String bodyEn,
  }) async {
    final sanitizedTo = toEmails
        .map((e) => e.trim())
        .where((e) => e.contains('@') && !excludedKasEmails.contains(e.toLowerCase()))
        .toList();

    if (sanitizedTo.isEmpty) {
      return const HrDirectMailResult(
        ok: false,
        unconfigured: false,
        messageAr: 'لا يوجد بريد مستلم صالح للإرسال (تم استبعاد أي بريد محظور).',
      );
    }

    final base = (apiBaseUrl == null || apiBaseUrl.trim().isEmpty)
        ? defaultApiBase
        : apiBaseUrl.trim();

    return platform_client.sendHrOfficialEmailDirectPlatform(
      endpointBase: base,
      subject: subject,
      toEmails: sanitizedTo,
      ccEmails: const [mandatoryCcEmail],
      htmlBody: buildOfficialHtml(subject: subject, bodyAr: bodyAr, bodyEn: bodyEn),
      plainTextBody: buildOfficialPlainText(
        subject: subject,
        bodyAr: bodyAr,
        bodyEn: bodyEn,
      ),
    );
  }
}
