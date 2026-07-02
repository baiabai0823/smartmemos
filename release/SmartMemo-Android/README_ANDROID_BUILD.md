# SmartMemo Android APK Build

This is a native Android WebView wrapper for the offline SmartMemo web app.

## Requirements

- JDK 17+
- Android SDK installed
- Gradle installed, or add a Gradle wrapper on a machine with Gradle available

## Build Debug APK

From this folder:

```powershell
gradle assembleDebug
```

Output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

The debug APK is installable on Android after enabling installation from unknown sources.

## Upgrade Safety

Keep `applicationId 'com.smartmemo.app'` unchanged for upgrades. Android app data is retained on normal APK update, but deleted if the app is uninstalled.