import 'verdict.dart';

/// An item of the flagged links feed (`GET /flagged-urls`).
class FlaggedUrl {
  final String url;
  final Verdict verdict;
  final int score;
  final int timesChecked;
  final DateTime? lastSeenAt;
  final String source; // "check" | "report"

  const FlaggedUrl({
    required this.url,
    required this.verdict,
    required this.score,
    required this.timesChecked,
    this.lastSeenAt,
    required this.source,
  });

  factory FlaggedUrl.fromJson(Map<String, dynamic> json) => FlaggedUrl(
        url: json['url'] as String? ?? '',
        verdict: Verdict.parse(json['verdict'] as String?),
        score: (json['score'] as num?)?.round() ?? 0,
        timesChecked: (json['timesChecked'] as num?)?.round() ?? 0,
        lastSeenAt: DateTime.tryParse(json['lastSeenAt']?.toString() ?? ''),
        source: json['source'] as String? ?? 'check',
      );
}
