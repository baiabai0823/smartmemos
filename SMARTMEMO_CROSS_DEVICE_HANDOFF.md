# SmartMemo 跨设备完整接续手册

本文档用于把当前 SmartMemo 开发环境接续到另一台 Windows 或 macOS 电脑，并让另一台电脑取得相同源码、相同 Git 分支、相同构建配置和相同应用功能。

> 代码通过 GitHub 同步；备忘录、图片、锁定信息和历史记录通过 SmartMemo 的加密 `.smemo` 备份同步。Git 不会同步应用内数据。

## 1. 当前项目身份

| 项目 | 值 |
| --- | --- |
| GitHub | `https://github.com/baiabai0823/smartmemos.git` |
| 当前开发分支 | `codex/ios-interaction-test` |
| 稳定分支 | `main` |
| 正式 Web 源码 | `iphone-memo-app/` |
| iOS 交互测试源码 | `iphone-memo-app-swipe-test/` |
| Android 工程 | `release/SmartMemo-Android/` |
| iOS Capacitor 工程配置 | `release/SmartMemo-iOS/` |
| Android 包名 | `com.smartmemo.app` |
| iOS Bundle ID | `com.baiabai.smartmemo` |
| 主加密存储键 | `smartmemo.secure.v1` |

`codex/ios-interaction-test` 是当前继续开发的分支。未完成 iPhone 真机验收前，不要直接合并到 `main`。

## 2. 会同步和不会同步的内容

GitHub 会同步：

- Web 应用 HTML、CSS、JavaScript 和图标资源。
- Android WebView 工程。
- iOS Capacitor 配置与 GitHub Actions。
- 已明确纳入 Git 的测试 APK。
- 本文档和三个跨设备脚本。

GitHub不会同步：

- 应用中的备忘录、图片、文件夹和历史记录。
- SmartMemo 密码、恢复答案和加密密钥。
- Apple 证书、`.p12`、私钥、Provisioning Profile。
- GitHub/Cloudflare/Apple Token。
- Android SDK、Gradle 缓存、`node_modules` 和临时构建目录。
- 根目录 Electron 运行时和历史发布目录。

要让新设备的应用内容也与旧设备一致，必须完成第 9 节的 `.smemo` 数据迁移。

## 3. 目录结构

```text
SmartMemo/
├── iphone-memo-app/                    # 正式离线 Web 应用
├── iphone-memo-app-swipe-test/         # 隔离的 iOS 交互测试版
├── release/
│   ├── SmartMemo-Android/              # Android WebView 工程
│   ├── SmartMemo-iOS/                  # Capacitor iOS 配置
│   └── SmartMemo-debug.apk             # 测试 APK
├── .github/workflows/
│   ├── validate-ios.yml
│   ├── build-ios-ipa.yml
│   └── build-ios-interaction-test.yml
├── setup-another-device.ps1            # 新电脑初始化
├── sync-smartmemo.ps1                  # 日常安全更新
├── verify-smartmemo.ps1                # 源码验证
├── smartmemo.md                        # 项目概览
└── SMARTMEMO_CROSS_DEVICE_HANDOFF.md   # 本手册
```

## 4. 新 Windows 电脑从零开始

### 4.1 安装工具

至少需要：

- Git 2.40+。
- Node.js 22 LTS。
- Python 3（用于本地 HTTP 服务，可选）。

Android 构建另外需要：

- JDK 17。
- Android SDK 35。
- Gradle，或项目可用的 Gradle Wrapper。
- ADB（安装到 Android 真机时需要）。

检查：

```powershell
git --version
node --version
py --version
java -version
gradle --version
```

### 4.2 一键克隆

先下载仓库中的 `setup-another-device.ps1`，或在 PowerShell 手动执行：

```powershell
Set-Location "$HOME\Documents"
git clone --branch codex/ios-interaction-test --single-branch https://github.com/baiabai0823/smartmemos.git SmartMemo
Set-Location .\SmartMemo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1
```

也可从已经下载的脚本运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-another-device.ps1
```

自定义目录：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-another-device.ps1 -TargetDirectory "D:\Projects\SmartMemo"
```

### 4.3 确认完全一致

```powershell
git status -sb
git branch --show-current
git log -3 --oneline
git rev-parse HEAD
git rev-parse origin/codex/ios-interaction-test
```

最后两个提交哈希应一致，工作区应没有未提交修改。

## 5. macOS 接续

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone --branch codex/ios-interaction-test --single-branch https://github.com/baiabai0823/smartmemos.git SmartMemo
cd SmartMemo
node --check iphone-memo-app/app.js
git diff --check
git status -sb
```

macOS 本地构建 iOS 还需要 Xcode、Command Line Tools、Apple Developer 账号和匹配 Bundle ID 的签名配置。

## 6. 本地运行 Web 应用

正式版：

```powershell
py -m http.server 8080 --directory .\iphone-memo-app
```

浏览器打开：

```text
http://127.0.0.1:8080/
```

如果只有 `python` 命令：

```powershell
python -m http.server 8080 --directory .\iphone-memo-app
```

iOS 交互测试版：

```powershell
py -m http.server 8081 --directory .\iphone-memo-app-swipe-test
```

打开 `http://127.0.0.1:8081/`。

桌面浏览器不能等价模拟 iPhone 虚拟键盘、WKWebView、惯性滚动、触感反馈和企业签名安装。最终交互验收必须使用真机。

## 7. 日常同步代码

在另一台电脑开始工作前：

```powershell
Set-Location D:\Projects\SmartMemo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\sync-smartmemo.ps1
```

脚本会：

1. 确认当前目录是 Git 仓库。
2. 如果存在未提交修改则停止，避免覆盖工作。
3. 获取远程分支。
4. 切换到 `codex/ios-interaction-test`。
5. 使用 `git pull --ff-only`，禁止自动产生复杂合并。
6. 执行源码验证。

手动等价命令：

```powershell
git status --short
git fetch origin
git switch codex/ios-interaction-test
git pull --ff-only origin codex/ios-interaction-test
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1
```

完成修改后：

```powershell
node --check .\iphone-memo-app\app.js
git diff --check
git status --short
git add <本次明确修改的文件>
git commit -m "说明本次 SmartMemo 修改"
git push origin codex/ios-interaction-test
```

不要使用 `git add -A` 无差别加入本地构建产物、证书或个人数据。

## 8. Android APK 构建

当前参数：

- `applicationId`: `com.smartmemo.app`
- `compileSdk`: 35
- `targetSdk`: 35
- `minSdk`: 23
- `versionCode`: 2
- `versionName`: 1.1.0

构建：

```powershell
Set-Location .\release\SmartMemo-Android
gradle assembleDebug --no-daemon
```

输出：

```text
release/SmartMemo-Android/app/build/outputs/apk/debug/app-debug.apk
```

ADB 覆盖升级：

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

要保留 Android 应用数据，必须保持 `applicationId` 和签名身份一致。卸载应用会删除系统沙盒数据，卸载前先导出 `.smemo`。

## 9. 让新设备拥有相同备忘录数据

代码一致不代表应用数据一致。请执行：

1. 在旧设备打开 SmartMemo。
2. 使用应用内导出功能生成加密 `.smemo`。
3. 核对导出预览中的文件夹、备忘录和历史记录数量。
4. 保存到应用沙盒外，例如下载目录、U 盘或可信云盘。
5. 在新设备运行相同版本 SmartMemo。
6. 使用应用内导入功能选择 `.smemo`。
7. 核对文件夹、备忘录、历史、锁定状态和图片。
8. 新设备确认完整前，不卸载旧设备应用。

数据规则：

- 主加密数据键为 `smartmemo.secure.v1`。
- `smartmemo.passwords.plain.v1` 仅用于旧数据迁移。
- Android 正常覆盖升级通常保留数据，卸载会删除数据。
- iOS 容器是否保留取决于 Bundle ID、签名和安装方式。
- 不要把 `.smemo` 备份提交到公共 GitHub 仓库。

## 10. iOS IPA 与 GitHub Actions

Windows 可以准备源码和触发 GitHub macOS Runner，但不能独立完成 Apple 签名。

正式版 unsigned IPA：

1. 打开 `https://github.com/baiabai0823/smartmemos/actions`。
2. 选择 `Build SmartMemo IPA`。
3. 点击 `Run workflow` 并选择目标分支。
4. 下载 `SmartMemo-iOS-unsigned` Artifact。

交互测试版 unsigned IPA：

1. 选择 `Build SmartMemo Interaction Test IPA`。
2. 分支选择 `codex/ios-interaction-test`。
3. 点击 `Run workflow`。
4. 下载 `SmartMemo-iOS-Interaction-Test` Artifact。

使用 GitHub CLI：

```powershell
gh auth login
gh run list --repo baiabai0823/smartmemos --limit 10
gh run download RUN_ID --repo baiabai0823/smartmemos --dir .\artifacts
```

unsigned IPA 不能直接安装。必须使用合法证书和匹配 `com.baiabai.smartmemo` 的 Provisioning Profile 重新签名。

## 11. 验证命令

统一运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1
```

它会检查：

- 正式版和交互测试版 JavaScript 语法。
- 两份 CSS 的大括号数量。
- Git 补丁空白错误。
- 当前分支、提交和工作区状态。

手动检查：

```powershell
node --check .\iphone-memo-app\app.js
node --check .\iphone-memo-app-swipe-test\app.js
git diff --check
git status -sb
```

## 12. 分支规则

- `main` 保存稳定版本。
- `codex/ios-interaction-test` 保存隔离交互测试与当前修复。
- 未完成 iPhone 真机验收前不合并到 `main`。
- 不用测试目录覆盖正式目录。
- 合并前检查备份、导入、锁定、删除/历史恢复、图片、提醒和中文输入。
- 发布前递增 Android `versionCode` 和 iOS `CFBundleVersion`。

## 13. 安全要求

禁止提交或发送：

- 用户备忘录正文和图片。
- 应用密码、主密码、恢复答案或加密密钥。
- GitHub、Cloudflare、Apple Token。
- Apple `.p12`、私钥、证书密码、Provisioning Profile。
- 浏览器 Cookie、登录缓存或系统凭据。

Token 一旦出现在聊天、截图、提交或日志中，应立即撤销并重新生成。

## 14. 常见故障

### Git 推送连接重置

```powershell
git -c http.version=HTTP/1.1 push origin codex/ios-interaction-test
```

不要关闭 TLS 校验。

### 拉取脚本提示工作区不干净

先运行：

```powershell
git status --short
git diff
```

提交或妥善保存自己的修改后再同步。不要使用 `git reset --hard`。

### Node 不可用

```powershell
node -v
where.exe node
```

安装 Node.js 22 LTS 后重新打开终端。

### Android 找不到 JDK/SDK

```powershell
java -version
gradle -v
```

确认 JDK 17 和 Android SDK 35。不要把 SDK 或 Gradle 缓存提交到仓库。

### IPA 无法安装

GitHub Actions 生成的是 unsigned IPA，必须签名。证书、Bundle ID 和 Provisioning Profile 必须一致。

### 新电脑没有旧备忘录

这是正常现象。Git 不同步本地应用数据，请按第 9 节导入 `.smemo`。

## 15. 新设备验收清单

- [ ] 当前分支为 `codex/ios-interaction-test`。
- [ ] 本地 HEAD 与远程分支提交哈希一致。
- [ ] `verify-smartmemo.ps1` 全部通过。
- [ ] 正式 Web 版可以打开。
- [ ] 创建、编辑、删除、恢复和固定备忘录正常。
- [ ] 图片上传和大图预览正常。
- [ ] 文件夹和备忘录锁定正常。
- [ ] 中文输入法组合输入正常。
- [ ] `.smemo` 导入导出数量一致。
- [ ] Android APK 能构建或已有可安装 APK。
- [ ] iOS Actions 能产出 Artifact。
- [ ] 真机测试前存在外部备份。
- [ ] 没有 Token、证书或个人数据进入 Git。

## 16. 新 Codex 任务接续提示

```text
请先完整阅读 smartmemo.md 和 SMARTMEMO_CROSS_DEVICE_HANDOFF.md。
当前分支应为 codex/ios-interaction-test。
先运行 git status -sb、git log -3 --oneline 和 verify-smartmemo.ps1。
不要覆盖未提交修改，不要读取或输出备忘录数据、密码、Token 或签名材料。
完成检查后再继续 SmartMemo 修改，结束前运行 git diff --check。
```

## 17. 最小恢复命令

```powershell
git clone --branch codex/ios-interaction-test --single-branch https://github.com/baiabai0823/smartmemos.git SmartMemo
Set-Location .\SmartMemo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1
py -m http.server 8080 --directory .\iphone-memo-app
```

打开 `http://127.0.0.1:8080/`，应用数据另行通过 `.smemo` 迁移。
