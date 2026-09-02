#!/usr/bin/env bash
set -e

KEYSTORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../android/app" && pwd)"
KEYSTORE_PATH="${KEYSTORE_DIR}/release-keystore.jks"
KEY_ALIAS="connectgod"
KEY_PASS="${KEYSTORE_PASSWORD:-connectgod123}"

echo "======================================================="
echo "Generating Android Production Keystore for Connect GOD"
echo "Target: ${KEYSTORE_PATH}"
echo "Key Alias: ${KEY_ALIAS}"
echo "======================================================="

if [ -f "${KEYSTORE_PATH}" ]; then
  echo "Keystore already exists at: ${KEYSTORE_PATH}"
  echo "Skipping creation to prevent overwriting existing keys."
  exit 0
fi

keytool -genkeypair \
  -v \
  -keystore "${KEYSTORE_PATH}" \
  -alias "${KEY_ALIAS}" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "${KEY_PASS}" \
  -keypass "${KEY_PASS}" \
  -dname "CN=Connect GOD, OU=Brahma Kumaris, O=BK Kozhikode, L=Kozhikode, ST=Kerala, C=IN"

echo ""
echo "✅ Keystore generated successfully!"
echo "File location: ${KEYSTORE_PATH}"
echo "Alias: ${KEY_ALIAS}"
echo "Password: ${KEY_PASS}"
echo "Keep this keystore and password secure for all future app updates!"
