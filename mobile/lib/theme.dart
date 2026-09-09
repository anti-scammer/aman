import 'package:flutter/material.dart';

/// The Aman design system, shared in spirit with `web/src/index.css`.
///
/// Surfaces are frosted glass: a translucent face over the page wash painted by
/// [AmanBackdrop], with a hairline edge so the panel stays legible where its
/// face happens to match what is behind it. Text always sits on the near-opaque
/// variant, so contrast never depends on the backdrop.
///
/// Keep the palette here in step with the `--brand-*` custom properties in the
/// web stylesheet; the two products are meant to look like one product.
abstract final class AmanColors {
  static const brand950 = Color(0xFF082916);
  static const brand900 = Color(0xFF0C3B20);
  static const brand800 = Color(0xFF104A27);
  static const brand700 = Color(0xFF14532D);
  static const brand600 = Color(0xFF175F34);
  static const brand500 = Color(0xFF1A6B3C);
  static const brand400 = Color(0xFF2F8A55);
  static const brand200 = Color(0xFFBFE0CB);
  static const brand100 = Color(0xFFDCEFE2);
  static const brand50 = Color(0xFFEDF6F0);

  /// Flag red. Calls to action and danger only.
  static const accent = Color(0xFFCE1126);

  static const ink = Color(0xFF17211B);
  static const inkSoft = Color(0xFF4D5A52);

  /// Warm olive note in the page wash.
  static const olive = Color(0xFFF4C95D);

  static const pageLight = Color(0xFFEFF4F0);
  static const pageDark = Color(0xFF0B1711);
}

/// How translucent a frosted surface is, and how hard it blurs.
abstract final class AmanGlass {
  static const blurSigma = 18.0;
  static const barBlurSigma = 24.0;

  static const radius = 20.0;
  static const barRadius = 28.0;

  /// Panels that carry text.
  static Color face(Brightness b) => b == Brightness.dark
      ? const Color(0xFF16241C).withValues(alpha: 0.78)
      : Colors.white.withValues(alpha: 0.80);

  /// Chrome, where a little more of the page shows through.
  static Color faceSoft(Brightness b) => b == Brightness.dark
      ? const Color(0xFF16241C).withValues(alpha: 0.58)
      : Colors.white.withValues(alpha: 0.62);

  /// The lit rim. It is what stops a translucent panel reading as a smudge.
  static Color edge(Brightness b) => b == Brightness.dark
      ? Colors.white.withValues(alpha: 0.14)
      : Colors.white.withValues(alpha: 0.78);

  static Color shadow(Brightness b) => b == Brightness.dark
      ? Colors.black.withValues(alpha: 0.5)
      : AmanColors.brand900.withValues(alpha: 0.16);
}

ThemeData amanTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(seedColor: AmanColors.brand700, brightness: brightness)
      .copyWith(
        primary: isDark ? AmanColors.brand200 : AmanColors.brand600,
        error: isDark ? const Color(0xFFFFB4AB) : AmanColors.accent,
      );

  final edge = AmanGlass.edge(brightness);
  final face = AmanGlass.face(brightness);
  final shadow = AmanGlass.shadow(brightness);

  final panelShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(AmanGlass.radius),
    side: BorderSide(color: edge),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    // AmanBackdrop paints the page; the scaffold must not paint over it.
    scaffoldBackgroundColor: Colors.transparent,
    canvasColor: Colors.transparent,

    cardTheme: CardThemeData(
      color: face,
      // Material 3 tints elevated surfaces toward the primary colour, which
      // fights the glass. The tint here comes from the page behind instead.
      surfaceTintColor: Colors.transparent,
      shadowColor: shadow,
      elevation: 6,
      shape: panelShape,
      margin: EdgeInsets.zero,
    ),

    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      elevation: 0,
      centerTitle: false,
      foregroundColor: isDark ? AmanColors.brand100 : AmanColors.brand900,
    ),

    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      indicatorColor: isDark
          ? AmanColors.brand400.withValues(alpha: 0.28)
          : AmanColors.brand100.withValues(alpha: 0.9),
    ),

    // Inputs read as recessed glass, the opposite of a raised button.
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark
          ? Colors.black.withValues(alpha: 0.22)
          : Colors.white.withValues(alpha: 0.72),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: edge),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: edge),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: scheme.primary, width: 1.6),
      ),
    ),

    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        elevation: 4,
        shadowColor: shadow,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        elevation: 4,
        shadowColor: shadow,
        surfaceTintColor: Colors.transparent,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        backgroundColor: AmanGlass.faceSoft(brightness),
        side: BorderSide(color: edge),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(shape: const StadiumBorder())),

    chipTheme: ChipThemeData(
      backgroundColor: AmanGlass.faceSoft(brightness),
      side: BorderSide(color: edge),
      shape: const StadiumBorder(),
      surfaceTintColor: Colors.transparent,
    ),

    dividerTheme: DividerThemeData(
      color: isDark
          ? Colors.white.withValues(alpha: 0.1)
          : AmanColors.brand900.withValues(alpha: 0.08),
      thickness: 1,
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: face,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AmanGlass.barRadius),
        side: BorderSide(color: edge),
      ),
    ),

    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  );
}
