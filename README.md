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
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_REDIRECT_URI=https://aimarkets.vn/assets/oauth/google-mobile.html
```

Trên Google Cloud (cùng project PHGroup AI, **thêm Android/iOS OAuth clients** nếu dùng native):

- Authorized redirect: `https://aimarkets.vn/assets/oauth/google-mobile.html`
- iOS URL scheme: `com.googleusercontent.apps.{ios-client-prefix}`
- Android package: `app.phgroup.ai_market_vn`

Web OAuth bridge file lives in `ai-marketplace/public/assets/oauth/google-mobile.html` (redirects to `aimarkets://oauthredirect`).

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

