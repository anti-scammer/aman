import 'package:flutter/widgets.dart';

import 'api_client.dart';

/// Provides the [ApiClient] to the widget tree so screens can be tested with
/// a mocked client.
class ApiScope extends InheritedWidget {
  const ApiScope({super.key, required this.api, required super.child});

  final ApiClient api;

  static ApiClient of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<ApiScope>();
    assert(scope != null, 'No ApiScope found in the widget tree');
    return scope!.api;
  }

  @override
  bool updateShouldNotify(ApiScope oldWidget) => api != oldWidget.api;
}
