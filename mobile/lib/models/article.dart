/// Awareness article (`GET /articles`, `GET /articles/:slug`).
class Article {
  final String id;
  final String slug;
  final String titleAr;
  final String titleEn;
  final String summaryAr;
  final String summaryEn;
  final String category;
  final DateTime? createdAt;

  /// Markdown bodies — only present on the detail endpoint.
  final String? bodyAr;
  final String? bodyEn;

  const Article({
    required this.id,
    required this.slug,
    required this.titleAr,
    required this.titleEn,
    required this.summaryAr,
    required this.summaryEn,
    required this.category,
    this.createdAt,
    this.bodyAr,
    this.bodyEn,
  });

  factory Article.fromJson(Map<String, dynamic> json) => Article(
        id: json['id']?.toString() ?? '',
        slug: json['slug'] as String? ?? '',
        titleAr: json['titleAr'] as String? ?? '',
        titleEn: json['titleEn'] as String? ?? '',
        summaryAr: json['summaryAr'] as String? ?? '',
        summaryEn: json['summaryEn'] as String? ?? '',
        category: json['category'] as String? ?? 'OTHER',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
        bodyAr: json['bodyAr'] as String?,
        bodyEn: json['bodyEn'] as String?,
      );

  String title(bool arabic) => arabic
      ? (titleAr.isNotEmpty ? titleAr : titleEn)
      : (titleEn.isNotEmpty ? titleEn : titleAr);

  String summary(bool arabic) => arabic
      ? (summaryAr.isNotEmpty ? summaryAr : summaryEn)
      : (summaryEn.isNotEmpty ? summaryEn : summaryAr);

  String body(bool arabic) => arabic
      ? (bodyAr?.isNotEmpty == true ? bodyAr! : (bodyEn ?? ''))
      : (bodyEn?.isNotEmpty == true ? bodyEn! : (bodyAr ?? ''));
}
