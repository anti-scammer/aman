import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../models/flagged_url.dart';
import '../models/report.dart';
import '../widgets/app_illustration.dart';
import '../widgets/error_retry.dart';
import '../widgets/verdict_card.dart';

const List<String> kReportTypes = ['PHONE', 'URL', 'SOCIAL_ACCOUNT'];
const List<String> kScamCategories = [
  'PRIZE_SCAM',
  'DELIVERY_SCAM',
  'JOB_SCAM',
  'BANK_PHISHING',
  'OTP_THEFT',
  'FAKE_SHOP',
  'CHARITY_SCAM',
  'CRYPTO_SCAM',
  'OTHER',
];

String _typeLabel(BuildContext context, String type) {
  switch (type) {
    case 'PHONE':
      return context.tr('typePhone');
    case 'URL':
      return context.tr('typeUrl');
    case 'SOCIAL_ACCOUNT':
      return context.tr('typeSocial');
    default:
      return type;
  }
}

IconData _typeIcon(String type) {
  switch (type) {
    case 'PHONE':
      return Icons.phone_rounded;
    case 'URL':
      return Icons.link_rounded;
    case 'SOCIAL_ACCOUNT':
      return Icons.alternate_email_rounded;
    default:
      return Icons.report_rounded;
  }
}

/// Reports tab: search reports, submit a report, and the flagged links feed.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  State<ReportsScreen> createState() => ReportsScreenState();
}

class ReportsScreenState extends State<ReportsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialTab);
  }

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
        Material(
          color: Theme.of(context).colorScheme.surface,
          child: TabBar(
            controller: _tabController,
            tabs: [
              Tab(icon: const Icon(Icons.search_rounded), text: context.tr('tabSearch')),
              Tab(icon: const Icon(Icons.flag_rounded), text: context.tr('tabSubmit')),
              Tab(icon: const Icon(Icons.gpp_bad_rounded), text: context.tr('tabFlagged')),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [_SearchTab(), _SubmitTab(), _FlaggedTab()],
          ),
        ),
      ],
    );
  }
}

// ------------------------------------------------------------------- search

class _SearchTab extends StatefulWidget {
  const _SearchTab();

  @override
  State<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<_SearchTab> with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  String _type = '';
  bool _loading = false;
  bool _failed = false;
  String? _errorDetails;
  List<Report>? _results;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final results = await ApiScope.of(context).searchReports(
        query: _controller.text.trim(),
        type: _type.isEmpty ? null : _type,
      );
      if (!mounted) return;
      setState(() => _results = results);
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
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            hintText: context.tr('searchHint'),
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.search_rounded),
          ),
          onSubmitted: (_) => _search(),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: InputDecoration(
                  labelText: context.tr('reportType'),
                  border: const OutlineInputBorder(),
                  isDense: true,
                ),
                items: [
                  DropdownMenuItem(value: '', child: Text(context.tr('typeAll'))),
                  for (final t in kReportTypes)
                    DropdownMenuItem(value: t, child: Text(_typeLabel(context, t))),
                ],
                onChanged: (v) => setState(() => _type = v ?? ''),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _loading ? null : _search,
              icon: _loading
                  ? const SizedBox(
                      width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.search_rounded),
              label: Text(context.tr('searchButton')),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_failed)
          ErrorRetry(onRetry: _search, details: _errorDetails, compact: true)
        else if (_results == null)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const AppIllustration(AppIllustrationAsset.emptySearch, size: 130),
                const SizedBox(height: 8),
                Text(
                  context.tr('searchPrompt'),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.outline),
                ),
              ],
            ),
          )
        else if (_results!.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const AppIllustration(AppIllustrationAsset.emptySearch, size: 130),
                const SizedBox(height: 8),
                Text(
                  context.tr('searchEmpty'),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          )
        else
          ...(_results!.map((r) => _ReportTile(report: r))),
      ],
    );
  }
}

class _ReportTile extends StatelessWidget {
  const _ReportTile({required this.report});

  final Report report;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.errorContainer,
          child: Icon(_typeIcon(report.type), color: theme.colorScheme.onErrorContainer, size: 20),
        ),
        title: Text(report.value, textDirection: TextDirection.ltr),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (report.description.isNotEmpty)
              Text(report.description, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              children: [
                Chip(
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  label: Text(_typeLabel(context, report.type),
                      style: theme.textTheme.labelSmall),
                ),
                Chip(
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  label: Text(context.trCategory(report.scamCategory),
                      style: theme.textTheme.labelSmall),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------- submit

class _SubmitTab extends StatefulWidget {
  const _SubmitTab();

  @override
  State<_SubmitTab> createState() => _SubmitTabState();
}

class _SubmitTabState extends State<_SubmitTab> with AutomaticKeepAliveClientMixin {
  final _formKey = GlobalKey<FormState>();
  final _valueController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _nameController = TextEditingController();
  String _type = 'PHONE';
  String _category = 'PRIZE_SCAM';
  bool _submitting = false;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _valueController.dispose();
    _descriptionController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final successText = context.tr('reportSubmitted');
    final errorTitle = context.tr('errorTitle');
    try {
      await ApiScope.of(context).submitReport(
        type: _type,
        value: _valueController.text.trim(),
        description: _descriptionController.text.trim(),
        scamCategory: _category,
        reporterName: _nameController.text.trim(),
      );
      if (!mounted) return;
      _valueController.clear();
      _descriptionController.clear();
      messenger.showSnackBar(SnackBar(content: Text(successText)));
    } on ApiException catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text('$errorTitle — ${e.message}')));
    } catch (_) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(errorTitle)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: InputDecoration(
              labelText: context.tr('reportType'),
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final t in kReportTypes)
                DropdownMenuItem(value: t, child: Text(_typeLabel(context, t))),
            ],
            onChanged: (v) => setState(() => _type = v ?? 'PHONE'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _valueController,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              labelText: context.tr('reportValue'),
              border: const OutlineInputBorder(),
              prefixIcon: Icon(_typeIcon(_type)),
            ),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? context.tr('requiredField') : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _descriptionController,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: context.tr('reportDescription'),
              border: const OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? context.tr('requiredField') : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: InputDecoration(
              labelText: context.tr('reportCategory'),
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final c in kScamCategories)
                DropdownMenuItem(value: c, child: Text(context.trCategory(c))),
            ],
            onChanged: (v) => setState(() => _category = v ?? 'OTHER'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: context.tr('reporterName'),
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(
                    width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.send_rounded),
            label: Text(context.tr('submitReport')),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------------ flagged

class _FlaggedTab extends StatefulWidget {
  const _FlaggedTab();

  @override
  State<_FlaggedTab> createState() => _FlaggedTabState();
}

class _FlaggedTabState extends State<_FlaggedTab> with AutomaticKeepAliveClientMixin {
  Future<List<FlaggedUrl>>? _future;

  @override
  bool get wantKeepAlive => true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= ApiScope.of(context).fetchFlaggedUrls();
  }

  void _reload() {
    final future = ApiScope.of(context).fetchFlaggedUrls()..ignore();
    setState(() {
      _future = future;
    });
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '—';
    final local = date.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final theme = Theme.of(context);
    return FutureBuilder<List<FlaggedUrl>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return ErrorRetry(onRetry: _reload);
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppIllustration(AppIllustrationAsset.emptySearch, size: 130),
                const SizedBox(height: 8),
                Text(context.tr('flaggedEmpty')),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => _reload(),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: theme.colorScheme.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.url,
                              textDirection: TextDirection.ltr,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyLarge
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 8),
                          VerdictChip(verdict: item.verdict),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          Text(
                            '${context.tr('riskScore')}: ${item.score}',
                            style: theme.textTheme.bodySmall,
                          ),
                          Text(
                            '${context.tr('timesChecked')}: ${item.timesChecked}',
                            style: theme.textTheme.bodySmall,
                          ),
                          Text(
                            '${context.tr('lastSeen')}: ${_formatDate(item.lastSeenAt)}',
                            style: theme.textTheme.bodySmall,
                          ),
                          Text(
                            item.source == 'report'
                                ? context.tr('sourceReport')
                                : context.tr('sourceCheck'),
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: theme.colorScheme.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
