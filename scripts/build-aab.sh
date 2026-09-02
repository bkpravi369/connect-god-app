#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

# Auto-detect JAVA_HOME (prioritize OpenJDK 17 LTS, then Android Studio)
if [ -z "${JAVA_HOME}" ] || [ ! -d "${JAVA_HOME}" ]; then
  if [ -d "${HOME}/.jdk/current" ]; then
    export JAVA_HOME="${HOME}/.jdk/current"
  elif [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  elif [ -x "/usr/libexec/java_home" ]; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home 2>/dev/null || true)"
  fi
fi

# Auto-detect ANDROID_HOME if not set
if [ -z "${ANDROID_HOME}" ]; then
  if [ -d "${HOME}/Library/Android/sdk" ]; then
    export ANDROID_HOME="${HOME}/Library/Android/sdk"
  fi
fi

echo "======================================================="
echo "Building Release Android App Bundle (.aab) - Connect GOD"
echo "Package ID: com.bkkozhikode.connectgod"
echo "JAVA_HOME: ${JAVA_HOME}"
echo "ANDROID_HOME: ${ANDROID_HOME}"
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
