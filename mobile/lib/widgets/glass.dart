import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../theme.dart';

/// The page wash that every frosted surface sits on.
///
/// Frosted panels need something worth blurring. This is a very low contrast
/// spread of the brand colours: green at the corners, a warm olive note on one
/// side, the faintest red at the bottom. It is painted once behind the whole
/// app rather than per screen, so a panel picks up a different tint depending
/// on where it lands.
class AmanBackdrop extends StatelessWidget {
  const AmanBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? AmanColors.pageDark : AmanColors.pageLight;

    Widget blob(Alignment at, Color color, double radius) {
      return Positioned.fill(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: at,
              radius: radius,
              colors: [color, color.withValues(alpha: 0)],
            ),
          ),
        ),
      );
    }

    final strength = isDark ? 0.22 : 1.0;

    return Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: base),
        blob(const Alignment(-1, -1), AmanColors.brand400.withValues(alpha: 0.18 * strength), 1.1),
        blob(const Alignment(1, -0.8), AmanColors.olive.withValues(alpha: 0.16 * strength), 1.0),
        blob(const Alignment(0.9, 1), AmanColors.accent.withValues(alpha: 0.06 * strength), 0.9),
        blob(const Alignment(-0.6, 1), AmanColors.brand500.withValues(alpha: 0.15 * strength), 1.1),
        child,
      ],
    );
  }
}

/// A frosted bar for app chrome: blurs whatever scrolls under it, lays a
/// translucent face over the result, and marks the edge facing the content
/// with a hairline so the bar keeps a defined boundary.
class GlassBar extends StatelessWidget {
  const GlassBar({super.key, this.edge = GlassBarEdge.bottom, this.child});

  final GlassBarEdge edge;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final line = BorderSide(color: AmanGlass.edge(brightness));

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: AmanGlass.barBlurSigma, sigmaY: AmanGlass.barBlurSigma),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: brightness == Brightness.dark
                  ? [
                      const Color(0xFF16241C).withValues(alpha: 0.72),
                      const Color(0xFF16241C).withValues(alpha: 0.5),
                    ]
                  : [Colors.white.withValues(alpha: 0.82), Colors.white.withValues(alpha: 0.58)],
            ),
            border: switch (edge) {
              GlassBarEdge.bottom => Border(bottom: line),
              GlassBarEdge.top => Border(top: line),
            },
          ),
          child: child ?? const SizedBox.expand(),
        ),
      ),
    );
  }
}

enum GlassBarEdge { top, bottom }

/// Uniform padding, plus room for whatever the translucent bars are covering.
///
/// The shell sets `extendBody: true` so content scrolls under the frosted
/// navigation bar. Scaffold reports the bar's height as bottom padding on the
/// body's [MediaQuery]; a scroll view with its own explicit padding has to add
/// that back or its last item ends up behind the glass.
EdgeInsets barSafeAll(BuildContext context, [double all = 16]) =>
    EdgeInsets.all(all) + MediaQuery.paddingOf(context);

/// A frosted panel: the mobile counterpart of the `.card` recipe on the web.
///
/// [Card] alone gives the translucent face and the rim, but not the blur, so
/// anything with real detail behind it (a scrolling list, an illustration)
/// needs this instead.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = AmanGlass.radius,
    this.onTap,
    this.tint,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;

  /// Washes the face toward a colour, for panels whose colour carries meaning
  /// (a verdict, the brand). Keep the alpha low; the point is a tint, not a
  /// fill, and the text still has to read.
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final corners = BorderRadius.circular(radius);

    Widget content = Padding(padding: padding, child: child);
    if (onTap != null) {
      content = InkWell(borderRadius: corners, onTap: onTap, child: content);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: corners,
        boxShadow: [
          BoxShadow(
            color: AmanGlass.shadow(brightness),
            blurRadius: 26,
            offset: const Offset(0, 10),
            spreadRadius: -12,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: corners,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: AmanGlass.blurSigma, sigmaY: AmanGlass.blurSigma),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: tint == null
                  ? AmanGlass.face(brightness)
                  : Color.alphaBlend(tint!, AmanGlass.face(brightness)),
              borderRadius: corners,
              border: Border.all(color: AmanGlass.edge(brightness)),
            ),
            child: Material(color: Colors.transparent, child: content),
          ),
        ),
      ),
    );
  }
}
