import 'hr_direct_mail_types.dart';

Future<HrDirectMailResult> sendHrOfficialEmailDirectPlatform({
  required String endpointBase,
  required String subject,
  required List<String> toEmails,
  required List<String> ccEmails,
  required String htmlBody,
  required String plainTextBody,
}) async {
  return const HrDirectMailResult(
    ok: false,
    unconfigured: true,
    messageAr:
        'تعذر الإرسال عبر HTTP المباشر في هذه المنصة — يتطلب الإرسال الصامت خادم Node/Vercel مفعل.',
  );
}
