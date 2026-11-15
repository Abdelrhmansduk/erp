class HrDirectMailResult {
  final bool ok;
  final bool unconfigured;
  final String? provider;
  final String? messageId;
  final String messageAr;

  const HrDirectMailResult({
    required this.ok,
    required this.unconfigured,
    this.provider,
    this.messageId,
    required this.messageAr,
  });
}
