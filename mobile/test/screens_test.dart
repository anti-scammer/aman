import 'dart:convert';

import 'package:antiscammer/api/api_client.dart';
import 'package:antiscammer/main.dart';
import 'package:antiscammer/models/blocklist.dart';
import 'package:antiscammer/screens/home_screen.dart';
import 'package:antiscammer/screens/protection_screen.dart';
import 'package:antiscammer/services/protection_service.dart';
import 'package:antiscammer/widgets/error_retry.dart';
import 'package:antiscammer/widgets/sender_trust_badge.dart';
import 'package:antiscammer/widgets/verdict_card.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// Pumps the app on a tall phone-sized surface so full screens fit.
Future<void> pumpApp(WidgetTester tester, ApiClient api) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(AntiscammerApp(api: api));
  await tester.pumpAndSettle();
}

/// Taps a bottom-navigation destination by its label (labels can also appear
/// elsewhere on screen, e.g. as Home shortcuts).
Future<void> tapNav(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(of: find.byType(NavigationBar), matching: find.text(label)),
  );
  await tester.pumpAndSettle();
}

/// Taps an inner (sub-tab) label inside the current screen's TabBar,
/// scrolling it into view first (the check TabBar is scrollable).
Future<void> tapInnerTab(WidgetTester tester, String label) async {
  final tab = find.descendant(of: find.byType(TabBar), matching: find.text(label));
  await tester.ensureVisible(tab);
  await tester.pumpAndSettle();
  await tester.tap(tab);
  await tester.pumpAndSettle();
}

/// Finds a [TextField] by its decoration label.
Finder fieldWithLabel(String label) => find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.labelText == label);

/// API client whose every request fails, simulating an offline backend.
ApiClient offlineApi() => ApiClient(
      baseUrl: 'http://localhost:3000/api',
      httpClient: MockClient((_) async => throw http.ClientException('connection refused')),
    );

/// API client backed by canned JSON fixtures for every endpoint.
ApiClient fixtureApi() => ApiClient(
      baseUrl: 'http://localhost:3000/api',
      httpClient: MockClient((request) async {
        final path = request.url.path;
        Object? body;
        if (path.endsWith('/reports/stats')) {
          body = {
            'total': 42,
            'byType': {'PHONE': 20, 'URL': 15, 'SOCIAL_ACCOUNT': 7},
            'byCategory': {'PRIZE_SCAM': 12, 'BANK_PHISHING': 9},
          };
        } else if (path.endsWith('/check-url')) {
          body = {
            'url': 'https://jawwal-prize.win/claim',
            'verdict': 'dangerous',
            'score': 82,
            'reasons': [
              {
                'code': 'BRAND_LOOKALIKE',
                'message': 'يشبه اسم علامة تجارية فلسطينية (جوال)',
                'messageEn': 'Resembles a Palestinian brand (Jawwal)',
              }
            ],
            'communityReports': 3,
          };
        } else if (path.endsWith('/analyze-message')) {
          final req = jsonDecode(request.body) as Map<String, dynamic>;
          final sender = req['sender'] as String?;
          if (sender != null) {
            // Sender-aware analysis (§4.2c): official sender but the message
            // asks for an OTP, so the reduction is skipped and a
            // SPOOFING_WARNING reason is added.
            body = {
              'verdict': 'dangerous',
              'score': 85,
              'categories': ['OTP_THEFT'],
              'reasons': [
                {
                  'code': 'OTP_REQUEST',
                  'message': 'الرسالة تطلب رمز تحقق',
                  'messageEn': 'The message asks for an OTP code',
                },
                {
                  'code': 'SPOOFING_WARNING',
                  'message': 'تحذير: قد يكون اسم المُرسِل منتحلًا',
                  'messageEn': 'Warning: the sender ID may be spoofed',
                },
              ],
              'extractedUrls': [],
              'sender': {
                'value': sender,
                'normalizedValue': sender,
                'type': 'SENDER_ID',
                'trust': 'official',
                'verdict': 'safe',
                'score': 0,
                'communityReports': 0,
                'reasons': [
                  {
                    'code': 'OFFICIAL_SENDER',
                    'message': 'مُرسِل رسمي معروف',
                    'messageEn': 'Known official sender',
                  }
                ],
              },
            };
          } else {
            body = {
              'verdict': 'suspicious',
              'score': 55,
              'categories': ['PRIZE_SCAM'],
              'reasons': [
                {'code': 'PRIZE', 'message': 'رسالة جائزة وهمية', 'messageEn': 'Fake prize message'}
              ],
              'extractedUrls': ['bit.ly/xy'],
            };
          }
        } else if (path.endsWith('/check-social')) {
          body = {
            'input': 'facebook.com/jawwal.prizes2026',
            'platform': 'FACEBOOK',
            'handle': 'jawwal.prizes2026',
            'verdict': 'dangerous',
            'score': 75,
            'reasons': [
              {
                'code': 'BRAND_IMPERSONATION',
                'message': 'ينتحل علامة تجارية فلسطينية (جوال)',
                'messageEn': 'Impersonates a Palestinian brand (Jawwal)',
              }
            ],
            'communityReports': 2,
          };
        } else if (path.endsWith('/check-sender')) {
          final value = request.url.queryParameters['value'] ?? '';
          if (value == 'JAWWAL') {
            body = {
              'value': value,
              'normalizedValue': 'JAWWAL',
              'type': 'SENDER_ID',
              'trust': 'official',
              'verdict': 'safe',
              'score': 0,
              'communityReports': 0,
              'reasons': [
                {
                  'code': 'OFFICIAL_SENDER',
                  'message': 'مُرسِل رسمي معروف',
                  'messageEn': 'Known official sender',
                }
              ],
            };
          } else if (value == '+970599000000') {
            body = {
              'value': value,
              'normalizedValue': '+970599000000',
              'type': 'PHONE',
              'trust': 'reported',
              'verdict': 'dangerous',
              'score': 80,
              'communityReports': 3,
              'reasons': [
                {
                  'code': 'REPORTED_SENDER',
                  'message': 'رقم مُبلّغ عنه في بلاغات معتمدة',
                  'messageEn': 'Number appears in approved reports',
                }
              ],
            };
          } else {
            body = {
              'value': value,
              'normalizedValue': value,
              'type': 'SENDER_ID',
              'trust': 'unknown',
              'verdict': 'safe',
              'score': 0,
              'communityReports': 0,
              'reasons': [
                {
                  'code': 'UNKNOWN_SENDER',
                  'message': 'لا توجد بيانات عن هذا المُرسِل',
                  'messageEn': 'No data about this sender',
                }
              ],
            };
          }
        } else if (path.endsWith('/blocklist/phones')) {
          body = {
            'updatedAt': '2026-07-01T10:00:00Z',
            'count': 2,
            'entries': [
              {'number': '+970599123456', 'reports': 5, 'category': 'PRIZE_SCAM'},
              {'number': '+970568111222', 'reports': 2, 'category': 'BANK_PHISHING'},
            ],
          };
        } else if (path.endsWith('/flagged-urls')) {
          body = [
            {
              'url': 'https://bank-palestine-login.top',
              'verdict': 'dangerous',
              'score': 91,
              'timesChecked': 14,
              'lastSeenAt': '2026-07-01T10:00:00Z',
              'source': 'check',
            }
          ];
        } else if (path.contains('/articles/')) {
          body = {
            'id': '1',
            'slug': 'prize-scams',
            'titleAr': 'كيف تكشف احتيال الجوائز',
            'titleEn': 'How to spot prize scams',
            'summaryAr': 'ملخص',
            'summaryEn': 'Summary',
            'category': 'PRIZE_SCAM',
            'bodyAr': '# مقدمة\nلا تدفع رسومًا لاستلام جائزة.',
            'bodyEn': '# Intro\nNever pay a fee to claim a prize.',
          };
        } else if (path.endsWith('/articles')) {
          body = [
            {
              'id': '1',
              'slug': 'prize-scams',
              'titleAr': 'كيف تكشف احتيال الجوائز',
              'titleEn': 'How to spot prize scams',
              'summaryAr': 'تعرف على رسائل الجوائز الوهمية',
              'summaryEn': 'Learn about fake prize messages',
              'category': 'PRIZE_SCAM',
              'createdAt': '2026-06-01T00:00:00Z',
            }
          ];
        } else if (path.endsWith('/quiz')) {
          body = [
            {
              'id': 'q1',
              'questionAr': 'ماذا تفعل عند استلام رسالة جائزة؟',
              'questionEn': 'What do you do when you receive a prize message?',
              'options': [
                {'id': 'a', 'textAr': 'أدفع الرسوم', 'textEn': 'Pay the fee'},
                {'id': 'b', 'textAr': 'أتجاهلها وأبلغ عنها', 'textEn': 'Ignore and report it'},
              ],
              'correctOptionId': 'b',
              'explanationAr': 'الجوائز الحقيقية لا تطلب رسومًا.',
              'explanationEn': 'Real prizes never ask for fees.',
            }
          ];
        } else if (path.endsWith('/reports') && request.method == 'GET') {
          body = {
            'items': [
              {
                'id': 'r1',
                'type': 'PHONE',
                'value': '+970599000000',
                'description': 'اتصال احتيالي يدعي جائزة',
                'scamCategory': 'PRIZE_SCAM',
                'status': 'APPROVED',
                'createdAt': '2026-06-20T00:00:00Z',
              }
            ],
          };
        } else if (path.endsWith('/reports') && request.method == 'POST') {
          body = {
            'id': 'r2',
            'type': 'PHONE',
            'value': '+970599111111',
            'description': 'test',
            'scamCategory': 'OTHER',
            'status': 'PENDING',
          };
        }
        if (body == null) {
          return http.Response(
            jsonEncode({
              'error': {'code': 'NOT_FOUND', 'message': 'Not found'}
            }),
            404,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode(body),
          request.method == 'POST' && path.endsWith('/reports') ? 201 : 200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

void main() {
  testWidgets('app renders home with bottom navigation even when API is offline',
      (tester) async {
    await pumpApp(tester, offlineApi());

    // Bottom navigation destinations (Arabic is the default locale).
    final navBar = find.byType(NavigationBar);
    for (final label in ['الرئيسية', 'الفحص', 'البلاغات', 'التوعية']) {
      expect(find.descendant(of: navBar, matching: find.text(label)), findsOneWidget);
    }

    // Stats failed to load -> a retry-able error widget on Home, not a crash.
    final homeError = find.descendant(of: find.byType(HomeScreen), matching: find.byType(ErrorRetry));
    expect(homeError, findsOneWidget);
    expect(tester.takeException(), isNull);

    // Retrying still fails gracefully.
    await tester.tap(
      find.descendant(of: homeError, matching: find.text('إعادة المحاولة')),
    );
    await tester.pumpAndSettle();
    expect(homeError, findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home shows stats from the API', (tester) async {
    await pumpApp(tester, fixtureApi());

    expect(find.text('إحصائيات البلاغات'), findsOneWidget);
    expect(find.text('42'), findsOneWidget);
  });

  testWidgets('URL checker shows a color-coded verdict card', (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'الفحص');

    await tester.enterText(find.byType(TextField).first, 'https://jawwal-prize.win/claim');
    await tester.tap(find.text('افحص الرابط'));
    await tester.pumpAndSettle();

    expect(find.byType(VerdictCard), findsOneWidget);
    expect(find.text('خطير'), findsOneWidget); // dangerous
    expect(find.text('يشبه اسم علامة تجارية فلسطينية (جوال)'), findsOneWidget);
    expect(find.textContaining('82'), findsWidgets);
  });

  testWidgets('URL checker shows retry-able error when the API is offline', (tester) async {
    await pumpApp(tester, offlineApi());

    await tapNav(tester, 'الفحص');

    await tester.enterText(find.byType(TextField).first, 'https://example.com');
    await tester.tap(find.text('افحص الرابط'));
    await tester.pumpAndSettle();

    expect(find.byType(VerdictCard), findsNothing);
    expect(find.byType(ErrorRetry), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('reports tab renders search, and the submit form validates', (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'البلاغات');

    // Search sub-tab.
    await tester.tap(find.text('ابحث'));
    await tester.pumpAndSettle();
    expect(find.text('+970599000000'), findsOneWidget);

    // Submit sub-tab: empty form shows validation errors instead of posting.
    await tester.tap(find.text('إبلاغ'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('أرسل البلاغ'));
    await tester.pumpAndSettle();
    expect(find.text('هذا الحقل مطلوب'), findsNWidgets(2));
  });

  testWidgets('flagged links feed renders items', (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'البلاغات');
    await tester.tap(find.text('روابط مرصودة'));
    await tester.pumpAndSettle();

    expect(find.text('https://bank-palestine-login.top'), findsOneWidget);
    expect(find.byType(VerdictChip), findsOneWidget);
  });

  testWidgets('learn tab lists articles and the language toggle switches to English',
      (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'التوعية');
    expect(find.text('كيف تكشف احتيال الجوائز'), findsOneWidget);

    // Toggle to English.
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    expect(find.text('How to spot prize scams'), findsOneWidget);
    expect(
      find.descendant(of: find.byType(NavigationBar), matching: find.text('Home')),
      findsOneWidget,
    );
  });

  testWidgets('social checker shows a dangerous verdict with platform and handle',
      (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'الفحص');
    await tapInnerTab(tester, 'فحص حساب');

    await tester.enterText(
        fieldWithLabel('رابط الحساب أو المعرف'), 'facebook.com/jawwal.prizes2026');
    await tester.tap(find.text('افحص الحساب'));
    await tester.pumpAndSettle();

    expect(find.byType(VerdictCard), findsOneWidget);
    expect(find.text('خطير'), findsOneWidget); // dangerous
    expect(find.text('ينتحل علامة تجارية فلسطينية (جوال)'), findsOneWidget);
    expect(find.textContaining('فيسبوك'), findsOneWidget); // platform
    expect(find.textContaining('jawwal.prizes2026'), findsWidgets); // handle
  });

  testWidgets('sender checker renders official, reported, and unknown trust badges',
      (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'الفحص');
    await tapInnerTab(tester, 'فحص مُرسِل');

    final field = fieldWithLabel('رقم الهاتف أو اسم المُرسِل');

    // Official sender -> green check badge.
    await tester.enterText(field, 'JAWWAL');
    await tester.tap(find.text('افحص المُرسِل'));
    await tester.pumpAndSettle();
    expect(find.byType(SenderTrustBadge), findsOneWidget);
    expect(find.text('مُرسِل رسمي'), findsOneWidget);
    expect(find.text('مُرسِل رسمي معروف'), findsOneWidget); // reason list

    // Reported sender -> red warning with the report count.
    await tester.enterText(field, '+970599000000');
    await tester.tap(find.text('افحص المُرسِل'));
    await tester.pumpAndSettle();
    expect(find.text('مُبلّغ عنه من 3 مستخدمين'), findsOneWidget);
    expect(find.text('رقم مُبلّغ عنه في بلاغات معتمدة'), findsOneWidget);

    // Unknown sender -> neutral "no data" badge.
    await tester.enterText(field, 'RANDOM-SENDER');
    await tester.tap(find.text('افحص المُرسِل'));
    await tester.pumpAndSettle();
    expect(find.text('لا توجد بيانات — ابقَ حذرًا'), findsOneWidget);
  });

  testWidgets('message analyzer sends the sender and renders the spoofing warning',
      (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'الفحص');
    await tapInnerTab(tester, 'تحليل رسالة');

    await tester.enterText(fieldWithLabel('نص الرسالة'), 'أرسل رمز التحقق فورًا');
    await tester.enterText(fieldWithLabel('المُرسِل (اختياري)'), 'JAWWAL');
    await tester.tap(find.text('حلّل الرسالة'));
    await tester.pumpAndSettle();

    // Trust badge above the verdict card (fixture only returns sender info
    // when the request body contained "sender").
    expect(find.byType(SenderTrustBadge), findsOneWidget);
    expect(find.text('مُرسِل رسمي'), findsOneWidget);

    // SPOOFING_WARNING reason rendered in the verdict card.
    expect(find.byType(VerdictCard), findsOneWidget);
    expect(find.text('خطير'), findsOneWidget); // dangerous despite official sender
    expect(find.text('تحذير: قد يكون اسم المُرسِل منتحلًا'), findsOneWidget);
  });

  testWidgets('quiz plays through a question and shows the score', (tester) async {
    await pumpApp(tester, fixtureApi());

    await tapNav(tester, 'التوعية');
    await tester.tap(find.text('ابدأ الاختبار التوعوي'));
    await tester.pumpAndSettle();

    expect(find.text('ماذا تفعل عند استلام رسالة جائزة؟'), findsOneWidget);
    await tester.tap(find.text('أتجاهلها وأبلغ عنها'));
    await tester.pumpAndSettle();
    expect(find.text('إجابة صحيحة!'), findsOneWidget);

    await tester.tap(find.text('عرض النتيجة'));
    await tester.pumpAndSettle();
    expect(find.text('أجبت بشكل صحيح على 1 من 1'), findsOneWidget);
  });

  test('phone blocklist model parses the GET /blocklist/phones contract', () {
    final blocklist = PhoneBlocklist.fromJson({
      'updatedAt': '2026-07-01T10:00:00Z',
      'count': 2,
      'entries': [
        {'number': '+970599123456', 'reports': 5, 'category': 'PRIZE_SCAM'},
        {'number': '+970568111222', 'reports': 2, 'category': 'BANK_PHISHING'},
      ],
    });

    expect(blocklist.count, 2);
    expect(blocklist.updatedAt, DateTime.utc(2026, 7, 1, 10));
    expect(blocklist.entries, hasLength(2));
    expect(blocklist.entries.first.number, '+970599123456');
    expect(blocklist.entries.first.reports, 5);
    expect(blocklist.entries.first.category, 'PRIZE_SCAM');
    // Round-trips through toJson for the file handed to the native side.
    expect(blocklist.entries.first.toJson(),
        {'number': '+970599123456', 'reports': 5, 'category': 'PRIZE_SCAM'});

    // Tolerates a missing/short envelope.
    final empty = PhoneBlocklist.fromJson(const {});
    expect(empty.count, 0);
    expect(empty.entries, isEmpty);
    expect(empty.updatedAt, isNull);
  });

  testWidgets('protection tab shows permission cards and syncs the blocklist',
      (tester) async {
    final log = <MethodCall>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      ProtectionService.channel,
      (call) async {
        log.add(call);
        switch (call.method) {
          case 'isProtectionSupported':
            return true;
          case 'hasCallScreeningRole':
            return false;
          case 'hasOverlayPermission':
            return true;
          case 'hasSmsPermission':
            return false;
          case 'getBlocklistInfo':
            return {'count': 0, 'updatedAt': null, 'syncedAt': null};
          case 'writeBlocklist':
            return {
              'count': 2,
              'updatedAt': '2026-07-01T10:00:00Z',
              'syncedAt': DateTime(2026, 7, 2, 9, 30).millisecondsSinceEpoch,
            };
          case 'showTestOverlay':
            return true;
          default:
            return null;
        }
      },
    );
    addTearDown(() => tester.binding.defaultBinaryMessenger
        .setMockMethodCallHandler(ProtectionService.channel, null));

    await pumpApp(tester, fixtureApi());
    await tapNav(tester, 'الحماية');

    // Consent / explainer card.
    expect(find.text('الحماية الفورية من الاحتيال'), findsOneWidget);

    // Three permission tiles; overlay is granted, the other two are not.
    expect(find.text('فحص المكالمات الواردة'), findsOneWidget);
    expect(find.text('التحذير فوق الشاشة'), findsOneWidget);
    expect(find.text('مراقبة الرسائل النصية'), findsOneWidget);
    expect(find.text('مفعّل'), findsOneWidget);
    expect(find.text('تفعيل'), findsNWidgets(2));

    // Blocklist not synced yet.
    expect(find.text('لم تتم المزامنة بعد'), findsOneWidget);

    // Sync now: fetches GET /blocklist/phones and writes it natively.
    // The consent illustration makes the tab scrollable, so scroll the sync
    // button clear of the bottom navigation bar before tapping it.
    final protScrollable = find.descendant(
      of: find.byType(ProtectionScreen),
      matching: find.byType(Scrollable),
    );
    await tester.scrollUntilVisible(find.text('مزامنة الآن'), 150,
        scrollable: protScrollable);
    await tester.pumpAndSettle();
    await tester.tap(find.text('مزامنة الآن'));
    await tester.pumpAndSettle();
    expect(log.any((c) => c.method == 'writeBlocklist'), isTrue);
    expect(find.text('2 رقمًا في القائمة'), findsOneWidget);
    expect(find.textContaining('آخر مزامنة'), findsOneWidget);

    // Demo overlay button invokes the channel.
    await tester.scrollUntilVisible(find.text('عرض تحذير تجريبي'), 150,
        scrollable: protScrollable);
    await tester.pumpAndSettle();
    await tester.tap(find.text('عرض تحذير تجريبي'));
    await tester.pumpAndSettle();
    expect(log.any((c) => c.method == 'showTestOverlay'), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('protection tab explains the feature is unsupported on iOS',
      (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      await pumpApp(tester, fixtureApi());
      await tapNav(tester, 'الحماية');

      expect(find.text('غير مدعومة على iOS'), findsOneWidget);
      // No permission tiles or sync controls on iOS.
      expect(find.text('مزامنة الآن'), findsNothing);
      expect(find.text('تفعيل'), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  });
}
