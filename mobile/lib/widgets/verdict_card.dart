import 'package:flutter/material.dart';

import '../l10n/strings.dart';
import '../theme.dart';
import '../models/verdict.dart';

/// Colors/icon/label for a [Verdict]: safe = green, suspicious = amber,
/// dangerous = red (per PROJECT_PLAN.md §7).
class VerdictStyle {
  final Color color;
  final IconData icon;
  final String labelKey;

  const VerdictStyle._(this.color, this.icon, this.labelKey);

  factory VerdictStyle.of(Verdict verdict) {
    switch (verdict) {
      case Verdict.safe:
        return const VerdictStyle._(Color(0xFF2E7D32), Icons.verified_user_rounded, 'verdictSafe');
      case Verdict.suspicious:
        return const VerdictStyle._(
            Color(0xFFF59E0B), Icons.warning_amber_rounded, 'verdictSuspicious');
      case Verdict.dangerous:
        return const VerdictStyle._(Color(0xFFD32F2F), Icons.dangerous_rounded, 'verdictDangerous');
    }
  }
}

/// Small colored chip showing a verdict label.
class VerdictChip extends StatelessWidget {
  const VerdictChip({super.key, required this.verdict});

  final Verdict verdict;

  @override
  Widget build(BuildContext context) {
    final style = VerdictStyle.of(verdict);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: style.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: style.color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 16, color: style.color),
          const SizedBox(width: 4),
          Text(
            context.tr(style.labelKey),
            style: TextStyle(color: style.color, fontWeight: FontWeight.w600, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

/// Color-coded result card for the URL checker and message analyzer:
/// verdict banner, 0–100 risk score bar, and localized reasons.
class VerdictCard extends StatelessWidget {
  const VerdictCard({
    super.key,
    required this.verdict,
    required this.score,
    required this.reasons,
    this.subtitle,
    this.footer,
  });

  final Verdict verdict;
  final int score;
  final List<Reason> reasons;

  /// e.g. the checked URL.
  final String? subtitle;

  /// Extra content below the reasons (categories, extracted URLs, ...).
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = VerdictStyle.of(verdict);
    final isArabic = context.isArabic;

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AmanGlass.radius),
        side: BorderSide(color: style.color.withValues(alpha: 0.6), width: 1.4),
      ),
      color: Color.alphaBlend(
        style.color.withValues(alpha: 0.1),
        AmanGlass.face(theme.brightness),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(style.icon, color: style.color, size: 34),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr(style.labelKey),
                        style: theme.textTheme.titleLarge
                            ?.copyWith(color: style.color, fontWeight: FontWeight.bold),
                      ),
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textDirection: TextDirection.ltr,
                        ),
                    ],
                  ),
                ),
                Text(
                  '$score',
                  style: theme.textTheme.headlineMedium
                      ?.copyWith(color: style.color, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text('${context.tr('riskScore')} ', style: theme.textTheme.bodySmall),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: (score.clamp(0, 100)) / 100,
                      minHeight: 8,
                      color: style.color,
                      backgroundColor: style.color.withValues(alpha: 0.15),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text('$score/100', style: theme.textTheme.bodySmall),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('reasonsTitle'),
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            if (reasons.isEmpty)
              Text(context.tr('noReasons'), style: theme.textTheme.bodyMedium)
            else
              ...reasons.map(
                (r) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.circle, size: 7, color: style.color),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(r.localized(isArabic), style: theme.textTheme.bodyMedium),
                      ),
                    ],
                  ),
                ),
              ),
            if (footer != null) ...[const SizedBox(height: 10), footer!],
          ],
        ),
      ),
    );
  }
}
