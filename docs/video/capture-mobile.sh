#!/usr/bin/env bash
#
# Records the mobile scene from the running Android emulator.
#
# The app must already be installed and the emulator running. Launch it
# detached rather than through `flutter run`: an attached debug session draws a
# highlight border around the whole screen, which ends up in the recording.
#
#   ./capture-mobile.sh
#
# Produces build/footage/09-mobile.mp4 at the phone's native portrait size.
# build.mjs is what fits it into the 16:9 frame, so this stays a clean capture.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/build/footage"
PKG=ps.antiscammer.antiscammer
DEVICE_FILE=/sdcard/aman-scene.mp4

mkdir -p "$OUT"

# Screen coordinates on the 1440x3120 emulator.
NAV_Y=2894
HOME_X=1295; CHECK_X=1006; REPORTS_X=718; LEARN_X=429; PROTECT_X=144

tap () { adb shell input tap "$1" "$2"; sleep "${3:-1.6}"; }

echo "restarting the app detached, so no debug overlay is recorded…"
adb shell am force-stop "$PKG" || true
sleep 1
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 6

# Start on home so the scene always opens the same way.
tap $HOME_X $NAV_Y 2

echo "recording…"
# --time-limit caps it; the choreography below is shorter and we stop early.
# Half the panel's 1440x3120: the emulator's AVC encoder rejects the full
# height, and the frame is scaled down into a 16:9 canvas by build.mjs anyway.
adb shell screenrecord --size 720x1560 --bit-rate 12000000 --time-limit 60 "$DEVICE_FILE" &
REC=$!
sleep 2.5

# Home, then the checker, then a real check, then protection and the overlay.
tap $CHECK_X $NAV_Y 2.4
tap 718 1271 1.2                                   # the URL field
adb shell input text "https://jawwal-prize.win/claim-now"
adb shell input keyevent 111                       # dismiss the keyboard
sleep 1.4
tap 718 1503 4.5                                   # run the check, read the verdict

tap $PROTECT_X $NAV_Y 3.4                          # protection tab
adb shell input swipe 720 2200 720 1100 500
sleep 2.6
tap 1117 2560 3.5                                  # show the test warning overlay
sleep 2

echo "stopping…"
# screenrecord finalises the file on SIGINT, so ask politely rather than kill -9.
adb shell pkill -SIGINT screenrecord || true
wait $REC 2>/dev/null || true
sleep 3

adb pull "$DEVICE_FILE" "$OUT/09-mobile.mp4" >/dev/null
adb shell rm -f "$DEVICE_FILE"

printf "  ✓ 09-mobile.mp4  %s  %ss\n" \
  "$(du -h "$OUT/09-mobile.mp4" | cut -f1)" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/09-mobile.mp4" | cut -c1-5)"
