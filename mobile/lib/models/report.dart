/// A community scam report (`GET /reports`, `POST /reports`).
class Report {
  final String id;
  final String type; // PHONE | URL | SOCIAL_ACCOUNT
  final String value;
  final String description;
  final String scamCategory;
  final String? reporterName;
  final String status; // PENDING | APPROVED | REJECTED
  final DateTime? createdAt;

  const Report({
    required this.id,
    required this.type,
    required this.value,
    required this.description,
    required this.scamCategory,
    this.reporterName,
    required this.status,
    this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) => Report(
        id: json['id']?.toString() ?? '',
        type: json['type'] as String? ?? 'OTHER',
        value: json['value'] as String? ?? '',
        description: json['description'] as String? ?? '',
        scamCategory: json['scamCategory'] as String? ?? 'OTHER',
        reporterName: json['reporterName'] as String?,
        status: json['status'] as String? ?? 'PENDING',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}

/// `GET /reports/stats`.
class ReportStats {
  final int total;
  final Map<String, int> byType;
  final Map<String, int> byCategory;

  const ReportStats({required this.total, required this.byType, required this.byCategory});

  factory ReportStats.fromJson(Map<String, dynamic> json) => ReportStats(
        total: (json['total'] as num?)?.round() ?? 0,
        byType: _intMap(json['byType']),
        byCategory: _intMap(json['byCategory']),
      );

  static Map<String, int> _intMap(dynamic raw) {
    if (raw is! Map) return const {};
    return raw.map((k, v) => MapEntry(k.toString(), (v as num?)?.round() ?? 0));
  }
}
