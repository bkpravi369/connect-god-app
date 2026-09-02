#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "======================================================="
echo "Building Release Android App Bundle (.aab) - Connect GOD"
echo "Package ID: com.bkkozhikode.connectgod"
echo "======================================================="

# 1. Build Web Assets
echo ""
echo "▶ Step 1/3: Building web distribution (dist)..."
npm run build

# 2. Copy Service Worker and sync Capacitor
echo ""
echo "▶ Step 2/3: Syncing Android platform with Capacitor..."
if [ -f "public/service-worker.js" ]; then
  cp public/service-worker.js dist/service-worker.js
fi
npx cap sync android

# 3. Build AAB Bundle
echo ""
echo "▶ Step 3/3: Running Gradle bundleRelease..."
cd android

if [ -f "app/release-keystore.jks" ]; then
  echo "Found release-keystore.jks. Building signed release AAB..."
  ./gradlew bundleRelease
else
  echo "No release-keystore.jks found. Building release bundle..."
  ./gradlew bundleRelease
fi

AAB_PATH="${PROJECT_ROOT}/android/app/build/outputs/bundle/release/app-release.aab"

if [ -f "${AAB_PATH}" ]; then
  echo ""
  echo "======================================================="
  echo "🎉 SUCCESS: Release AAB bundle created!"
  echo "Location: ${AAB_PATH}"
  echo "File Size: $(du -h "${AAB_PATH}" | cut -f1)"
  echo "Ready for Google Play Store upload!"
  echo "======================================================="
else
  echo ""
  echo "⚠️ Note: Check android/app/build/outputs/bundle/release/ for generated bundle."
fi
