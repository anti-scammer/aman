# Aman logo

A shield holding an olive sprig. The shield is the protection the platform
offers; the olive is Palestinian. The gold dot is the fruit.

## Files

| File | Use |
|---|---|
| `aman-mark.svg` | The mark on its own, full colour. Default choice at 32px and above. |
| `aman-mark-on-dark.svg` | Same mark inverted for dark backgrounds, where the green shield disappears. |
| `aman-mark-small.svg` | Simplified silhouette for 16 to 24px. Fewer, fatter shapes so the leaves survive. Also the favicon. |
| `aman-mark-mono.svg` | One colour, driven by `currentColor`. For printing, stamps, and anywhere colour is not available. |
| `aman-lockup-ar.svg` | Mark plus أمان. Mark sits on the right, since Arabic reads right to left. |
| `aman-lockup-en.svg` | Mark plus Aman, mark on the left. |

## Colours

| | Hex |
|---|---|
| Shield, light end | `#2a8a51` |
| Shield, dark end | `#0d4526` |
| Leaves, near side | `#8ed3a8` |
| Leaves, far side | `#d3edde` |
| Stem and knockout | `#f2fbf5` |
| Fruit | `#f4c95d` |

## The wordmarks are outlines, not text

Both lockups contain real vector paths, not `<text>`, so they render the same
everywhere with no font to install. They were produced from IBM Plex Sans
Arabic Bold, the typeface the web app already uses, shaped with HarfBuzz so
the Arabic joins correctly: the meem takes its initial form and the alef its
final one. Retyping أمان as `<text>` in an editor without that shaping will
give you disconnected letters.

To regenerate after a font change, outline the text again rather than editing
these paths by hand.

## Using them

Keep clear space around the mark of at least half the shield's width. Do not
stretch it, recolour it outside the palette above, or place the full-colour
mark on a dark background; use the dark variant for that. Below about 32px,
switch to the small variant.
