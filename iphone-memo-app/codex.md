# SmartMemo iPhone Memo App

## Project Overview

This project is a static first-version iPhone memo app prototype built from the Word requirements document and styled with reference to the existing SmartMemo Electron app resources.

The app is implemented with plain HTML, CSS, and JavaScript so it can run directly from `index.html` without installing dependencies. It is intended as a functional prototype that can later be wrapped with Capacitor, Cordova, WKWebView, or a native iOS shell for real iPhone deployment.

## Files

- `index.html`: App entry point and hidden file inputs for image and backup import.
- `styles.css`: Full UI styling, including SmartMemo-inspired vault UI, light/dark themes, memo editor, modals, dock navigation, locked/frosted states, and settings controls.
- `app.js`: App state, local encrypted persistence, memo/folder CRUD, password locking, image staging, countdown reminders, history, import/export, and UI rendering.
- `codex.md`: Project notes for future Codex sessions.

## How To Run

Open this file in a browser:

```text
E:\软件\SmartMemo\iphone-memo-app\index.html
```

No build step is required.

## Main Features

- Memo creation, editing, deletion, and local autosave.
- Memo Files / Spaces for grouping memos.
- Folder-level password lock.
- Memo-level password lock.
- Locked memo and locked folder cards use a frosted/blurred style until unlocked.
- Image upload into a temporary image staging area inside the memo editor.
- Countdown and fixed-time reminder support.
- History page for deleted memos and expired reminder memos.
- History supports restoring and deleting entries.
- Expired memo restore requires setting a new reminder time.
- Encrypted `.smemo` export for all memos, one folder, or one memo.
- Encrypted `.smemo` import restore.
- Export success/failure and import success/failure result modals.
- Light/dark theme toggle with sun/moon slider.
- Chinese search input support with IME composition handling.

## Storage

The app stores data in browser `localStorage`.

- Main memo/folder/history data is stored encrypted under `smartmemo.secure.v1`.
- Password data is now migrated into the encrypted main payload. The old `smartmemo.passwords.plain.v1` key is read only for legacy migration, then removed on save.
- Exported `.smemo` files include encrypted app data and password manifest fields for restore.

## Current UI Direction

The UI follows the SmartMemo/Vault style:

- Vault-oriented home screen.
- Rounded, soft, iPhone-like surfaces.
- Gold accent color.
- Light theme with stronger black text for readability.
- Low-brightness cards by default, brighter on hover.
- Bottom dock with `VAULT`, center `+`, and `HISTORY`.
- Centered modals with large rounded corners.
- Memo editor with a simplified control center and image staging area.

## Important Implementation Notes

- Search should not re-render during Chinese IME composition. Keep the `compositionstart` and `compositionend` handlers if search is refactored.
- `favorite` and `category` may still exist on older memo records for backward compatibility, but the UI no longer exposes favorites or category chips.
- Browser notifications are limited by browser permissions and foreground behavior.
- True iOS lock-screen alarm behavior requires native iOS notification APIs. The current prototype simulates the reminder workflow in-browser.
- Because this is static browser code, downloaded export files go to the browser's default download folder, usually `Downloads`.

## Verification Commands

Run from:

```text
E:\软件\SmartMemo\iphone-memo-app
```

Syntax check:

```powershell
node --check app.js
```

Useful residue checks:

```powershell
rg -n "收藏|toggle-favorite|左滑查看更多|本地明文密码表|renderTabs\(" app.js styles.css
```

## Known Follow-Ups

- Add a real iOS shell and replace browser-only APIs with native storage, notification, camera, and file APIs.
- Add stronger test coverage around encrypted import/export and restore behavior.
- Add optional drag ordering for staged images.
- Decide whether restored locked memos should preserve their original password or intentionally restore unlocked.
- If moving to a framework, keep the current UX contract before refactoring.

- iOS packaging notes live in IOS_BUILD_NOTES.md. A signed IPA requires macOS, Xcode, and Apple signing credentials.
