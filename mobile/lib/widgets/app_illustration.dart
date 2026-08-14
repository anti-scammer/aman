import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Named references to the on-brand SVG illustration set shared with the web
/// frontend (line-art, dark-green palette with red tatreez-diamond accents).
///
/// Files live in `assets/illustrations/` (declared in pubspec.yaml).
enum AppIllustrationAsset {
  hero('hero'),
  spotUrl('spot-url'),
  spotMessage('spot-message'),
  spotSocial('spot-social'),
  spotSender('spot-sender'),
  spotAwareness('spot-awareness'),
  spotCommunity('spot-community'),
  protection('protection'),
  emptySearch('empty-search'),
  emptySafe('empty-safe');

  const AppIllustrationAsset(this.asset);

  /// Base file name (without directory or extension).
  final String asset;

  String get path => 'assets/illustrations/$asset.svg';
}

/// Consistent wrapper around [SvgPicture.asset] for the app illustration set.
///
/// The SVGs are symmetric / direction-agnostic, so they are pinned to
/// [TextDirection.ltr] to guarantee they never mirror inside an RTL (Arabic)
/// layout. Pass an [opacity] below 1 for muted, decorative placement. The
/// widget never grows beyond [size]; on small screens wrap it in a parent that
/// constrains width if needed.
class AppIllustration extends StatelessWidget {
  const AppIllustration(
    this.illustration, {
    super.key,
    this.size = 120,
    this.semanticLabel,
    this.opacity = 1.0,
  });

  final AppIllustrationAsset illustration;
  final double size;
  final String? semanticLabel;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    Widget picture = SvgPicture.asset(
      illustration.path,
      width: size,
      height: size,
      fit: BoxFit.contain,
      semanticsLabel: semanticLabel,
      matchTextDirection: false,
    );
    if (opacity < 1.0) {
      picture = Opacity(opacity: opacity, child: picture);
    }
    // Pin to LTR so the direction-agnostic artwork never mirrors under RTL.
    return Directionality(textDirection: TextDirection.ltr, child: picture);
  }
}
