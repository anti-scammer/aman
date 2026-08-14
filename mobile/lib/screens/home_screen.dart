import 'package:flutter/material.dart';

import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../models/report.dart';
import '../widgets/app_illustration.dart';
import '../widgets/error_retry.dart';

/// Home: intro, community stats (GET /reports/stats) and shortcuts to the
/// other tabs.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onNavigate});

  /// Switch bottom-navigation tab: (tabIndex, optional inner tab index).
  final void Function(int tab, {int innerTab}) onNavigate;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<ReportStats>? _statsFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _statsFuture ??= ApiScope.of(context).fetchStats()..ignore();
  }

  void _reload() {
    final future = ApiScope.of(context).fetchStats()..ignore();
    setState(() {
      _statsFuture = future;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _IntroCard(theme: theme),
          const SizedBox(height: 20),
          Text(
            context.tr('homeStatsTitle'),
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          FutureBuilder<ReportStats>(
            future: _statsFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError || !snapshot.hasData) {
                return ErrorRetry(onRetry: _reload, compact: true);
              }
              return _StatsSection(stats: snapshot.data!);
            },
          ),
          const SizedBox(height: 20),
          Text(
            context.tr('homeShortcuts'),
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.35,
            children: [
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotUrl,
                titleKey: 'shortcutCheckUrl',
                subtitleKey: 'shortcutCheckUrlSub',
                onTap: () => widget.onNavigate(1, innerTab: 0),
              ),
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotMessage,
                titleKey: 'shortcutAnalyzeMsg',
                subtitleKey: 'shortcutAnalyzeMsgSub',
                onTap: () => widget.onNavigate(1, innerTab: 1),
              ),
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotSocial,
                titleKey: 'shortcutCheckSocial',
                subtitleKey: 'shortcutCheckSocialSub',
                onTap: () => widget.onNavigate(1, innerTab: 2),
              ),
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotSender,
                titleKey: 'shortcutCheckSender',
                subtitleKey: 'shortcutCheckSenderSub',
                onTap: () => widget.onNavigate(1, innerTab: 3),
              ),
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotCommunity,
                titleKey: 'shortcutSearchReports',
                subtitleKey: 'shortcutSearchReportsSub',
                onTap: () => widget.onNavigate(2, innerTab: 0),
              ),
              _ShortcutCard(
                illustration: AppIllustrationAsset.spotAwareness,
                titleKey: 'shortcutLearn',
                subtitleKey: 'shortcutLearnSub',
                onTap: () => widget.onNavigate(3),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: theme.colorScheme.primaryContainer,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.shield_rounded, color: theme.colorScheme.primary, size: 34),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('homeIntroTitle'),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Center(
              child: AppIllustration(
                AppIllustrationAsset.hero,
                size: 150,
                semanticLabel: context.tr('homeIntroTitle'),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('homeIntroBody'),
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onPrimaryContainer),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.stats});

  final ReportStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final typeLabels = {
      'PHONE': context.tr('typePhone'),
      'URL': context.tr('typeUrl'),
      'SOCIAL_ACCOUNT': context.tr('typeSocial'),
    };
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.report_rounded, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(context.tr('homeTotalReports'), style: theme.textTheme.bodyLarge),
                const Spacer(),
                Text(
                  '${stats.total}',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
            if (stats.byType.isNotEmpty) ...[
              const Divider(height: 20),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final entry in stats.byType.entries)
                    Chip(
                      visualDensity: VisualDensity.compact,
                      label: Text('${typeLabels[entry.key] ?? entry.key}: ${entry.value}'),
                    ),
                ],
              ),
            ],
            if (stats.byCategory.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final entry in stats.byCategory.entries)
                    Chip(
                      visualDensity: VisualDensity.compact,
                      backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      label: Text('${context.trCategory(entry.key)}: ${entry.value}'),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ShortcutCard extends StatelessWidget {
  const _ShortcutCard({
    required this.illustration,
    required this.titleKey,
    required this.subtitleKey,
    required this.onTap,
  });

  final AppIllustrationAsset illustration;
  final String titleKey;
  final String subtitleKey;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppIllustration(
                illustration,
                size: 52,
                semanticLabel: context.tr(titleKey),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr(titleKey),
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Flexible(
                child: Text(
                  context.tr(subtitleKey),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
