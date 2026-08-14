/// Risk verdict shared by the URL checker and the message analyzer.
enum Verdict {
  safe,
  suspicious,
  dangerous;

  static Verdict parse(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'safe':
        return Verdict.safe;
      case 'suspicious':
        return Verdict.suspicious;
      case 'dangerous':
        return Verdict.dangerous;
      default:
        return Verdict.suspicious;
    }
  }
}

/// A localized reason returned by the analysis engines.
class Reason {
  final String code;
  final String message; // Arabic
  final String messageEn; // English

  const Reason({required this.code, required this.message, required this.messageEn});

  factory Reason.fromJson(Map<String, dynamic> json) => Reason(
        code: json['code'] as String? ?? '',
        message: json['message'] as String? ?? '',
        messageEn: json['messageEn'] as String? ?? json['message'] as String? ?? '',
      );

  /// The reason text for the requested language, falling back to the other.
  String localized(bool arabic) {
    if (arabic) return message.isNotEmpty ? message : messageEn;
    return messageEn.isNotEmpty ? messageEn : message;
  }
}
