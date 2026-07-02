# SmartMemo

## Project Status

SmartMemo is an offline memo app currently implemented as a mobile-first web app and an Android WebView package.

Current deliverables:

- Web app: `iphone-memo-app/index.html`
- Android project: `release/SmartMemo-Android`
- Installable Android APK: `release/SmartMemo-debug.apk`
- iOS packaging notes: `iphone-memo-app/IOS_BUILD_NOTES.md`

The current Android package is intended for real-device testing. It uses the existing HTML, CSS, and JavaScript app inside a native Android WebView shell.

## Core Product Direction

SmartMemo is designed around private, offline-first memo management.

Primary goals:

- Keep memos, folders, locked content, history, images, and reminder data available without internet.
- Prioritize data safety before interaction polish.
- Keep the UI close to the SmartMemo visual language: soft rounded panels, champagne-gold accent color, frosted locked cards, compact iPhone-style layout, and smooth mobile interactions.
- Support future Android and iPhone packaging without changing the memo data model unnecessarily.

## Current Features

- Create, edit, autosave, delete, restore, and pin memos.
- Create and manage memo folders/spaces.
- Support nested folders in the current data model.
- Memo and folder locking with password prompts.
- Universal master password support for recovery/testing.
- Locked memos and folders show title text while hiding protected content.
- Image upload, inline display, and large preview.
- Countdown and reminder workflow.
- History for deleted or expired memos/folders.
- Restore deleted history items.
- Restore previous memo edit version from the editor.
- Import/export encrypted `.smemo` backups.
- Import/export preview for folder, memo, and history counts.
- Light/dark theme controls.
- Chinese search input support with IME composition handling.
- Offline Android APK with no internet permission.

## Data And Security

Browser/WebView data is stored locally.

Important storage behavior:

- Main encrypted app payload key: `smartmemo.secure.v1`
- Legacy plaintext password key: `smartmemo.passwords.plain.v1`
- Legacy plaintext passwords are migration-only and should be removed after encrypted save.
- Android app data is retained on normal APK update if the package name and signing identity remain compatible.
- Android app data is deleted by the system if the app is uninstalled.

Backup guidance:

- Before uninstalling or replacing the app, export a `.smemo` backup.
- After reinstall, import the `.smemo` backup to restore folders, memos, history, lock metadata, and images included in the backup.
- Keep backup files outside the app sandbox, such as Downloads, cloud drive, or a computer folder.

## Android Package

Android project path:

```text
release/SmartMemo-Android
```

APK path:

```text
release/SmartMemo-debug.apk
```

Android package:

```text
com.smartmemo.app
```

Current Android config:

- `minSdk`: 23
- `targetSdk`: 35
- `compileSdk`: 35
- `versionCode`: 1
- `versionName`: 1.0.0
- Internet permission: not requested
- WebView entry: `file:///android_asset/www/index.html`

Build command:

```powershell
cd E:\软件\SmartMemo\release\SmartMemo-Android
gradle assembleDebug --no-daemon
```

APK output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

For user testing, the generated APK was copied to:

```text
E:\软件\SmartMemo\release\SmartMemo-debug.apk
```

## Upgrade Rules

To make future APK upgrades smooth:

- Keep `applicationId` unchanged: `com.smartmemo.app`
- Keep signing consistent for release builds.
- Increase `versionCode` for each upgrade.
- Do not rename localStorage keys unless a migration is written.
- Do not remove backup import compatibility for older `.smemo` files.
- Test import/export before distributing any build.

## GitHub Upload Scope

Recommended repository contents:

- `iphone-memo-app/`
- `release/SmartMemo-Android/`
- `release/SmartMemo-debug.apk`
- `smartmemo.md`
- `.gitignore`

Recommended exclusions:

- Electron runtime files in the project root.
- Android SDK and Gradle tools in `tools/`.
- Temporary build folders such as `app/build/`.
- ZIP build archives unless intentionally published as GitHub release assets.

## Verification Checklist

Before publishing a build:

```powershell
cd E:\软件\SmartMemo\iphone-memo-app
node --check app.js
```

Then rebuild Android:

```powershell
cd E:\软件\SmartMemo\release\SmartMemo-Android
gradle assembleDebug --no-daemon
```

Confirm APK exists:

```text
E:\软件\SmartMemo\release\SmartMemo-debug.apk
```

Recommended manual tests:

- Create memo.
- Edit title and body.
- Add image and preview it.
- Lock and unlock memo.
- Lock and unlock folder.
- Export backup.
- Delete memo/folder and restore from history.
- Import backup into a clean app state.
- Update APK over existing install and confirm data is retained.

## Known Future Work

- Add a production release signing workflow.
- Add automated UI smoke tests for lock, restore, reminder, and import/export flows.
- Add native Android file picker/export bridge for smoother backup location control.
- Add native Android notification scheduling for reminder reliability outside the app foreground.
- Prepare a real iOS shell using WKWebView or Capacitor when iPhone packaging resumes.
