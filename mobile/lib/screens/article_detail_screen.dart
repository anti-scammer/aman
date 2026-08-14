import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../models/article.dart';
import '../widgets/error_retry.dart';

/// Full awareness article, body rendered as markdown (bodyAr / bodyEn
/// depending on the current locale).
class ArticleDetailScreen extends StatefulWidget {
  const ArticleDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  State<ArticleDetailScreen> createState() => _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends State<ArticleDetailScreen> {
  Future<Article>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= ApiScope.of(context).fetchArticle(widget.slug);
  }

  void _reload() {
    final future = ApiScope.of(context).fetchArticle(widget.slug)..ignore();
    setState(() {
      _future = future;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = context.isArabic;
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('learnTitle'))),
      body: FutureBuilder<Article>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return ErrorRetry(onRetry: _reload);
          }
          final article = snapshot.data!;
          final theme = Theme.of(context);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                article.title(isArabic),
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                context.trCategory(article.category),
                style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary),
              ),
              const Divider(height: 24),
              MarkdownBody(
                data: article.body(isArabic),
                styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                  p: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
