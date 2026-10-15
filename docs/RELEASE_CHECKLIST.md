# AI Markets app — store release checklist (v1.1.0)

Do **not** submit from CI; a human submits after review.

## 1. Pre-flight (local, Windows PowerShell in the repo root)
```powershell
git checkout master; git pull
npm ci
npx tsc --noEmit                         # must be clean
npx expo export --platform android --output-dir .expo-export\android   # JS bundle check
npx expo export --platform ios --output-dir .expo-export\ios
npx expo-doctor                          # dependency/version sanity
```

## 2. Config to verify
| Item | Value |
|---|---|
| version (app.json) | 1.1.0 (build numbers auto-increment remotely: `appVersionSource: remote`, `autoIncrement: true`) |
| iOS bundleIdentifier | app.phgroup.ai-market-vn |
| Android package | app.phgroup.ai_market_vn |
| Icons | assets/images/icon.png (1024², no alpha for iOS), adaptive-icon.png, splash-icon.png |
| API | EXPO_PUBLIC_API_URL=https://api.aimarkets.vn/v1 (eas.json production) |
| GPay | hidden unless EXPO_PUBLIC_GPAY_ENABLED=true (leave unset) |
| eas submit android track | `internal` (was an invalid value) — promote in Play Console |

## 3. Store-compliance
- Wallet top-up in native builds = IAP only (expo-iap). VietQR / bank-transfer info is now hidden on iOS/Android (App Store 3.1.1, Google Play Payments); it stays on web.
- No payment intermediaries; no PayPal; GPay copy off.
- Account deletion in app (Settings → Account) — required by Apple 5.1.1(v) and Play.
- Permission strings: confirm Vietnamese text for camera/photos (expo-image-picker), microphone (expo-audio, if recording is used), Face ID (expo-local-authentication). Add explicit `microphonePermission` / `faceIDPermission` plugin options if the defaults are English.
- `NSAllowsArbitraryLoadsInWebContent` + ATS exceptions: be ready to justify (OpenClaw/Hermes web views) in App Review notes.
- Privacy: App Privacy (iOS) / Data safety (Play) forms — email, name, purchase history, device id for push.
- Demo account for reviewers (buyer + seller), with wallet balance via sandbox IAP.

## 4. Build (EAS)
```powershell
npx --yes eas-cli@latest login
npx --yes eas-cli@latest build --platform android --profile production
npx --yes eas-cli@latest build --platform ios --profile production
# Internal test first:
npx --yes eas-cli@latest build --platform android --profile preview
```

## 5. Submit (manual, after QA — not automated)
```powershell
npx --yes eas-cli@latest submit --platform android --profile production --latest
npx --yes eas-cli@latest submit --platform ios --profile production --latest
```

## 6. QA script (TestFlight / Play internal)
- Sign in (email + Google), forgot password (email arrives, link opens /reset-password), sign-in notice toggle in Settings.
- Seller centre → Products: switch Sản phẩm số / Hàng hóa vật lý; rates 7% / 1.5% for cá nhân, none for hộ kinh doanh/doanh nghiệp.
- Rent an agent twice quickly → only one charge (Idempotency-Key).
- Complaint create → confirmation notification; refund appears in wallet.
- IAP sandbox top-up credits wallet once.
