import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The Aman brand mark: a shield holding an olive sprig.
///
/// Source of truth is `assets/logo/aman-mark.svg`, shared with the web app and
/// the design files in the repository root. Use [AmanLogo] anywhere the product
/// identifies itself; keep Material's generic shield icons for things that are
/// merely *about* protection, such as the navigation destination.
class AmanLogo extends StatelessWidget {
  const AmanLogo({super.key, this.size = 28, this.onDark = false});

  final double size;

  /// The full-colour mark loses its edges on a dark surface; this swaps in the
  /// inverted variant.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final asset = onDark ? 'assets/logo/aman-mark-on-dark.svg' : 'assets/logo/aman-mark.svg';
    return SvgPicture.asset(
      asset,
      width: size,
      height: size,
      // The mark carries the product name; screen readers should say it once.
      semanticsLabel: 'Aman',
    );
  }
}
