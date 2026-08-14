import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/article.dart';
import '../models/blocklist.dart';
import '../models/check_result.dart';
import '../models/flagged_url.dart';
import '../models/quiz_question.dart';
import '../models/report.dart';

/// Error thrown for any failed API call (network, timeout, bad status,
/// malformed body). `message` is safe to show to the user.
class ApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  const ApiException(this.message, {this.code, this.statusCode});

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}

/// Thin typed client over the Antiscammer REST API (see PROJECT_PLAN.md §4).
///
/// The base URL can be overridden at build time:
///   flutter run --dart-define=API_URL=http://192.168.1.10:3000/api
/// Otherwise it defaults to http://localhost:3000/api, except on the Android
/// emulator where the host machine is reachable at 10.0.2.2.
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl, this.timeout = const Duration(seconds: 12)})
      : _http = httpClient ?? http.Client(),
        baseUrl = baseUrl ?? defaultBaseUrl;

  final http.Client _http;
  final String baseUrl;
  final Duration timeout;

  /// Compile-time override via --dart-define=API_URL=...
  static const String _envApiUrl = String.fromEnvironment('API_URL');

  static String get defaultBaseUrl {
    if (_envApiUrl.isNotEmpty) return _envApiUrl;
    // The Android emulator maps the host machine's loopback to 10.0.2.2.
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  // ---------------------------------------------------------------- checkers

  Future<UrlCheckResult> checkUrl(String url) async {
    final json = await _post('/check-url', {'url': url});
    return UrlCheckResult.fromJson(json);
  }

  Future<MessageAnalysisResult> analyzeMessage(String text, {String? sender}) async {
    final json = await _post('/analyze-message', {
      'text': text,
      if (sender != null && sender.trim().isNotEmpty) 'sender': sender.trim(),
    });
    return MessageAnalysisResult.fromJson(json);
  }

  Future<SocialCheckResult> checkSocial(String input) async {
    final json = await _post('/check-social', {'input': input});
    return SocialCheckResult.fromJson(json);
  }

  Future<SenderCheckResult> checkSender(String value) async {
    final json = await _get('/check-sender', {'value': value});
    return SenderCheckResult.fromJson(json);
  }

  // ----------------------------------------------------------------- reports

  Future<List<Report>> searchReports({String? query, String? type, int page = 1}) async {
    final json = await _get('/reports', {
      if (query != null && query.isNotEmpty) 'query': query,
      if (type != null && type.isNotEmpty) 'type': type,
      'page': '$page',
    });
    return [for (final item in _extractList(json)) Report.fromJson(item)];
  }

  Future<Report> submitReport({
    required String type,
    required String value,
    required String description,
    required String scamCategory,
    String? reporterName,
  }) async {
    final json = await _post('/reports', {
      'type': type,
      'value': value,
      'description': description,
      'scamCategory': scamCategory,
      if (reporterName != null && reporterName.isNotEmpty) 'reporterName': reporterName,
    });
    return Report.fromJson(json is Map<String, dynamic> && json['report'] is Map<String, dynamic>
        ? json['report'] as Map<String, dynamic>
        : json);
  }

  Future<ReportStats> fetchStats() async {
    final json = await _get('/reports/stats');
    return ReportStats.fromJson(json);
  }

  Future<List<FlaggedUrl>> fetchFlaggedUrls({int page = 1}) async {
    final json = await _get('/flagged-urls', {'page': '$page'});
    return [for (final item in _extractList(json)) FlaggedUrl.fromJson(item)];
  }

  // -------------------------------------------------------------- protection

  /// `GET /blocklist/phones` — community-reported scam phone numbers, synced
  /// to the device by the real-time protection feature (call screening / SMS).
  Future<PhoneBlocklist> fetchPhoneBlocklist() async {
    final json = await _get('/blocklist/phones');
    if (json is! Map<String, dynamic>) {
      throw const ApiException('Unexpected response shape', code: 'PARSE_ERROR');
    }
    return PhoneBlocklist.fromJson(json);
  }

  // --------------------------------------------------------------- awareness

  Future<List<Article>> fetchArticles() async {
    final json = await _get('/articles');
    return [for (final item in _extractList(json)) Article.fromJson(item)];
  }

  Future<Article> fetchArticle(String slug) async {
    final json = await _get('/articles/${Uri.encodeComponent(slug)}');
    return Article.fromJson(json);
  }

  Future<List<QuizQuestion>> fetchQuiz() async {
    final json = await _get('/quiz');
    return [for (final item in _extractList(json)) QuizQuestion.fromJson(item)];
  }

  // ---------------------------------------------------------------- plumbing

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(baseUrl);
    return base.replace(
      path: '${base.path}$path',
      queryParameters: (query == null || query.isEmpty) ? null : query,
    );
  }

  Future<dynamic> _get(String path, [Map<String, String>? query]) =>
      _send(() => _http.get(_uri(path, query), headers: const {'Accept': 'application/json'}));

  Future<dynamic> _post(String path, Map<String, dynamic> body) => _send(() => _http.post(
        _uri(path),
        headers: const {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode(body),
      ));

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    http.Response response;
    try {
      response = await request().timeout(timeout);
    } on TimeoutException {
      throw const ApiException('Request timed out', code: 'TIMEOUT');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: $e', code: 'NETWORK_ERROR');
    }

    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded is Map<String, dynamic> ? decoded['error'] : null;
      throw ApiException(
        (error is Map<String, dynamic> ? error['message'] as String? : null) ??
            'Request failed with status ${response.statusCode}',
        code: error is Map<String, dynamic> ? error['code'] as String? : null,
        statusCode: response.statusCode,
      );
    }

    if (decoded == null) {
      throw ApiException('Empty or invalid response body', statusCode: response.statusCode);
    }
    return decoded;
  }

  /// Accepts either a bare JSON array or an envelope object such as
  /// `{ "items": [...] }` / `{ "reports": [...] }` / `{ "data": [...] }`,
  /// so the app tolerates reasonable variations of the backend contract.
  List<Map<String, dynamic>> _extractList(dynamic json) {
    dynamic list = json;
    if (json is Map<String, dynamic>) {
      list = json['items'] ??
          json['results'] ??
          json['reports'] ??
          json['articles'] ??
          json['questions'] ??
          json['urls'] ??
          json['data'];
    }
    if (list is! List) {
      throw const ApiException('Unexpected response shape', code: 'PARSE_ERROR');
    }
    return [for (final item in list.whereType<Map<String, dynamic>>()) item];
  }

  void dispose() => _http.close();
}
