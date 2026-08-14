import 'verdict.dart';

/// Result of `POST /check-url`.
class UrlCheckResult {
  final String url;
  final Verdict verdict;
  final int score;
  final List<Reason> reasons;
  final int communityReports;

  const UrlCheckResult({
    required this.url,
    required this.verdict,
    required this.score,
    required this.reasons,
    required this.communityReports,
  });

  factory UrlCheckResult.fromJson(Map<String, dynamic> json) => UrlCheckResult(
        url: json['url'] as String? ?? '',
        verdict: Verdict.parse(json['verdict'] as String?),
        score: (json['score'] as num?)?.round() ?? 0,
        reasons: [
          for (final r in (json['reasons'] as List? ?? const []))
            Reason.fromJson(r as Map<String, dynamic>),
        ],
        communityReports: (json['communityReports'] as num?)?.round() ?? 0,
      );
}

/// Result of `POST /analyze-message`.
class MessageAnalysisResult {
  final Verdict verdict;
  final int score;
  final List<String> categories;
  final List<Reason> reasons;
  final List<String> extractedUrls;

  /// Sender check info, present when the request included a `sender`.
  final SenderCheckResult? sender;

  const MessageAnalysisResult({
    required this.verdict,
    required this.score,
    required this.categories,
    required this.reasons,
    required this.extractedUrls,
    this.sender,
  });

  factory MessageAnalysisResult.fromJson(Map<String, dynamic> json) => MessageAnalysisResult(
        verdict: Verdict.parse(json['verdict'] as String?),
        score: (json['score'] as num?)?.round() ?? 0,
        categories: [for (final c in (json['categories'] as List? ?? const [])) c.toString()],
        reasons: [
          for (final r in (json['reasons'] as List? ?? const []))
            Reason.fromJson(r as Map<String, dynamic>),
        ],
        extractedUrls: [
          for (final u in (json['extractedUrls'] as List? ?? const [])) u.toString(),
        ],
        sender: json['sender'] is Map<String, dynamic>
            ? SenderCheckResult.fromJson(json['sender'] as Map<String, dynamic>)
            : null,
      );
}

/// Result of `POST /check-social` (PROJECT_PLAN.md §4.2b).
class SocialCheckResult {
  final String input;
  final String platform; // FACEBOOK | INSTAGRAM | TIKTOK | TELEGRAM | X | WHATSAPP | UNKNOWN
  final String handle;
  final Verdict verdict;
  final int score;
  final List<Reason> reasons;
  final int communityReports;

  const SocialCheckResult({
    required this.input,
    required this.platform,
    required this.handle,
    required this.verdict,
    required this.score,
    required this.reasons,
    required this.communityReports,
  });

  factory SocialCheckResult.fromJson(Map<String, dynamic> json) => SocialCheckResult(
        input: json['input'] as String? ?? '',
        platform: json['platform'] as String? ?? 'UNKNOWN',
        handle: json['handle'] as String? ?? '',
        verdict: Verdict.parse(json['verdict'] as String?),
        score: (json['score'] as num?)?.round() ?? 0,
        reasons: [
          for (final r in (json['reasons'] as List? ?? const []))
            Reason.fromJson(r as Map<String, dynamic>),
        ],
        communityReports: (json['communityReports'] as num?)?.round() ?? 0,
      );
}

/// Trust level of a sender ID / phone number (PROJECT_PLAN.md §4.2c).
enum SenderTrust {
  official,
  reported,
  unknown;

  static SenderTrust parse(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'official':
        return SenderTrust.official;
      case 'reported':
        return SenderTrust.reported;
      default:
        return SenderTrust.unknown;
    }
  }
}

/// Result of `GET /check-sender` — also embedded in [MessageAnalysisResult]
/// when a sender was provided to the message analyzer.
class SenderCheckResult {
  final String value;
  final String normalizedValue;
  final String type; // PHONE | SENDER_ID
  final SenderTrust trust;
  final Verdict verdict;
  final int score;
  final int communityReports;
  final List<Reason> reasons;

  const SenderCheckResult({
    required this.value,
    required this.normalizedValue,
    required this.type,
    required this.trust,
    required this.verdict,
    required this.score,
    required this.communityReports,
    required this.reasons,
  });

  factory SenderCheckResult.fromJson(Map<String, dynamic> json) => SenderCheckResult(
        value: json['value'] as String? ?? '',
        normalizedValue: json['normalizedValue'] as String? ?? json['value'] as String? ?? '',
        type: json['type'] as String? ?? 'SENDER_ID',
        trust: SenderTrust.parse(json['trust'] as String?),
        verdict: Verdict.parse(json['verdict'] as String?),
        score: (json['score'] as num?)?.round() ?? 0,
        communityReports: (json['communityReports'] as num?)?.round() ?? 0,
        reasons: [
          for (final r in (json['reasons'] as List? ?? const []))
            Reason.fromJson(r as Map<String, dynamic>),
        ],
      );
}
