#!/bin/bash

cd /workspaces/BIXTX
mkdir -p .github/workflows

# ─── build-linux.yml ───
cat > .github/workflows/build-linux.yml << 'YAML'
name: Build Linux Agent
on:
  workflow_dispatch:
  push:
    paths: ['software-linux/**', '.github/workflows/build-linux.yml']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: tar -czf bixtx-agent-linux.tar.gz -C software-linux . --exclude=node_modules --exclude=.git
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: linux-build-${{ github.run_number }}
          files: bixtx-agent-linux.tar.gz
      - name: Notify Backend
        run: |
          curl -X POST "${{ secrets.RENDER_APK_NOTIFY_URL }}/build/linux/notify" \
            -H "Content-Type: application/json" \
            -d '{"status":"completed","downloadUrl":"https://github.com/${{ github.repository }}/releases/download/linux-build-${{ github.run_number }}/bixtx-agent-linux.tar.gz","secret":"${{ secrets.RENDER_APK_NOTIFY_SECRET }}"}'
YAML

# ─── build-windows.yml ───
cat > .github/workflows/build-windows.yml << 'YAML'
name: Build Windows Agent
on:
  workflow_dispatch:
  push:
    paths: ['software-windows/**', '.github/workflows/build-windows.yml']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Zip package
        shell: pwsh
        run: Compress-Archive -Path software-windows/* -DestinationPath bixtx-agent-windows.zip
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: windows-build-${{ github.run_number }}
          files: bixtx-agent-windows.zip
      - name: Notify Backend
        shell: bash
        run: |
          curl -X POST "${{ secrets.RENDER_APK_NOTIFY_URL }}/build/windows/notify" \
            -H "Content-Type: application/json" \
            -d '{"status":"completed","downloadUrl":"https://github.com/${{ github.repository }}/releases/download/windows-build-${{ github.run_number }}/bixtx-agent-windows.zip","secret":"${{ secrets.RENDER_APK_NOTIFY_SECRET }}"}'
YAML

# ─── build-android.yml ───
cat > .github/workflows/build-android.yml << 'YAML'
name: Build Android APK
on:
  workflow_dispatch:
  push:
    paths: ['software-android/**', '.github/workflows/build-android.yml']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: android-actions/setup-android@v3
      - name: Decode keystore
        run: |
          if [ -n "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" ]; then
            echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > software-android/app/keystore.jks
            cat > software-android/keystore.properties << EOF
          storePassword=${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}
          keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}
          storeFile=keystore.jks
          EOF
          fi
      - name: Build release APK
        run: |
          cd software-android
          chmod +x gradlew
          ./gradlew assembleRelease --no-daemon
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: android-build-${{ github.run_number }}
          files: software-android/app/build/outputs/apk/release/app-release.apk
      - name: Notify Backend
        run: |
          curl -X POST "${{ secrets.RENDER_APK_NOTIFY_URL }}/build/android/notify" \
            -H "Content-Type: application/json" \
            -d '{"status":"completed","downloadUrl":"https://github.com/${{ github.repository }}/releases/download/android-build-${{ github.run_number }}/app-release.apk","secret":"${{ secrets.RENDER_APK_NOTIFY_SECRET }}"}'
YAML

# ─── build-macos.yml ───
cat > .github/workflows/build-macos.yml << 'YAML'
name: Build macOS Agent
on:
  workflow_dispatch:
  push:
    paths: ['software-macos/**', '.github/workflows/build-macos.yml']
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: tar -czf bixtx-agent-macos.tar.gz -C software-macos . --exclude=node_modules --exclude=.git
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: macos-build-${{ github.run_number }}
          files: bixtx-agent-macos.tar.gz
      - name: Notify Backend
        run: |
          curl -X POST "${{ secrets.RENDER_APK_NOTIFY_URL }}/build/macos/notify" \
            -H "Content-Type: application/json" \
            -d '{"status":"completed","downloadUrl":"https://github.com/${{ github.repository }}/releases/download/macos-build-${{ github.run_number }}/bixtx-agent-macos.tar.gz","secret":"${{ secrets.RENDER_APK_NOTIFY_SECRET }}"}'
YAML

# ─── build-ios.yml ───
cat > .github/workflows/build-ios.yml << 'YAML'
name: Build iOS Agent
on:
  workflow_dispatch:
  push:
    paths: ['software-ios/**', '.github/workflows/build-ios.yml']
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Placeholder — requires Apple signing secrets
        run: |
          echo "iOS build requires IOS_P12_BASE64, IOS_P12_PASSWORD, IOS_MOBILEPROVISION_BASE64"
          echo "Once you have these, uncomment the xcodebuild steps."
YAML

# ─── build-harmony.yml ───
cat > .github/workflows/build-harmony.yml << 'YAML'
name: Build HarmonyOS HAP
on:
  workflow_dispatch:
  push:
    paths: ['software-harmony/**', '.github/workflows/build-harmony.yml']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Placeholder — requires DevEco command-line tools
        run: |
          echo "HarmonyOS build requires DevEco Studio CLI + Huawei signing secrets"
          echo "See: https://developer.huawei.com/consumer/en/doc/harmonyos-guides/"
YAML

echo "✅ Workflows created:"
ls -la .github/workflows/