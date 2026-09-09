import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../models/check_result.dart';
import '../widgets/app_illustration.dart';
import '../widgets/error_retry.dart';
import '../widgets/glass.dart';
import '../widgets/sender_trust_badge.dart';
import '../widgets/verdict_card.dart';

/// Check tab: URL checker (POST /check-url), message analyzer
/// (POST /analyze-message), social account checker (POST /check-social) and
/// sender/caller checker (GET /check-sender) in four inner tabs.
class CheckScreen extends StatefulWidget {
  const CheckScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  State<CheckScreen> createState() => CheckScreenState();
}

class CheckScreenState extends State<CheckScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this, initialIndex: widget.initialTab);
  }

  /// Used by the app shell when a Home shortcut targets a specific inner tab.
  void switchTab(int index) => _tabController.animateTo(index);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // The tab strip sits directly under the frosted app bar, so it takes
        // the same treatment rather than a flat surface fill.
        GlassBar(
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(icon: const Icon(Icons.link_rounded), text: context.tr('tabUrl')),
              Tab(icon: const Icon(Icons.chat_rounded), text: context.tr('tabMessage')),
              Tab(icon: const Icon(Icons.alternate_email_rounded), text: context.tr('tabSocial')),
              Tab(icon: const Icon(Icons.phone_callback_rounded), text: context.tr('tabSender')),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [
              _UrlCheckerTab(),
              _MessageAnalyzerTab(),
              _SocialCheckerTab(),
              _SenderCheckerTab(),
            ],
          ),
        ),
      ],
    );
  }
}

/// Muted spot illustration shown above a checker tab's input while there is no
/// result yet, so the tab isn't bare before the first check.
class _TabIntro extends StatelessWidget {
  const _TabIntro(this.illustration);

  final AppIllustrationAsset illustration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 20),
      child: Center(
        child: AppIllustration(illustration, size: 120, opacity: 0.9),
      ),
    );
  }
}

class _UrlCheckerTab extends StatefulWidget {
  const _UrlCheckerTab();

  @override
  State<_UrlCheckerTab> createState() => _UrlCheckerTabState();
}

class _UrlCheckerTabState extends State<_UrlCheckerTab>
    with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  bool _loading = false;
  UrlCheckResult? _result;
  bool _failed = false;
  String? _errorDetails;
  String? _fieldError;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final raw = _controller.text.trim();
    if (raw.isEmpty || !raw.contains('.')) {
      setState(() => _fieldError = context.tr('invalidUrl'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _failed = false;
      _fieldError = null;
      _result = null;
    });
    try {
      final result = await ApiScope.of(context).checkUrl(raw);
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _errorDetails = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return ListView(
      padding: barSafeAll(context),
      children: [
        if (_result == null && !_failed)
          const _TabIntro(AppIllustrationAsset.spotUrl),
        TextField(
          controller: _controller,
          keyboardType: TextInputType.url,
          textDirection: TextDirection.ltr,
          decoration: InputDecoration(
            labelText: context.tr('urlLabel'),
            hintText: context.tr('urlHint'),
            hintTextDirection: TextDirection.ltr,
            errorText: _fieldError,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.link_rounded),
          ),
          onSubmitted: (_) => _check(),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _check,
          icon: _loading
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.security_rounded),
          label: Text(context.tr('checkButton')),
        ),
        const SizedBox(height: 16),
        if (_failed) ErrorRetry(onRetry: _check, details: _errorDetails, compact: true),
        if (_result != null)
          VerdictCard(
            verdict: _result!.verdict,
            score: _result!.score,
            reasons: _result!.reasons,
            subtitle: _result!.url,
            footer: Row(
              children: [
                const Icon(Icons.people_alt_rounded, size: 18),
                const SizedBox(width: 6),
                Text('${context.tr('communityReports')}: ${_result!.communityReports}'),
              ],
            ),
          ),
      ],
    );
  }
}

class _MessageAnalyzerTab extends StatefulWidget {
  const _MessageAnalyzerTab();

  @override
  State<_MessageAnalyzerTab> createState() => _MessageAnalyzerTabState();
}

class _MessageAnalyzerTabState extends State<_MessageAnalyzerTab>
    with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  final _senderController = TextEditingController();
  bool _loading = false;
  MessageAnalysisResult? _result;
  bool _failed = false;
  String? _errorDetails;
  String? _fieldError;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    _senderController.dispose();
    super.dispose();
  }

  Future<void> _analyze() async {
    final text = _controller.text.trim();
    final sender = _senderController.text.trim();
    if (text.isEmpty) {
      setState(() => _fieldError = context.tr('emptyMessage'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _failed = false;
      _fieldError = null;
      _result = null;
    });
    try {
      final result = await ApiScope.of(context)
          .analyzeMessage(text, sender: sender.isEmpty ? null : sender);
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _errorDetails = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final theme = Theme.of(context);
    return ListView(
      padding: barSafeAll(context),
      children: [
        if (_result == null && !_failed)
          const _TabIntro(AppIllustrationAsset.spotMessage),
        TextField(
          controller: _controller,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: context.tr('messageLabel'),
            hintText: context.tr('messageHint'),
            errorText: _fieldError,
            border: const OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _senderController,
          decoration: InputDecoration(
            labelText: context.tr('messageSenderLabel'),
            hintText: context.tr('messageSenderHint'),
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.person_outline_rounded),
          ),
          onSubmitted: (_) => _analyze(),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _analyze,
          icon: _loading
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.manage_search_rounded),
          label: Text(context.tr('analyzeButton')),
        ),
        const SizedBox(height: 16),
        if (_failed) ErrorRetry(onRetry: _analyze, details: _errorDetails, compact: true),
        if (_result?.sender != null) ...[
          SenderTrustBadge(sender: _result!.sender!),
          const SizedBox(height: 10),
        ],
        if (_result != null)
          VerdictCard(
            verdict: _result!.verdict,
            score: _result!.score,
            reasons: _result!.reasons,
            footer: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_result!.categories.isNotEmpty) ...[
                  Text(
                    context.tr('matchedCategories'),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final c in _result!.categories)
                        Chip(
                          visualDensity: VisualDensity.compact,
                          label: Text(context.trCategory(c)),
                        ),
                    ],
                  ),
                ],
                if (_result!.extractedUrls.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    context.tr('extractedUrls'),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  for (final u in _result!.extractedUrls)
                    Text(
                      u,
                      textDirection: TextDirection.ltr,
                      style: theme.textTheme.bodySmall?.copyWith(fontFamily: 'monospace'),
                    ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _SocialCheckerTab extends StatefulWidget {
  const _SocialCheckerTab();

  @override
  State<_SocialCheckerTab> createState() => _SocialCheckerTabState();
}

class _SocialCheckerTabState extends State<_SocialCheckerTab>
    with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  bool _loading = false;
  SocialCheckResult? _result;
  bool _failed = false;
  String? _errorDetails;
  String? _fieldError;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final input = _controller.text.trim();
    if (input.isEmpty) {
      setState(() => _fieldError = context.tr('emptySocial'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _failed = false;
      _fieldError = null;
      _result = null;
    });
    try {
      final result = await ApiScope.of(context).checkSocial(input);
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _errorDetails = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final theme = Theme.of(context);
    return ListView(
      padding: barSafeAll(context),
      children: [
        if (_result == null && !_failed)
          const _TabIntro(AppIllustrationAsset.spotSocial),
        TextField(
          controller: _controller,
          keyboardType: TextInputType.url,
          textDirection: TextDirection.ltr,
          decoration: InputDecoration(
            labelText: context.tr('socialLabel'),
            hintText: context.tr('socialHint'),
            hintTextDirection: TextDirection.ltr,
            errorText: _fieldError,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.alternate_email_rounded),
          ),
          onSubmitted: (_) => _check(),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _check,
          icon: _loading
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.person_search_rounded),
          label: Text(context.tr('checkSocialButton')),
        ),
        const SizedBox(height: 16),
        if (_failed) ErrorRetry(onRetry: _check, details: _errorDetails, compact: true),
        if (_result != null)
          VerdictCard(
            verdict: _result!.verdict,
            score: _result!.score,
            reasons: _result!.reasons,
            subtitle: _result!.input,
            footer: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    Chip(
                      visualDensity: VisualDensity.compact,
                      avatar: Icon(Icons.public_rounded,
                          size: 16, color: theme.colorScheme.primary),
                      label: Text(
                          '${context.tr('platformLabel')}: ${context.trPlatform(_result!.platform)}'),
                    ),
                    if (_result!.handle.isNotEmpty)
                      Chip(
                        visualDensity: VisualDensity.compact,
                        avatar: Icon(Icons.alternate_email_rounded,
                            size: 16, color: theme.colorScheme.primary),
                        label: Text('${context.tr('handleLabel')}: ${_result!.handle}',
                            textDirection: TextDirection.ltr),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.people_alt_rounded, size: 18),
                    const SizedBox(width: 6),
                    Text('${context.tr('communityReports')}: ${_result!.communityReports}'),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _SenderCheckerTab extends StatefulWidget {
  const _SenderCheckerTab();

  @override
  State<_SenderCheckerTab> createState() => _SenderCheckerTabState();
}

class _SenderCheckerTabState extends State<_SenderCheckerTab>
    with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  bool _loading = false;
  SenderCheckResult? _result;
  bool _failed = false;
  String? _errorDetails;
  String? _fieldError;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final value = _controller.text.trim();
    if (value.isEmpty) {
      setState(() => _fieldError = context.tr('emptySender'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _failed = false;
      _fieldError = null;
      _result = null;
    });
    try {
      final result = await ApiScope.of(context).checkSender(value);
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _errorDetails = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final theme = Theme.of(context);
    final isArabic = context.isArabic;
    return ListView(
      padding: barSafeAll(context),
      children: [
        if (_result == null && !_failed)
          const _TabIntro(AppIllustrationAsset.spotSender),
        TextField(
          controller: _controller,
          textDirection: TextDirection.ltr,
          decoration: InputDecoration(
            labelText: context.tr('senderLabel'),
            hintText: context.tr('senderHint'),
            hintTextDirection: TextDirection.ltr,
            errorText: _fieldError,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.phone_callback_rounded),
          ),
          onSubmitted: (_) => _check(),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _check,
          icon: _loading
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.contact_phone_rounded),
          label: Text(context.tr('checkSenderButton')),
        ),
        const SizedBox(height: 16),
        if (_failed) ErrorRetry(onRetry: _check, details: _errorDetails, compact: true),
        if (_result != null) ...[
          SenderTrustBadge(sender: _result!),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('reasonsTitle'),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  if (_result!.reasons.isEmpty)
                    Text(context.tr('noReasons'), style: theme.textTheme.bodyMedium)
                  else
                    ..._result!.reasons.map(
                      (r) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.circle, size: 7, color: theme.colorScheme.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(r.localized(isArabic),
                                  style: theme.textTheme.bodyMedium),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const Divider(height: 20),
                  Row(
                    children: [
                      const Icon(Icons.people_alt_rounded, size: 18),
                      const SizedBox(width: 6),
                      Text('${context.tr('communityReports')}: ${_result!.communityReports}'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
