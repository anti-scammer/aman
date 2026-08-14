import 'package:flutter/material.dart';

import '../l10n/strings.dart';

/// Friendly error state with a retry button. Shown whenever an API call
/// fails (e.g. the backend is offline) — the app must never crash.
class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.onRetry, this.details, this.compact = false});

  final VoidCallback onRetry;
  final String? details;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.cloud_off_rounded, size: compact ? 36 : 56, color: theme.colorScheme.outline),
        const SizedBox(height: 12),
        Text(
          context.tr('errorTitle'),
          style: theme.textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          context.tr('errorBody'),
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
          textAlign: TextAlign.center,
        ),
        if (details != null && details!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            details!,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
        const SizedBox(height: 12),
        FilledButton.tonalIcon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: Text(context.tr('retry')),
        ),
      ],
    );

    return Center(
      child: Padding(padding: const EdgeInsets.all(24), child: content),
    );
  }
}
