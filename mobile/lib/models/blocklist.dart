/// Models for `GET /blocklist/phones` — community-reported scam phone numbers
/// synced to the device so the native Android side (call screening service +
/// SMS receiver) can match callers/senders fully offline.
class BlocklistEntry {
  final String number;
  final int reports;
  final String category;

  const BlocklistEntry({
    required this.number,
    required this.reports,
    required this.category,
  });

  factory BlocklistEntry.fromJson(Map<String, dynamic> json) => BlocklistEntry(
        number: json['number'] as String? ?? '',
        reports: (json['reports'] as num?)?.round() ?? 0,
        category: json['category'] as String? ?? 'OTHER',
      );

  Map<String, dynamic> toJson() =>
      {'number': number, 'reports': reports, 'category': category};
}

/// `{updatedAt, count, entries: [...]}` envelope of `GET /blocklist/phones`.
class PhoneBlocklist {
  final DateTime? updatedAt;
  final int count;
  final List<BlocklistEntry> entries;

  const PhoneBlocklist({this.updatedAt, required this.count, required this.entries});

  factory PhoneBlocklist.fromJson(Map<String, dynamic> json) {
    final raw = json['entries'];
    final entries = [
      for (final item in (raw is List ? raw : const []).whereType<Map<String, dynamic>>())
        BlocklistEntry.fromJson(item),
    ];
    return PhoneBlocklist(
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
      count: (json['count'] as num?)?.round() ?? entries.length,
      entries: entries,
    );
  }
}
