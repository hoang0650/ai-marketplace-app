# iPhone Duo release notes

Updated on 2026-10-28.

## Changes
- Expo SDK 58 and its matching native modules, React and React Native versions; package-lock.json updated.
- EAS iOS uses sdk-58 (Xcode 27.1 toolchain), with Node 22.16.0 for all build profiles. The locally installed Node 25 is outside Expo 58's supported engine range; use Node 22 LTS for local development.
- iOS tabs use UIKit NativeTabs so the system can place navigation in the Duo rail. Android/web retain their existing tabs.
- Initial orientation is default; startup and leaving GPU play restore free rotation.
- Screen respects left/right safe areas and native tab bottom insets.
- Explore, category hubs and seller catalogs calculate 1–4 columns from current window width, including Split View. Query/filter state stays in the parent when column count changes; scroll position resets when the list remounts.
- Updated ScrollView refs, WebView generic props, refresh callbacks and empty components to match SDK 58 types.

## Before release
1. Build using EAS production or a Mac with Xcode 27.1. JavaScript export is not an IPA build.
2. On Device Hub's iPhone Duo, exercise folded, unfolded, rotated, tent, partially folded and Split View layouts. Check navigation rail, keyboard, scrollable content, bottom actions, WebViews, GPU play and IAP sandbox.
3. Keep search/filter/form state while folding. Ensure taps remain accessible next to the system rail and home indicator.
4. Capture the updated native app on both Duo displays. Windows cannot perform this native simulator validation.

## Store media
Files: D:\phhotel\images\ai-markets-appstore
- iphone-duo-outer: 9 RGB PNGs, 1398 × 2034.
- iphone-duo-inner: 9 RGB PNGs, 2007 × 2853.
- iphone-dynamic-island-medium-1206x2622: existing 9 regular iPhone screenshots.

Duo files reformat the existing marketing screenshots from C:\Users\ADMIN\Desktop\image ai market\store_ready\appstore_6.3. They preserve the full source image and aspect ratio with an opaque background; they are not captures from a Duo simulator and do not prove the new responsive layout. Replace them with fresh native captures before claiming verified Duo optimization. File dimensions alone do not guarantee App Review acceptance.

Choose the matching iPhone Duo display slot in App Store Connect. Upload one set of 9 images, in numerical order, per supported slot; do not upload all 18 into one slot (maximum 10). Use the regular iPhone set in the Dynamic Island medium display slot. Existing hotel app images were not overwritten.

References:
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/iphone-duo/prepare/
- https://expo.dev/blog/supporting-iphone-duo

## Validation results
- TypeScript: passed (`tsc --noEmit`).
- Expo bundled dependency versions: matched SDK 58 (`EXPO_OFFLINE=1 expo install --check`, uses bundled version map).
- iOS and Android JavaScript/Hermes export: passed.
- All 27 exported/copied store PNGs checked: opaque, no alpha. Duo dimensions validated during export.
- Lint on changed source files: 11 errors and 32 warnings. All 11 errors also reproduce against the original HEAD source using the same SDK 58 lint rules (builder screen: 5; GPU play: 1; StoryReader: 5). These pre-existing hook/effect issues remain.
- npm reported 13 dependency vulnerabilities during installation (5 low, 2 moderate, 5 high, 1 critical); no force audit fix was applied.
- Native IPA build, TestFlight and Duo device/simulator validation: not performed on Windows.
