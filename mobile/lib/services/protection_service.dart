import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../api/api_client.dart';
import '../models/verdict.dart';

/// State of the on-device blocklist file (also returned after a sync).
class BlocklistInfo {
  final int count;
  final DateTime? updatedAt;
  final DateTime? syncedAt;

  const BlocklistInfo({required this.count, this.updatedAt, this.syncedAt});

  factory BlocklistInfo.fromMap(Map<Object?, Object?> map) => BlocklistInfo(
        count: (map['count'] as num?)?.round() ?? 0,
        updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? ''),
        syncedAt: map['syncedAt'] is num
            ? DateTime.fromMillisecondsSinceEpoch((map['syncedAt'] as num).round())
            : null,
      );
}

/// Dart wrapper around the "ps.antiscammer/protection" MethodChannel.
///
/// Real-time protection is Android-only: on any other platform every query
/// returns `false` / `null` without ever touching the channel, so the UI can
/// show a graceful "not supported" explanation instead of crashing. On
/// Android the native side (MainActivity + ScamCallScreeningService +
/// SmsReceiver + ScamOverlayService) does the heavy lifting; everything the
/// blocklist matches against stays on the device.
///
/// Native → Dart: when the Flutter engine is alive, `SmsReceiver` forwards
/// incoming SMS as `onSuspiciousSms`; we run the full backend analysis
/// (POST /analyze-message) and ask native to show the warning overlay if the
/// verdict is not safe. When the engine is dead the native blocklist+keyword
/// "lite" check covers it (documented tradeoff: no headless background Dart).
class ProtectionService {
  ProtectionService._();

  static final ProtectionService instance = ProtectionService._();

  static const MethodChannel channel = MethodChannel('ps.antiscammer/protection');

  /// Latest API client, used by [_onNativeCall] for the full SMS analysis.
  ApiClient? _api;
  bool _handlerAttached = false;

  /// Real-time protection only exists in the Android implementation.
  bool get isAndroidPlatform => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Registers the Dart-side handler for native → Dart calls
  /// (`onSuspiciousSms`) and remembers the API client. Safe to call often.
  void attach(ApiClient api) {
    _api = api;
    if (_handlerAttached || !isAndroidPlatform) return;
    _handlerAttached = true;
    channel.setMethodCallHandler(_onNativeCall);
  }

  Future<Object?> _onNativeCall(MethodCall call) async {
    if (call.method != 'onSuspiciousSms') return null;
    final args = call.arguments;
    final map = args is Map ? args : const {};
    final sender = map['sender']?.toString() ?? '';
    final body = map['body']?.toString() ?? '';
    final api = _api;
    if (api == null || body.isEmpty) return null;
    try {
      final result =
          await api.analyzeMessage(body, sender: sender.isEmpty ? null : sender);
      if (result.verdict != Verdict.safe) {
        await channel.invokeMethod('showSmsOverlay', {
          'sender': sender,
          'reports': result.sender?.communityReports ?? 0,
          'category': result.categories.isNotEmpty ? result.categories.first : null,
          'detail': result.reasons.isNotEmpty ? result.reasons.first.message : null,
        });
      }
    } catch (_) {
      // Backend unreachable — the native keyword check already warned.
    }
    return null;
  }

  // ------------------------------------------------------ permission queries

  Future<bool> isSupported() => _boolCall('isProtectionSupported');
  Future<bool> hasCallScreeningRole() => _boolCall('hasCallScreeningRole');
  Future<bool> requestCallScreeningRole() => _boolCall('requestCallScreeningRole');
  Future<bool> hasOverlayPermission() => _boolCall('hasOverlayPermission');

  /// Opens the system "draw over other apps" settings screen; the actual
  /// grant is re-checked when the app resumes.
  Future<bool> requestOverlayPermission() => _boolCall('requestOverlayPermission');
  Future<bool> hasSmsPermission() => _boolCall('hasSmsPermission');
  Future<bool> requestSmsPermission() => _boolCall('requestSmsPermission');

  /// Shows a demo warning overlay (or the notification fallback) so the user
  /// can verify the protection actually works.
  Future<bool> showTestOverlay() => _boolCall('showTestOverlay');

  // --------------------------------------------------------------- blocklist

  /// Reads count / updatedAt / last-sync time of the on-device blocklist.
  Future<BlocklistInfo?> blocklistInfo() async {
    if (!isAndroidPlatform) return null;
    try {
      final map = await channel.invokeMapMethod<Object?, Object?>('getBlocklistInfo');
      return map == null ? null : BlocklistInfo.fromMap(map);
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  /// Fetches `GET /blocklist/phones` and hands the JSON to the native side,
  /// which persists it in the app files dir where the call-screening service
  /// and SMS receiver read it (fully offline matching afterwards).
  Future<BlocklistInfo> syncBlocklist(ApiClient api) async {
    final blocklist = await api.fetchPhoneBlocklist();
    final now = DateTime.now();
    if (!isAndroidPlatform) {
      return BlocklistInfo(
        count: blocklist.entries.length,
        updatedAt: blocklist.updatedAt,
        syncedAt: now,
      );
    }
    final payload = jsonEncode({
      'updatedAt': blocklist.updatedAt?.toIso8601String(),
      'syncedAt': now.millisecondsSinceEpoch,
      'count': blocklist.entries.length,
      'entries': [for (final e in blocklist.entries) e.toJson()],
    });
    final map = await channel
        .invokeMapMethod<Object?, Object?>('writeBlocklist', {'json': payload});
    if (map == null) {
      throw const ApiException('Blocklist write failed', code: 'WRITE_FAILED');
    }
    return BlocklistInfo.fromMap(map);
  }

  // ---------------------------------------------------------------- plumbing

  Future<bool> _boolCall(String method) async {
    if (!isAndroidPlatform) return false;
    try {
      return await channel.invokeMethod<bool>(method) ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }
}
