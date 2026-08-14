import 'package:flutter/material.dart';

import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../services/protection_service.dart';
import '../widgets/app_illustration.dart';

/// Real-time protection tab (Android only).
///
/// Shows a consent/explainer card (what is monitored — everything stays on
/// the device), status cards for the call-screening role, the overlay
/// permission and the SMS permission, a "sync blocklist now" card with the
/// entry count + last sync time, and a demo "test overlay" button. On iOS
/// (and any non-Android platform) the whole tab gracefully explains that the
/// feature is not supported.
class ProtectionScreen extends StatefulWidget {
  const ProtectionScreen({super.key, this.service});

  /// Injectable for tests; defaults to the app-wide singleton.
  final ProtectionService? service;

  @override
  State<ProtectionScreen> createState() => _ProtectionScreenState();
}

class _ProtectionScreenState extends State<ProtectionScreen>
    with WidgetsBindingObserver {
  late final ProtectionService _service = widget.service ?? ProtectionService.instance;

  bool? _supported; // null while loading
  bool _roleGranted = false;
  bool _overlayGranted = false;
  bool _smsGranted = false;
  BlocklistInfo? _info;
  bool _syncing = false;
  bool _syncFailed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Register the native → Dart SMS handler with the current API client.
    _service.attach(ApiScope.of(context));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // The overlay permission is granted in system settings; re-check when the
    // user comes back to the app.
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final supported = await _service.isSupported();
    var role = false, overlay = false, sms = false;
    BlocklistInfo? info;
    if (supported) {
      role = await _service.hasCallScreeningRole();
      overlay = await _service.hasOverlayPermission();
      sms = await _service.hasSmsPermission();
      info = await _service.blocklistInfo();
    }
    if (!mounted) return;
    setState(() {
      _supported = supported;
      _roleGranted = role;
      _overlayGranted = overlay;
      _smsGranted = sms;
      _info = info ?? _info;
    });
  }

  Future<void> _sync() async {
    final api = ApiScope.of(context);
    setState(() {
      _syncing = true;
      _syncFailed = false;
    });
    try {
      final info = await _service.syncBlocklist(api);
      if (!mounted) return;
      setState(() {
        _info = info;
        _syncing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _syncing = false;
        _syncFailed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final supported = _supported;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _ConsentCard(theme: theme),
        const SizedBox(height: 12),
        // While the platform answer is pending render nothing extra: a spinner
        // here would animate forever if the platform never responds (and would
        // hang pumpAndSettle in widget tests).
        if (supported == null)
          const SizedBox.shrink()
        else if (!supported)
          _UnsupportedCard(theme: theme)
        else ...[
          _StatusTile(
            icon: Icons.phone_callback_rounded,
            titleKey: 'protCallScreening',
            subtitleKey: 'protCallScreeningSub',
            granted: _roleGranted,
            onEnable: () async {
              await _service.requestCallScreeningRole();
              await _refresh();
            },
          ),
          _StatusTile(
            icon: Icons.layers_rounded,
            titleKey: 'protOverlay',
            subtitleKey: 'protOverlaySub',
            granted: _overlayGranted,
            onEnable: () async {
              await _service.requestOverlayPermission();
              await _refresh();
            },
          ),
          _StatusTile(
            icon: Icons.sms_rounded,
            titleKey: 'protSms',
            subtitleKey: 'protSmsSub',
            granted: _smsGranted,
            onEnable: () async {
              await _service.requestSmsPermission();
              await _refresh();
            },
          ),
          const SizedBox(height: 12),
          _syncCard(theme),
          const SizedBox(height: 12),
          _testCard(theme),
        ],
      ],
    );
  }

  Widget _syncCard(ThemeData theme) {
    final info = _info;
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
                Icon(Icons.cloud_download_rounded, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr('protSyncTitle'),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              context.tr('protSyncSub'),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
            ),
            const SizedBox(height: 8),
            if (info != null && info.count > 0)
              Text(
                context.tr('protEntriesCount', {'count': info.count}),
                style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            Text(
              info?.syncedAt != null
                  ? context.tr('protLastSync', {'time': _formatTime(info!.syncedAt!)})
                  : context.tr('protNeverSynced'),
              style: theme.textTheme.bodySmall,
            ),
            if (_syncFailed) ...[
              const SizedBox(height: 4),
              Text(
                context.tr('protSyncFailed'),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
              ),
            ],
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _syncing ? null : _sync,
              icon: _syncing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.sync_rounded, size: 18),
              label: Text(context.tr(_syncing ? 'protSyncing' : 'protSyncNow')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _testCard(ThemeData theme) {
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
                Icon(Icons.notification_important_rounded, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr('protTestTitle'),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              context.tr('protTestSub'),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _service.showTestOverlay(),
              icon: const Icon(Icons.warning_amber_rounded, size: 18),
              label: Text(context.tr('protTestButton')),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatTime(DateTime dt) {
    final l = dt.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${l.year}-${two(l.month)}-${two(l.day)} ${two(l.hour)}:${two(l.minute)}';
  }
}

/// Consent / explainer: what is monitored, everything stays on the device.
/// Shown in the current locale with the other language beneath it, so the
/// disclosure is always readable in both Arabic and English.
class _ConsentCard extends StatelessWidget {
  const _ConsentCard({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final otherLang = context.isArabic ? 'en' : 'ar';
    final otherBody = kStrings[otherLang]?['protConsentBody'] ?? '';
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
                Icon(Icons.shield_rounded, color: theme.colorScheme.primary, size: 30),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('protConsentTitle'),
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
                AppIllustrationAsset.protection,
                size: 120,
                semanticLabel: context.tr('protConsentTitle'),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('protConsentBody'),
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onPrimaryContainer),
            ),
            const SizedBox(height: 8),
            Text(
              otherBody,
              textDirection: otherLang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.75),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnsupportedCard extends StatelessWidget {
  const _UnsupportedCard({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
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
                Icon(Icons.phone_iphone_rounded, color: theme.colorScheme.outline),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr('protUnsupportedTitle'),
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(context.tr('protUnsupportedBody'), style: theme.textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _StatusTile extends StatelessWidget {
  const _StatusTile({
    required this.icon,
    required this.titleKey,
    required this.subtitleKey,
    required this.granted,
    required this.onEnable,
  });

  final IconData icon;
  final String titleKey;
  final String subtitleKey;
  final bool granted;
  final VoidCallback onEnable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(icon,
                color: granted ? theme.colorScheme.primary : theme.colorScheme.outline),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr(titleKey),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    context.tr(subtitleKey),
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (granted)
              Chip(
                visualDensity: VisualDensity.compact,
                avatar: Icon(Icons.check_circle_rounded,
                    size: 18, color: theme.colorScheme.primary),
                label: Text(context.tr('protEnabled')),
              )
            else
              FilledButton.tonal(
                onPressed: onEnable,
                child: Text(context.tr('protEnable')),
              ),
          ],
        ),
      ),
    );
  }
}
