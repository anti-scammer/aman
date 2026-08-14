import 'package:flutter/material.dart';

import '../l10n/strings.dart';
import '../models/check_result.dart';

/// Color-coded badge for a sender's trust level (PROJECT_PLAN.md §4.2c):
/// official = green check, reported = red warning with the report count,
/// unknown = neutral "no data — stay cautious".
class SenderTrustBadge extends StatelessWidget {
  const SenderTrustBadge({super.key, required this.sender});

  final SenderCheckResult sender;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final Color color;
    final IconData icon;
    final String label;
    switch (sender.trust) {
      case SenderTrust.official:
        color = const Color(0xFF2E7D32);
        icon = Icons.verified_rounded;
        label = context.tr('trustOfficial');
      case SenderTrust.reported:
        color = const Color(0xFFD32F2F);
        icon = Icons.report_rounded;
        label = context.tr('trustReported', {'count': sender.communityReports});
      case SenderTrust.unknown:
        color = theme.colorScheme.outline;
        icon = Icons.info_outline_rounded;
        label = context.tr('trustUnknown');
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.titleSmall
                      ?.copyWith(color: color, fontWeight: FontWeight.bold),
                ),
                if (sender.normalizedValue.isNotEmpty)
                  Text(
                    sender.normalizedValue,
                    textDirection: TextDirection.ltr,
                    style: theme.textTheme.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
