# AI Markets app — store release checklist (v1.2.0)

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
| version (app.json) | 1.2.0 (build numbers auto-increment remotely: `appVersionSource: remote`, `autoIncrement: true`) |
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
- Agent Marketplace → Vote tab: nominate a GitHub repo (signed in), vote / unvote toggles the count, leaderboard shows #1 highlighted, Pending and "Voted & Listed" sections render; signed out shows "Sign in to nominate".
- Agent Marketplace → Public: approved community agents appear as Community cards (badge, stars, votes, "Coming soon", GitHub ↗ opens the repo).
- Seller centre → Compute nodes: only published gpu-compute / game-server products are selectable; hosting External vs AI Markets GPU; webhook URL must be https; "Generate" creates a whsec_ secret shown once with Copy (hidden after save; edit keeps the stored secret when left blank); node list Ping / Edit / Remove (confirm).
- Launch an agent without a plan → rent confirm → launch notice (charged amount, paid-until, auto-renew, Open / Setup / Wallet). Force a launch failure on staging → notice says "refunded", wallet shows the reversal; if the refund call fails the notice shows the transaction id for support.

## 7. Feature parity with web (v1.1.0)
| Feature | App | Notes |
|---|---|---|
| Vote tab + community agents in Public | ✅ | `components/agents/CommunityVote.tsx`, `/community-agents` endpoints |
| Compute node registration | ✅ | `app/seller-center/compute.tsx`, `/seller/compute/*` endpoints |
| Launch notice + auto-refund on launch failure | ✅ | `components/agents/LaunchNoticeModal.tsx`; refund via `POST /agents/subscriptions/:kind/refund`, rent keeps its Idempotency-Key |
| Admin community moderation (approve / reject / close cycle) | web only | admin tool, not exposed in the app |
| Webhook flow diagram + developer docs on the compute page | web only | link to aimarkets.vn/docs |

## 1.2.0 — "Tiếp tục trên điện thoại" (cross-device handoff)
- New native module **expo-camera** (QR scan) → needs a new native build; an OTA/JS-only update is NOT enough.
- iOS camera permission string (Vietnamese) comes from the `expo-camera` plugin in app.json; Android `recordAudioAndroid: false` (no mic permission added).
- App Review notes: camera is used only to scan the pairing QR shown on aimarkets.vn; manual 8-character code entry works without camera.
- Smoke test before submit (two devices, same account):
  1. Web: Builder project → "Tiếp tục trên điện thoại" → QR + code.
  2. App: Tài khoản → Thiết bị đã kết nối → Quét mã tiếp tục → scan (or type code) → the project opens in the app builder.
  3. Send a prompt on web → the app shows "Thiết bị khác … đang tạo" and refreshes when done (and vice versa).
  4. Web /account/devices lists the phone; Revoke → app sync stops; code from another account → "thuộc tài khoản khác".
  5. Deep link `aimarkets://handoff/<CODE>` opens the claim screen.
- Universal links for https://aimarkets.vn/handoff/* are NOT active yet (no apple-app-site-association / assetlinks.json served); the https page offers "Mở trong app" instead.
