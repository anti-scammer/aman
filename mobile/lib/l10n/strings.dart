import 'package:flutter/widgets.dart';

/// Simple ar/en string table for the whole app.
///
/// Arabic is the default app language. Use `context.tr('key')` to resolve a
/// string for the current locale (see [LocaleProvider] / [LocaleScope]).
const Map<String, Map<String, String>> kStrings = {
  'ar': {
    'appTitle': 'Antiscammer — حماية من الاحتيال',
    'appShortTitle': 'Antiscammer',
    // Bottom navigation
    'navHome': 'الرئيسية',
    'navCheck': 'الفحص',
    'navReports': 'البلاغات',
    'navLearn': 'التوعية',
    'navProtection': 'الحماية',
    // Common
    'retry': 'إعادة المحاولة',
    'loading': 'جارٍ التحميل...',
    'errorTitle': 'تعذّر الاتصال بالخادم',
    'errorBody': 'تأكد من اتصالك بالإنترنت أو أن الخادم يعمل ثم حاول مجددًا.',
    'requiredField': 'هذا الحقل مطلوب',
    'optional': 'اختياري',
    'language': 'English',
    // Home
    'homeIntroTitle': 'منصة حماية المستخدم الفلسطيني من الاحتيال الرقمي',
    'homeIntroBody':
        'افحص الروابط والرسائل المشبوهة قبل التفاعل معها، وابحث في قاعدة بيانات البلاغات المجتمعية، وتعلّم كيف تحمي نفسك من الاحتيال.',
    'homeStatsTitle': 'إحصائيات البلاغات',
    'homeTotalReports': 'إجمالي البلاغات',
    'homeShortcuts': 'اختصارات سريعة',
    'shortcutCheckUrl': 'فحص رابط',
    'shortcutCheckUrlSub': 'تحقق من رابط مشبوه',
    'shortcutAnalyzeMsg': 'تحليل رسالة',
    'shortcutAnalyzeMsgSub': 'حلّل رسالة SMS أو واتساب',
    'shortcutCheckSocial': 'فحص حساب تواصل',
    'shortcutCheckSocialSub': 'تحقق من حساب أو صفحة مشبوهة',
    'shortcutCheckSender': 'فحص مُرسِل',
    'shortcutCheckSenderSub': 'تحقق من رقم أو اسم مُرسِل',
    'shortcutSearchReports': 'بحث في البلاغات',
    'shortcutSearchReportsSub': 'ابحث عن رقم أو رابط أو حساب',
    'shortcutLearn': 'التوعية',
    'shortcutLearnSub': 'مقالات واختبار توعوي',
    // Check screen
    'checkTitle': 'الفحص',
    'tabUrl': 'فحص رابط',
    'tabMessage': 'تحليل رسالة',
    'urlHint': 'ألصق الرابط هنا، مثال: https://example.com',
    'urlLabel': 'الرابط',
    'checkButton': 'افحص الرابط',
    'messageHint': 'ألصق نص الرسالة (SMS / واتساب) هنا...',
    'messageLabel': 'نص الرسالة',
    'analyzeButton': 'حلّل الرسالة',
    'verdictSafe': 'آمن',
    'verdictSuspicious': 'مشبوه',
    'verdictDangerous': 'خطير',
    'riskScore': 'درجة الخطورة',
    'reasonsTitle': 'الأسباب',
    'noReasons': 'لم يتم رصد مؤشرات خطر.',
    'communityReports': 'بلاغات مجتمعية مطابقة',
    'matchedCategories': 'أنماط الاحتيال المطابقة',
    'extractedUrls': 'روابط داخل الرسالة',
    'invalidUrl': 'أدخل رابطًا صالحًا',
    'emptyMessage': 'أدخل نص الرسالة',
    'tabSocial': 'فحص حساب',
    'tabSender': 'فحص مُرسِل',
    'socialLabel': 'رابط الحساب أو المعرف',
    'socialHint': 'مثال: facebook.com/page أو @handle',
    'checkSocialButton': 'افحص الحساب',
    'emptySocial': 'أدخل رابط الحساب أو المعرف',
    'platformLabel': 'المنصة',
    'handleLabel': 'المعرف',
    'platFACEBOOK': 'فيسبوك',
    'platINSTAGRAM': 'إنستغرام',
    'platTIKTOK': 'تيك توك',
    'platTELEGRAM': 'تيليغرام',
    'platX': 'إكس (تويتر)',
    'platWHATSAPP': 'واتساب',
    'platUNKNOWN': 'غير معروفة',
    'senderLabel': 'رقم الهاتف أو اسم المُرسِل',
    'senderHint': 'مثال: +970599000000 أو JAWWAL',
    'checkSenderButton': 'افحص المُرسِل',
    'emptySender': 'أدخل رقم هاتف أو اسم مُرسِل',
    'messageSenderLabel': 'المُرسِل (اختياري)',
    'messageSenderHint': 'اسم أو رقم المُرسِل كما ظهر في الرسالة',
    'trustOfficial': 'مُرسِل رسمي',
    'trustReported': 'مُبلّغ عنه من {count} مستخدمين',
    'trustUnknown': 'لا توجد بيانات — ابقَ حذرًا',
    // Reports
    'reportsTitle': 'البلاغات',
    'tabSearch': 'بحث',
    'tabSubmit': 'إبلاغ',
    'tabFlagged': 'روابط مرصودة',
    'searchHint': 'رقم هاتف، رابط، أو اسم حساب...',
    'searchButton': 'ابحث',
    'searchEmpty': 'لا توجد نتائج مطابقة. قد يكون هذا جيدًا — لكن ابقَ حذرًا!',
    'searchPrompt': 'ابحث عن رقم هاتف أو رابط أو حساب قبل أن تثق به.',
    'reportType': 'نوع البلاغ',
    'typePhone': 'رقم هاتف',
    'typeUrl': 'رابط',
    'typeSocial': 'حساب تواصل',
    'typeAll': 'الكل',
    'reportValue': 'الرقم / الرابط / الحساب',
    'reportDescription': 'وصف الاحتيال',
    'reportCategory': 'تصنيف الاحتيال',
    'reporterName': 'اسمك (اختياري)',
    'submitReport': 'أرسل البلاغ',
    'reportSubmitted': 'تم إرسال البلاغ بنجاح، وسيُنشر بعد المراجعة.',
    'flaggedTitle': 'روابط احتيال نشطة',
    'flaggedEmpty': 'لا توجد روابط مرصودة حاليًا.',
    'timesChecked': 'مرات الفحص',
    'lastSeen': 'آخر رصد',
    'sourceCheck': 'فحص',
    'sourceReport': 'بلاغ',
    'statusPending': 'قيد المراجعة',
    'statusApproved': 'معتمد',
    'statusRejected': 'مرفوض',
    // Learn
    'learnTitle': 'مركز التوعية',
    'articlesEmpty': 'لا توجد مقالات بعد.',
    'startQuiz': 'ابدأ الاختبار التوعوي',
    'quizTitle': 'اختبار التوعية',
    'quizEmpty': 'لا توجد أسئلة متاحة.',
    'questionOf': 'سؤال {current} من {total}',
    'correct': 'إجابة صحيحة!',
    'wrong': 'إجابة خاطئة',
    'next': 'التالي',
    'showResult': 'عرض النتيجة',
    'quizResultTitle': 'نتيجتك',
    'quizScore': 'أجبت بشكل صحيح على {score} من {total}',
    'quizPerfect': 'ممتاز! أنت واعٍ تمامًا لأساليب الاحتيال.',
    'quizGood': 'جيد جدًا! راجع المقالات لتعزيز وعيك.',
    'quizBad': 'انتبه! ننصحك بقراءة مقالات التوعية.',
    'restartQuiz': 'إعادة الاختبار',
    // Protection (real-time, Android only)
    'protConsentTitle': 'الحماية الفورية من الاحتيال',
    'protConsentBody':
        'عند التفعيل يفحص التطبيق رقم كل مكالمة واردة وكل رسالة SMS واردة مقابل قائمة أرقام الاحتيال المحفوظة على جهازك، ويعرض بطاقة تحذير حمراء عند الاشتباه. الفحص يتم بالكامل على جهازك — لا تُرفع مكالماتك أو رسائلك إلى أي خادم، ولا يُحظر أي اتصال؛ القرار يبقى لك دائمًا.',
    'protUnsupportedTitle': 'غير مدعومة على iOS',
    'protUnsupportedBody':
        'لا يسمح نظام iOS للتطبيقات بمراقبة المكالمات أو الرسائل الواردة أو عرض تحذيرات فوق التطبيقات الأخرى، لذلك تتوفر الحماية الفورية على أجهزة أندرويد فقط. يمكنك دائمًا فحص الأرقام والرسائل يدويًا من تبويب «الفحص».',
    'protCallScreening': 'فحص المكالمات الواردة',
    'protCallScreeningSub': 'تحذير فوري عند ورود مكالمة من رقم مُبلّغ عنه (دور «فحص المكالمات»)',
    'protOverlay': 'التحذير فوق الشاشة',
    'protOverlaySub': 'إذن عرض بطاقة التحذير فوق التطبيقات الأخرى',
    'protSms': 'مراقبة الرسائل النصية',
    'protSmsSub': 'فحص الرسائل الواردة ورصد رسائل الاحتيال',
    'protEnabled': 'مفعّل',
    'protEnable': 'تفعيل',
    'protSyncTitle': 'قائمة الأرقام المحظورة',
    'protSyncSub': 'تُجلب القائمة من بلاغات المجتمع وتُحفظ على جهازك للفحص دون إنترنت',
    'protSyncNow': 'مزامنة الآن',
    'protSyncing': 'جارٍ المزامنة...',
    'protEntriesCount': '{count} رقمًا في القائمة',
    'protLastSync': 'آخر مزامنة: {time}',
    'protNeverSynced': 'لم تتم المزامنة بعد',
    'protSyncFailed': 'فشلت المزامنة — تأكد من الاتصال بالخادم',
    'protTestTitle': 'تجربة التحذير',
    'protTestSub': 'اعرض بطاقة تحذير تجريبية للتأكد من أن الحماية تعمل',
    'protTestButton': 'عرض تحذير تجريبي',
    // Scam categories
    'catPRIZE_SCAM': 'احتيال الجوائز',
    'catDELIVERY_SCAM': 'احتيال التوصيل',
    'catJOB_SCAM': 'احتيال الوظائف',
    'catBANK_PHISHING': 'تصيّد مصرفي',
    'catOTP_THEFT': 'سرقة رمز التحقق',
    'catFAKE_SHOP': 'متجر وهمي',
    'catCHARITY_SCAM': 'احتيال التبرعات',
    'catCRYPTO_SCAM': 'احتيال العملات الرقمية',
    'catOTHER': 'أخرى',
  },
  'en': {
    'appTitle': 'Antiscammer — Scam Protection',
    'appShortTitle': 'Antiscammer',
    'navHome': 'Home',
    'navCheck': 'Check',
    'navReports': 'Reports',
    'navLearn': 'Learn',
    'navProtection': 'Protection',
    'retry': 'Retry',
    'loading': 'Loading...',
    'errorTitle': 'Could not reach the server',
    'errorBody': 'Check your internet connection or that the server is running, then try again.',
    'requiredField': 'This field is required',
    'optional': 'Optional',
    'language': 'العربية',
    'homeIntroTitle': 'Palestinian User Protection Platform from Digital Fraud',
    'homeIntroBody':
        'Check suspicious links and messages before acting on them, search the community reports database, and learn how to protect yourself from fraud.',
    'homeStatsTitle': 'Report statistics',
    'homeTotalReports': 'Total reports',
    'homeShortcuts': 'Quick shortcuts',
    'shortcutCheckUrl': 'Check a URL',
    'shortcutCheckUrlSub': 'Verify a suspicious link',
    'shortcutAnalyzeMsg': 'Analyze a message',
    'shortcutAnalyzeMsgSub': 'Analyze an SMS or WhatsApp message',
    'shortcutCheckSocial': 'Check a social account',
    'shortcutCheckSocialSub': 'Verify a suspicious account or page',
    'shortcutCheckSender': 'Check a sender',
    'shortcutCheckSenderSub': 'Verify a phone number or sender ID',
    'shortcutSearchReports': 'Search reports',
    'shortcutSearchReportsSub': 'Look up a phone, URL, or account',
    'shortcutLearn': 'Awareness hub',
    'shortcutLearnSub': 'Articles and an awareness quiz',
    'checkTitle': 'Check',
    'tabUrl': 'URL checker',
    'tabMessage': 'Message analyzer',
    'urlHint': 'Paste the link here, e.g. https://example.com',
    'urlLabel': 'URL',
    'checkButton': 'Check URL',
    'messageHint': 'Paste the SMS / WhatsApp message text here...',
    'messageLabel': 'Message text',
    'analyzeButton': 'Analyze message',
    'verdictSafe': 'Safe',
    'verdictSuspicious': 'Suspicious',
    'verdictDangerous': 'Dangerous',
    'riskScore': 'Risk score',
    'reasonsTitle': 'Reasons',
    'noReasons': 'No risk indicators detected.',
    'communityReports': 'Matching community reports',
    'matchedCategories': 'Matched scam categories',
    'extractedUrls': 'URLs found in the message',
    'invalidUrl': 'Enter a valid URL',
    'emptyMessage': 'Enter the message text',
    'tabSocial': 'Social checker',
    'tabSender': 'Sender checker',
    'socialLabel': 'Profile URL or handle',
    'socialHint': 'e.g. facebook.com/page or @handle',
    'checkSocialButton': 'Check account',
    'emptySocial': 'Enter a profile URL or handle',
    'platformLabel': 'Platform',
    'handleLabel': 'Handle',
    'platFACEBOOK': 'Facebook',
    'platINSTAGRAM': 'Instagram',
    'platTIKTOK': 'TikTok',
    'platTELEGRAM': 'Telegram',
    'platX': 'X (Twitter)',
    'platWHATSAPP': 'WhatsApp',
    'platUNKNOWN': 'Unknown',
    'senderLabel': 'Phone number or sender ID',
    'senderHint': 'e.g. +970599000000 or JAWWAL',
    'checkSenderButton': 'Check sender',
    'emptySender': 'Enter a phone number or sender ID',
    'messageSenderLabel': 'Sender (optional)',
    'messageSenderHint': 'The sender name or number as shown in the message',
    'trustOfficial': 'Official sender',
    'trustReported': 'Reported by {count} users',
    'trustUnknown': 'No data — stay cautious',
    'reportsTitle': 'Reports',
    'tabSearch': 'Search',
    'tabSubmit': 'Report',
    'tabFlagged': 'Flagged links',
    'searchHint': 'Phone number, URL, or account name...',
    'searchButton': 'Search',
    'searchEmpty': 'No matching results. That may be good news — but stay careful!',
    'searchPrompt': 'Search for a phone number, URL, or account before trusting it.',
    'reportType': 'Report type',
    'typePhone': 'Phone number',
    'typeUrl': 'URL',
    'typeSocial': 'Social account',
    'typeAll': 'All',
    'reportValue': 'Phone / URL / account',
    'reportDescription': 'Describe the scam',
    'reportCategory': 'Scam category',
    'reporterName': 'Your name (optional)',
    'submitReport': 'Submit report',
    'reportSubmitted': 'Report submitted successfully. It will be published after review.',
    'flaggedTitle': 'Active scam links',
    'flaggedEmpty': 'No flagged links right now.',
    'timesChecked': 'Times checked',
    'lastSeen': 'Last seen',
    'sourceCheck': 'Check',
    'sourceReport': 'Report',
    'statusPending': 'Pending review',
    'statusApproved': 'Approved',
    'statusRejected': 'Rejected',
    'learnTitle': 'Awareness Hub',
    'articlesEmpty': 'No articles yet.',
    'startQuiz': 'Start the awareness quiz',
    'quizTitle': 'Awareness quiz',
    'quizEmpty': 'No questions available.',
    'questionOf': 'Question {current} of {total}',
    'correct': 'Correct!',
    'wrong': 'Wrong answer',
    'next': 'Next',
    'showResult': 'Show result',
    'quizResultTitle': 'Your score',
    'quizScore': 'You answered {score} of {total} correctly',
    'quizPerfect': 'Excellent! You are fully aware of scam tactics.',
    'quizGood': 'Very good! Review the articles to sharpen your awareness.',
    'quizBad': 'Careful! We recommend reading the awareness articles.',
    'restartQuiz': 'Restart quiz',
    'protConsentTitle': 'Real-time scam protection',
    'protConsentBody':
        'When enabled, the app checks the number of every incoming call and SMS against the scam blocklist stored on your device, and shows a red warning card on suspicion. Everything is checked on your device — your calls and messages are never uploaded to any server, and no call is ever blocked; the decision always stays with you.',
    'protUnsupportedTitle': 'Not supported on iOS',
    'protUnsupportedBody':
        'iOS does not allow apps to monitor incoming calls or SMS, or to draw warnings over other apps, so real-time protection is only available on Android devices. You can always check numbers and messages manually from the "Check" tab.',
    'protCallScreening': 'Incoming call screening',
    'protCallScreeningSub': 'Instant warning when a reported number calls (call-screening role)',
    'protOverlay': 'On-screen warning',
    'protOverlaySub': 'Permission to draw the warning card over other apps',
    'protSms': 'SMS monitoring',
    'protSmsSub': 'Scan incoming messages and detect scam texts',
    'protEnabled': 'Enabled',
    'protEnable': 'Enable',
    'protSyncTitle': 'Blocked numbers list',
    'protSyncSub': 'Fetched from community reports and stored on your device for offline matching',
    'protSyncNow': 'Sync now',
    'protSyncing': 'Syncing...',
    'protEntriesCount': '{count} numbers in the list',
    'protLastSync': 'Last sync: {time}',
    'protNeverSynced': 'Not synced yet',
    'protSyncFailed': 'Sync failed — check the server connection',
    'protTestTitle': 'Try the warning',
    'protTestSub': 'Show a demo warning card to verify the protection works',
    'protTestButton': 'Show demo warning',
    'catPRIZE_SCAM': 'Prize scam',
    'catDELIVERY_SCAM': 'Delivery scam',
    'catJOB_SCAM': 'Job scam',
    'catBANK_PHISHING': 'Bank phishing',
    'catOTP_THEFT': 'OTP theft',
    'catFAKE_SHOP': 'Fake shop',
    'catCHARITY_SCAM': 'Charity scam',
    'catCRYPTO_SCAM': 'Crypto scam',
    'catOTHER': 'Other',
  },
};

/// Holds the current app locale. Arabic by default.
class LocaleProvider extends ChangeNotifier {
  Locale _locale = const Locale('ar');

  Locale get locale => _locale;
  bool get isArabic => _locale.languageCode == 'ar';

  void toggle() {
    _locale = isArabic ? const Locale('en') : const Locale('ar');
    notifyListeners();
  }

  void set(Locale locale) {
    if (locale.languageCode == _locale.languageCode) return;
    _locale = locale;
    notifyListeners();
  }
}

/// Exposes the [LocaleProvider] to the widget tree and rebuilds dependents
/// when the locale changes.
class LocaleScope extends InheritedNotifier<LocaleProvider> {
  const LocaleScope({super.key, required LocaleProvider provider, required super.child})
      : super(notifier: provider);

  static LocaleProvider of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LocaleScope>();
    assert(scope != null, 'No LocaleScope found in the widget tree');
    return scope!.notifier!;
  }
}

extension L10nX on BuildContext {
  LocaleProvider get localeProvider => LocaleScope.of(this);

  bool get isArabic => LocaleScope.of(this).isArabic;

  /// Resolve a string for the current locale, with optional {placeholders}.
  String tr(String key, [Map<String, Object?> args = const {}]) {
    final lang = LocaleScope.of(this).locale.languageCode;
    var value = kStrings[lang]?[key] ?? kStrings['en']?[key] ?? key;
    args.forEach((k, v) => value = value.replaceAll('{$k}', '$v'));
    return value;
  }

  /// Localized label for a scam category enum value (e.g. PRIZE_SCAM).
  String trCategory(String category) {
    final key = 'cat$category';
    final lang = LocaleScope.of(this).locale.languageCode;
    return kStrings[lang]?[key] ?? kStrings['en']?[key] ?? category;
  }

  /// Localized label for a social platform enum value (e.g. FACEBOOK).
  String trPlatform(String platform) {
    final key = 'plat${platform.toUpperCase()}';
    final lang = LocaleScope.of(this).locale.languageCode;
    return kStrings[lang]?[key] ?? kStrings['en']?[key] ?? platform;
  }
}
