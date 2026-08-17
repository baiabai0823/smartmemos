# SmartMemo iOS Interaction Test - Cross-Device Handoff

This document is the complete handoff guide for the isolated SmartMemo iOS interaction test version. It is intended for moving development and testing to another Windows computer, Mac, iPhone, or Codex workspace without mixing the test implementation into the current formal version.

## 1. Project Identity

- Repository: `https://github.com/baiabai0823/smartmemos`
- Test branch: `codex/ios-interaction-test`
- Remote test commit at handoff: `185207d6ba5c2ebf9d26ff147cf39c09591b2fef`
- Formal application source: `iphone-memo-app/`
- Isolated interaction test source: `iphone-memo-app-swipe-test/`
- iOS Capacitor build project: `release/SmartMemo-iOS/`
- Test build workflow: `.github/workflows/build-ios-interaction-test.yml`
- Bundle identifier: `com.baiabai.smartmemo`
- Test version: `1.1.5`
- Test build number: `7`

The test source is intentionally separate. Do not copy it over `iphone-memo-app/` until its behavior has been accepted on a real iPhone.

## 2. Implemented Test Features

### Memo card interaction mode

Settings contains a `Memo Actions` segmented control:

- `Long Press`: long press displays the existing Pin and Delete actions.
- `Swipe`: swipe right displays Pin; swipe left displays Delete.
- Only one action presentation mode is active at a time.
- Long-press drag and drop remains available in both modes.

### Swipe behavior

- Only one Memo row can stay open.
- Swipe actions are rendered beneath the Memo card as one glass-style surface.
- The original Pin and Delete icons are retained.
- The opposite card edge receives a subtle fade while an action is revealed.
- Tapping outside an open row closes it.
- Pin executes immediately and closes the row.
- Delete uses an inline two-step confirmation:
  1. Tap the Delete icon.
  2. Tap the compact `Confirm` action.
- Delete does not open the old large confirmation modal in Swipe mode.

### Memo list scrolling

- Vertical movement wins over long-press actions before the long-press threshold is reached.
- Memo cards use one gesture owner for scrolling, swipe recognition, and long-press drag.
- Momentum is applied after vertical release.
- Vault and folder Memo lists use the same gesture path.
- History uses native iOS momentum scrolling because History cards do not support drag sorting.

### Editor caret tracking

- While text is actively entered, the Memo body follows the collapsed caret position.
- The active line is kept above the visible iOS keyboard boundary.
- `visualViewport` is used to measure the actual keyboard-reduced viewport.
- Keyboard-safe bottom padding is applied to the Memo scroll container.
- Selection changes alone do not force the document back to the caret.
- When the user stops typing, the editor can be freely scrolled to inspect earlier content.

## 3. Get The Code On Another Computer

Install Git and GitHub CLI first. Then run:

```powershell
git clone https://github.com/baiabai0823/smartmemos.git
Set-Location smartmemos
git switch codex/ios-interaction-test
git pull --ff-only origin codex/ios-interaction-test
```

Confirm the expected branch and files:

```powershell
git branch --show-current
git log -1 --oneline
Get-ChildItem iphone-memo-app-swipe-test
```

Expected branch:

```text
codex/ios-interaction-test
```

The test application entry point is:

```text
iphone-memo-app-swipe-test/index.html
```

## 4. Run The Web Test Locally

The app can be opened directly as a file, but a local HTTP server gives more consistent browser behavior.

With Python:

```powershell
Set-Location iphone-memo-app-swipe-test
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080/
```

With Node.js:

```powershell
npx serve iphone-memo-app-swipe-test -l 8080
```

Important limitation: desktop browsers cannot reproduce the iOS virtual keyboard, WKWebView viewport behavior, haptics, or enterprise installation. Final acceptance must be performed on a real iPhone.

## 5. Build The Unsigned IPA With GitHub Actions

No Mac is required for this route. GitHub provides the macOS Runner.

1. Open the repository on GitHub.
2. Open `Actions`.
3. Select `Build SmartMemo Interaction Test IPA`.
4. Select `Run workflow`.
5. Choose branch `codex/ios-interaction-test`.
6. Wait for `build-unsigned-ipa` to complete.
7. Download artifact `SmartMemo-iOS-Interaction-Test`.

The workflow performs:

- JavaScript syntax validation.
- Copy of only `iphone-memo-app-swipe-test/` into Capacitor `www/`.
- `npm ci` with the locked dependencies.
- Capacitor iOS project generation and synchronization.
- Unsigned Xcode Release archive.
- IPA ZIP structure verification.
- SHA-256 generation.
- Artifact upload.

Latest validated run at handoff:

```text
https://github.com/baiabai0823/smartmemos/actions/runs/31789913332
```

## 6. Current IPA Artifact

Local file in the original workspace:

```text
release/ios-interaction-test-31789913332/SmartMemo-Interaction-Test-unsigned.ipa
```

SHA-256:

```text
c4b89d4d31455809539dc5ab4a604df4d953d5aff51e14aef6db69695b92a793
```

Verify on Windows:

```powershell
Get-FileHash .\SmartMemo-Interaction-Test-unsigned.ipa -Algorithm SHA256
```

Verify on macOS or Linux:

```bash
shasum -a 256 SmartMemo-Interaction-Test-unsigned.ipa
```

This IPA is unsigned. It cannot be installed directly until it is signed with a valid Apple development, ad hoc, or enterprise provisioning identity.

## 7. Sign And Install With An Enterprise Certificate

Use the organization's approved signing system. Required signing inputs normally include:

- Distribution certificate and private key.
- Matching enterprise provisioning profile.
- Bundle ID authorization for `com.baiabai.smartmemo`.
- Correct entitlements for enabled capabilities.

Do not commit certificates, `.p12` files, certificate passwords, provisioning profiles, private keys, or signing secrets to this repository.

After signing, verify:

- The signed IPA still contains `Payload/SmartMemo.app`.
- The embedded provisioning profile matches the Bundle ID.
- The signing certificate is trusted and not expired.
- The target iPhone is covered by the enterprise deployment policy.
- The installed version displays as `1.1.5 (7)`.

## 8. Real iPhone Acceptance Checklist

### Swipe mode

1. Open Settings and select `Swipe`.
2. Swipe one Memo to the right.
3. Confirm the Pin icon appears during the gesture, not only after release.
4. Tap Pin and confirm the Memo becomes pinned.
5. Swipe another Memo to the left.
6. Tap Delete once and confirm the compact `Confirm` state appears.
7. Tap outside and confirm the row closes without opening the Memo or navigating away.
8. Repeat deletion and tap `Confirm`; verify the Memo moves to History.
9. Confirm only one row remains open at a time.

### Long Press mode

1. Open Settings and select `Long Press`.
2. Confirm swiping does not reveal actions.
3. Long press a Memo and confirm the original Pin and Delete controls appear.
4. Long press and drag the Memo to reorder it.
5. Confirm normal vertical scrolling cancels the pending long press.

### Scroll behavior

1. Test a long Vault list by starting the gesture directly on Memo text.
2. Test the same gesture on the Memo card edge.
3. Repeat in several nested folders.
4. Repeat in History.
5. Confirm a fast release continues with momentum.
6. Confirm vertical movement does not accidentally reveal Swipe actions.

### Editor caret behavior

1. Open a long Memo on iPhone.
2. Place the caret near the end and type several new lines.
3. Confirm every active line remains visible above the keyboard.
4. Stop typing.
5. Scroll upward to read earlier text.
6. Confirm the editor does not jump back to the caret.
7. Type one character and confirm the view immediately returns to the active caret line.
8. Test with Chinese Pinyin composition, English input, deletion, and line breaks.

## 9. Data Safety

- The test and formal versions currently use the same Bundle ID.
- Installing one over the other can update the same application container, depending on the signing identity and provisioning profile.
- Export and verify a SmartMemo backup before installing a test build over an existing installation.
- Never test destructive operations against the only copy of important Memo data.
- Keep at least one verified backup outside the phone.
- Do not clear application storage or uninstall until backup verification succeeds.

For fully isolated side-by-side installation, create a separate test Bundle ID, for example:

```text
com.baiabai.smartmemo.interactiontest
```

That change requires a matching provisioning profile and should only be made in the test workflow.

## 10. Source Validation

Run before every build:

```powershell
node --check iphone-memo-app-swipe-test\app.js
git diff --check
```

Check that CSS block counts remain balanced if editing the large stylesheet:

```powershell
$css = Get-Content -Raw iphone-memo-app-swipe-test\styles.css
$open = ([regex]::Matches($css, '\{')).Count
$close = ([regex]::Matches($css, '\}')).Count
"CSS braces: $open/$close"
```

The two numbers must match.

## 11. Troubleshooting

### Swipe actions do not appear

- Confirm `Settings > Memo Actions > Swipe` is selected.
- Confirm the Memo is not locked.
- Begin the gesture horizontally; vertical intent intentionally enters scrolling.
- Reload the installed test build after installing a newly signed IPA.

### First action tap does nothing

- Confirm the installed IPA was built from a run newer than `31789913332` or from the current branch head.
- Old test builds contained a click suppression bug.

### Memo list does not scroll

- Start with a clear vertical movement.
- Verify the current source contains `noteMomentumFrame` and the final History `touch-action: pan-y` rules.
- Confirm no later CSS rule reintroduces `touch-action: none` for History cards.

### Editor jumps to the caret while reading

- Confirm `selectionchange` only saves selection state and does not call `keepEditorCaretVisible()`.
- Confirm caret following is gated by `lastEditorInputAt`.
- Test on a real iPhone because desktop keyboard behavior is not equivalent.

### Git push fails but GitHub API works

The local network has previously reset Git smart-HTTP TLS connections. Retry:

```powershell
git -c http.version=HTTP/1.1 push
```

Do not use insecure TLS settings. If the connection remains unstable, wait and retry from a reliable network.

## 12. Rules For Continuing Development

- Continue test work only on `codex/ios-interaction-test`.
- Do not overwrite user changes in `iphone-memo-app/`.
- Do not merge the test branch into the formal branch before real-device acceptance.
- Keep Swipe actions connected to the existing `togglePin()` and `deleteNote()` data functions.
- Do not create a second independent data mutation path for Swipe mode.
- Keep Long Press and Swipe presentation mutually exclusive.
- Preserve long-press drag behavior in both presentation modes.
- Never log Memo content, passwords, recovery answers, encryption keys, or certificate material.
- Build a fresh IPA and verify SHA-256 after every accepted interaction change.

## 13. Recommended Next Step

Install the newly signed test IPA on a non-primary iPhone or after exporting and verifying a backup. Complete every item in the real iPhone acceptance checklist. Only after those tests pass should the isolated implementation be reviewed for promotion into `iphone-memo-app/`.
