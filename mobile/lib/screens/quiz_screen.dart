import 'package:flutter/material.dart';

import '../api/api_scope.dart';
import '../l10n/strings.dart';
import '../theme.dart';
import '../models/quiz_question.dart';
import '../widgets/error_retry.dart';

/// Interactive awareness quiz: one question at a time, instant feedback with
/// an explanation, and a final score screen.
class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  Future<List<QuizQuestion>>? _future;
  int _index = 0;
  int _score = 0;
  String? _selectedOptionId;
  bool _finished = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= ApiScope.of(context).fetchQuiz();
  }

  void _reload() {
    final future = ApiScope.of(context).fetchQuiz()..ignore();
    setState(() {
      _future = future;
    });
  }

  void _restart() {
    setState(() {
      _index = 0;
      _score = 0;
      _selectedOptionId = null;
      _finished = false;
    });
  }

  void _select(QuizQuestion question, String optionId) {
    if (_selectedOptionId != null) return; // already answered
    setState(() {
      _selectedOptionId = optionId;
      if (optionId == question.correctOptionId) _score++;
    });
  }

  void _next(int total) {
    setState(() {
      if (_index + 1 >= total) {
        _finished = true;
      } else {
        _index++;
        _selectedOptionId = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('quizTitle'))),
      body: FutureBuilder<List<QuizQuestion>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return ErrorRetry(onRetry: _reload);
          }
          final questions = snapshot.data!;
          if (questions.isEmpty) {
            return Center(child: Text(context.tr('quizEmpty')));
          }
          if (_finished) return _ResultView(score: _score, total: questions.length, onRestart: _restart);
          return _QuestionView(
            question: questions[_index],
            index: _index,
            total: questions.length,
            selectedOptionId: _selectedOptionId,
            onSelect: (id) => _select(questions[_index], id),
            onNext: () => _next(questions.length),
          );
        },
      ),
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({
    required this.question,
    required this.index,
    required this.total,
    required this.selectedOptionId,
    required this.onSelect,
    required this.onNext,
  });

  final QuizQuestion question;
  final int index;
  final int total;
  final String? selectedOptionId;
  final ValueChanged<String> onSelect;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isArabic = context.isArabic;
    final answered = selectedOptionId != null;
    final isCorrect = selectedOptionId == question.correctOptionId;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          context.tr('questionOf', {'current': index + 1, 'total': total}),
          style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary),
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: (index + (answered ? 1 : 0)) / total,
          minHeight: 6,
          borderRadius: BorderRadius.circular(999),
        ),
        const SizedBox(height: 16),
        Text(
          question.question(isArabic),
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        for (final option in question.options)
          _OptionTile(
            text: option.text(isArabic),
            state: !answered
                ? _OptionState.idle
                : option.id == question.correctOptionId
                    ? _OptionState.correct
                    : option.id == selectedOptionId
                        ? _OptionState.wrong
                        : _OptionState.disabled,
            onTap: answered ? null : () => onSelect(option.id),
          ),
        if (answered) ...[
          const SizedBox(height: 12),
          Card(
            color: Color.alphaBlend(
              (isCorrect ? const Color(0xFF2E7D32) : const Color(0xFFD32F2F))
                  .withValues(alpha: 0.12),
              AmanGlass.face(Theme.of(context).brightness),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                        color: isCorrect ? const Color(0xFF2E7D32) : const Color(0xFFD32F2F),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        context.tr(isCorrect ? 'correct' : 'wrong'),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isCorrect ? const Color(0xFF2E7D32) : const Color(0xFFD32F2F),
                        ),
                      ),
                    ],
                  ),
                  if (question.explanation(isArabic).isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(question.explanation(isArabic), style: theme.textTheme.bodyMedium),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onNext,
            icon: const Icon(Icons.arrow_forward_rounded),
            label: Text(context.tr(index + 1 >= total ? 'showResult' : 'next')),
          ),
        ],
      ],
    );
  }
}

enum _OptionState { idle, correct, wrong, disabled }

class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.text, required this.state, this.onTap});

  final String text;
  final _OptionState state;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Color? borderColor;
    Color? tileColor;
    IconData? icon;
    switch (state) {
      case _OptionState.correct:
        borderColor = const Color(0xFF2E7D32);
        tileColor = const Color(0xFF2E7D32).withValues(alpha: 0.08);
        icon = Icons.check_circle_rounded;
      case _OptionState.wrong:
        borderColor = const Color(0xFFD32F2F);
        tileColor = const Color(0xFFD32F2F).withValues(alpha: 0.08);
        icon = Icons.cancel_rounded;
      case _OptionState.idle:
      case _OptionState.disabled:
        borderColor = theme.colorScheme.outlineVariant;
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: tileColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AmanGlass.radius),
        side: BorderSide(color: borderColor),
      ),
      child: ListTile(
        onTap: onTap,
        title: Text(text),
        trailing: icon != null ? Icon(icon, color: borderColor) : null,
        enabled: state != _OptionState.disabled,
      ),
    );
  }
}

class _ResultView extends StatelessWidget {
  const _ResultView({required this.score, required this.total, required this.onRestart});

  final int score;
  final int total;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ratio = total == 0 ? 0.0 : score / total;
    final feedbackKey = ratio >= 0.99 ? 'quizPerfect' : (ratio >= 0.6 ? 'quizGood' : 'quizBad');
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              ratio >= 0.6 ? Icons.emoji_events_rounded : Icons.school_rounded,
              size: 72,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 12),
            Text(
              context.tr('quizResultTitle'),
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              context.tr('quizScore', {'score': score, 'total': total}),
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(context.tr(feedbackKey),
                style: theme.textTheme.bodyMedium, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRestart,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(context.tr('restartQuiz')),
            ),
          ],
        ),
      ),
    );
  }
}
