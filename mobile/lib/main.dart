import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'api/api_client.dart';
import 'api/api_scope.dart';
import 'l10n/strings.dart';
import 'screens/check_screen.dart';
import 'screens/home_screen.dart';
import 'screens/learn_screen.dart';
import 'screens/protection_screen.dart';
import 'screens/reports_screen.dart';

void main() {
  runApp(AntiscammerApp(api: ApiClient()));
}

/// Root widget. [api] and [localeProvider] are injectable for widget tests.
class AntiscammerApp extends StatefulWidget {
  const AntiscammerApp({super.key, required this.api, this.localeProvider});

  final ApiClient api;
  final LocaleProvider? localeProvider;

  @override
  State<AntiscammerApp> createState() => _AntiscammerAppState();
}

class _AntiscammerAppState extends State<AntiscammerApp> {
  late final LocaleProvider _localeProvider = widget.localeProvider ?? LocaleProvider();

  @override
  Widget build(BuildContext context) {
    return ApiScope(
      api: widget.api,
      child: LocaleScope(
        provider: _localeProvider,
        child: ListenableBuilder(
          listenable: _localeProvider,
          builder: (context, _) {
            return MaterialApp(
              title: 'Antiscammer — حماية من الاحتيال',
              debugShowCheckedModeBanner: false,
              locale: _localeProvider.locale,
              supportedLocales: const [Locale('ar'), Locale('en')],
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              theme: ThemeData(
                useMaterial3: true,
                colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF14532D)),
              ),
              darkTheme: ThemeData(
                useMaterial3: true,
                colorScheme: ColorScheme.fromSeed(
                  seedColor: const Color(0xFF14532D),
                  brightness: Brightness.dark,
                ),
              ),
              home: const MainShell(),
            );
          },
        ),
      ),
    );
  }
}

/// Scaffold with the app bar (title + language toggle) and bottom navigation.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  final _checkKey = GlobalKey<CheckScreenState>();
  final _reportsKey = GlobalKey<ReportsScreenState>();

  void _navigate(int tab, {int innerTab = 0}) {
    setState(() => _tab = tab);
    // Switch the inner tab after the destination screen is built.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (tab == 1) _checkKey.currentState?.switchTab(innerTab);
      if (tab == 2) _reportsKey.currentState?.switchTab(innerTab);
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onNavigate: _navigate),
      CheckScreen(key: _checkKey),
      ReportsScreen(key: _reportsKey),
      const LearnScreen(),
      const ProtectionScreen(),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shield_rounded, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                context.tr('appTitle'),
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () => context.localeProvider.toggle(),
            icon: const Icon(Icons.translate_rounded, size: 18),
            label: Text(context.tr('language')),
          ),
        ],
      ),
      body: IndexedStack(index: _tab, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home_rounded),
            label: context.tr('navHome'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.security_outlined),
            selectedIcon: const Icon(Icons.security_rounded),
            label: context.tr('navCheck'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.flag_outlined),
            selectedIcon: const Icon(Icons.flag_rounded),
            label: context.tr('navReports'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.school_outlined),
            selectedIcon: const Icon(Icons.school_rounded),
            label: context.tr('navLearn'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.shield_outlined),
            selectedIcon: const Icon(Icons.shield_rounded),
            label: context.tr('navProtection'),
          ),
        ],
      ),
    );
  }
}
