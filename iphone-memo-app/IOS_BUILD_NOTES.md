# SmartMemo iOS Packaging Notes

## Current Package Status

This folder is a complete offline web app package for SmartMemo. It contains:

- index.html
- app.js
- styles.css
- manifest.webmanifest
- assets/smartmemo-logo*.png

The app has no CDN or internet runtime dependency. Data is stored locally, and passwords are migrated into the encrypted main data payload.

## Can This Windows Machine Create An Installable IPA?

No. An installable iPhone IPA must be compiled and signed with Apple's iOS signing chain. That requires:

- macOS
- Xcode
- Apple Developer account or a valid local development signing identity
- A bundle identifier, provisioning profile, and signed archive/export step

Windows can prepare the web assets and an iOS-ready source package, but it cannot produce a real installable signed IPA by itself.

## Recommended iPhone Build Path

Use one of these wrappers on a Mac:

1. Capacitor iOS wrapper
   - Create a Capacitor app shell.
   - Copy this web package into the Capacitor `www` folder.
   - Run `npx cap add ios` and open the iOS project in Xcode.
   - Set bundle id, signing team, icons, then Archive and Export IPA.

2. Native WKWebView wrapper
   - Add these files as bundled resources in an Xcode iOS project.
   - Load `index.html` through WKWebView using local file access.
   - Use Xcode Archive to export IPA.

## Upgrade Safety

For future app upgrades, keep the same bundle identifier and the same storage keys:

- `smartmemo.secure.v1`
- `smartmemo.passwords.plain.v1` only as legacy migration input

The current version reads the old plaintext password key once, migrates it into the encrypted main payload, then removes the legacy plaintext key on save.

Always test upgrade with an exported `.smemo` backup before shipping a new IPA.