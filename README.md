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
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=   # = GOOGLE_IOS_CLIENT_ID của API (đăng ký URL scheme lúc build)
```

Client ID lấy từ `GET /v1/auth/google/config` của API trước, env build chỉ là dự phòng.

**Google trên iOS** (giống phhotel-pms):

1. App mở consent Google bằng iOS client (`GOOGLE_IOS_CLIENT_ID`), redirect `com.googleusercontent.apps.{prefix}:/oauthredirect` (scheme do plugin `@react-native-google-signin/google-signin` trong `app.config.js` đăng ký), PKCE.
2. App gửi `code` + `codeVerifier` + `redirectUri` lên `POST /v1/auth/google/login` (hoặc `/prefill` khi đăng ký); API đổi code bằng iOS client (không secret).

**Google trên Android** — SDK native:

Google từ chối Android client trong luồng trình duyệt (redirect HTTPS bị `redirect_uri_mismatch`, custom scheme bị chặn), nên Android dùng `@react-native-google-signin/google-signin`:

1. SDK nhận diện Android client theo package `app.phgroup.ai_market_vn` + SHA-1 chữ ký app, trả ID token có `aud` = Web client, `azp` = `GOOGLE_ANDROID_CLIENT_ID`.
2. App gửi `idToken` lên `POST /v1/auth/google/login` (hoặc `/prefill`); API kiểm tra `aud`/`azp` nằm trong `GOOGLE_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`.
3. Trên Google Cloud, Android client phải khai báo đúng package và SHA-1 của **cả** key EAS upload và key App Signing của Play Console; nếu thiếu, SDK báo `DEVELOPER_ERROR` và app tự chuyển sang luồng do API host bên dưới.

**Dự phòng** (Expo Go, Android thiếu SHA-1/Play services, iOS chưa có iOS client) — do API host:

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

