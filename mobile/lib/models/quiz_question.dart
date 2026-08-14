/// A quiz option (`GET /quiz`).
class QuizOption {
  final String id;
  final String textAr;
  final String textEn;

  const QuizOption({required this.id, required this.textAr, required this.textEn});

  factory QuizOption.fromJson(Map<String, dynamic> json) => QuizOption(
        id: json['id']?.toString() ?? '',
        textAr: json['textAr'] as String? ?? '',
        textEn: json['textEn'] as String? ?? '',
      );

  String text(bool arabic) =>
      arabic ? (textAr.isNotEmpty ? textAr : textEn) : (textEn.isNotEmpty ? textEn : textAr);
}

/// A quiz question (`GET /quiz`).
class QuizQuestion {
  final String id;
  final String questionAr;
  final String questionEn;
  final List<QuizOption> options;
  final String correctOptionId;
  final String explanationAr;
  final String explanationEn;

  const QuizQuestion({
    required this.id,
    required this.questionAr,
    required this.questionEn,
    required this.options,
    required this.correctOptionId,
    required this.explanationAr,
    required this.explanationEn,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
        id: json['id']?.toString() ?? '',
        questionAr: json['questionAr'] as String? ?? '',
        questionEn: json['questionEn'] as String? ?? '',
        options: [
          for (final o in (json['options'] as List? ?? const []))
            QuizOption.fromJson(o as Map<String, dynamic>),
        ],
        correctOptionId: json['correctOptionId']?.toString() ?? '',
        explanationAr: json['explanationAr'] as String? ?? '',
        explanationEn: json['explanationEn'] as String? ?? '',
      );

  String question(bool arabic) => arabic
      ? (questionAr.isNotEmpty ? questionAr : questionEn)
      : (questionEn.isNotEmpty ? questionEn : questionAr);

  String explanation(bool arabic) => arabic
      ? (explanationAr.isNotEmpty ? explanationAr : explanationEn)
      : (explanationEn.isNotEmpty ? explanationEn : explanationAr);
}
