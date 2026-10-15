#!/usr/bin/env bash
# Builds Tickbook.apk with only the Android SDK command-line tools (no Gradle).
# Needs: JDK 17+, ANDROID_HOME with platforms;android-34 and build-tools;35.0.0
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:?set ANDROID_HOME to your Android SDK}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex"

"$BT/aapt2" compile --dir app/res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest app/AndroidManifest.xml \
  -A app/assets "$OUT/res.zip" --java "$OUT/gen" \
  --min-sdk-version 24 --target-sdk-version 34 --version-code 1 --version-name 1.0

javac -source 8 -target 8 -Xlint:-options -classpath "$JAR" -d "$OUT/classes" \
  $(find app/src "$OUT/gen" -name '*.java')
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')

cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

KS=tickbook.keystore
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias tickbook -keyalg RSA -keysize 2048 -validity 36500 \
    -storepass tickbook -keypass tickbook -dname "CN=Tickbook" >/dev/null
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:tickbook --key-pass pass:tickbook --out Tickbook.apk "$OUT/aligned.apk"
"$BT/apksigner" verify Tickbook.apk
echo "Built $(pwd)/Tickbook.apk"
