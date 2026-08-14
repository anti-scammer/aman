import 'package:flutter/material.dart';

import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../models/article.dart';
import '../widgets/app_illustration.dart';
import '../widgets/error_retry.dart';
import 'article_detail_screen.dart';
import 'quiz_screen.dart';

/// Learn tab: awareness articles list + entry point to the quiz.
class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  Future<List<Article>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= ApiScope.of(context).fetchArticles();
  }

  void _reload() {
    final future = ApiScope.of(context).fetchArticles()..ignore();
    setState(() {
      _future = future;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isArabic = context.isArabic;
    return FutureBuilder<List<Article>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return ErrorRetry(onRetry: _reload);
        }
        final articles = snapshot.data!;
        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: AppIllustration(
                  AppIllustrationAsset.spotAwareness,
                  size: 130,
                  semanticLabel: context.tr('learnTitle'),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                elevation: 0,
                color: theme.colorScheme.tertiaryContainer,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  leading: Icon(Icons.quiz_rounded, color: theme.colorScheme.onTertiaryContainer),
                  title: Text(
                    context.tr('startQuiz'),
                    style: TextStyle(
                      color: theme.colorScheme.onTertiaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  trailing: Icon(Icons.arrow_forward_ios_rounded,
                      size: 16, color: theme.colorScheme.onTertiaryContainer),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const QuizScreen()),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (articles.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppIllustration(
                          AppIllustrationAsset.spotAwareness,
                          size: 120,
                        ),
                        const SizedBox(height: 8),
                        Text(context.tr('articlesEmpty')),
                      ],
                    ),
                  ),
                )
              else
                for (final article in articles)
                  Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: theme.colorScheme.outlineVariant),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: theme.colorScheme.primaryContainer,
                        child: Icon(Icons.article_rounded,
                            color: theme.colorScheme.onPrimaryContainer, size: 20),
                      ),
                      title: Text(
                        article.title(isArabic),
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            article.summary(isArabic),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            context.trCategory(article.category),
                            style: theme.textTheme.labelSmall
                                ?.copyWith(color: theme.colorScheme.primary),
                          ),
                        ],
                      ),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ArticleDetailScreen(slug: article.slug),
                        ),
                      ),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}
