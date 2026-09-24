# AI Markets — Expo app

Native iOS & Android client for [aimarkets.vn](https://aimarkets.vn), using the same `ai-marketplace-api` as the web app (`https://api.aimarkets.vn/v1`). Structure follows **PHHotel PMS** (Expo Router, AuthContext, Google AuthSession, React Query).

## Package

| Platform | ID |
|---|---|
| iOS bundle | `app.phgroup.ai-market-vn` |
| Android applicationId | `app.phgroup.ai_market_vn` (Play Store không cho dấu `-`) |
| URL scheme | `aimarkets://` |

## Run

```bash
cd ai-marketplace-app
npm install
npx expo start
```

Đặt `.env` (hoặc EAS env):

```
EXPO_PUBLIC_API_URL=https://api.aimarkets.vn/v1
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=   # = GOOGLE_IOS_CLIENT_ID của API, đọc lúc build
```

**Google trên iOS** (khi build có `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` và API có cùng `GOOGLE_IOS_CLIENT_ID`):

1. App mở consent Google bằng iOS client, redirect `com.googleusercontent.apps.{prefix}:/oauthredirect` (scheme do `app.config.js` đăng ký), PKCE.
2. App gửi `code` + `codeVerifier` + `redirectUri` lên `POST /v1/auth/google/login` (hoặc `/prefill` khi đăng ký); API đổi code bằng iOS client (không secret).

**Google trên Android** (và iOS chưa cấu hình iOS client) — do API host:

Google không còn cho custom URI scheme trên Android, và Android client không có redirect URI, nên `GOOGLE_ANDROID_CLIENT_ID` chỉ dùng để API chấp nhận ID token (`azp`) từ SDK Google native (Credential Manager). Không có SDK đó, app dùng luồng sau:

1. App mở `GET /v1/auth/google/start?mobile=1&scheme=aimarkets[&mode=signup]` bằng `WebBrowser.openAuthSessionAsync` (ASWebAuthenticationSession trên iOS, Custom Tabs trên Android).
2. API chuyển sang Google bằng Web client (`GOOGLE_CLIENT_ID`); Google trả code về `https://api.aimarkets.vn/v1/auth/google/callback` — redirect URI duy nhất cần khai báo trên Google Cloud (web cũng dùng chung).
3. API đổi code lấy phiên rồi redirect về `aimarkets://oauthredirect?token=…&refreshToken=…` (login) hoặc `?google=prefill&…` (đăng ký), hoặc `?google=error&message=…`.
4. `services/googleAuth.ts` đọc deep link đó; `app/oauthredirect.tsx` chỉ là màn hứng khi Android đẩy deep link qua router.

Cần chạy bằng development/production build (scheme `aimarkets`), không dùng Expo Go.

## IAP (ví trên app)

Expo Go **không** mua được. Cần development / production build có `expo-iap` + `expo-dev-client`.

| | |
|---|---|
| iOS bundle | `app.phgroup.ai-market-vn` |
| Android package | `app.phgroup.ai_market_vn` |
| SKU (consumable) | `aimarkets.wallet.5` … `aimarkets.wallet.100` |

```bash
npx expo start --dev-client
npm run build:dev:android
npm run build:dev:ios
```

API production luôn gọi Apple / Google để verify. Đặt trên Dokploy:

- Apple: `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY` (In-App Purchase key .p8)
- Google: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (service account có quyền Android Publisher)

`IAP_SKIP_VERIFY` bị bỏ qua khi `NODE_ENV=production`.

