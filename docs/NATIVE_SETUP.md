# TakeoffPro — Native (iOS / Android) Setup

The TakeoffPro web app doubles as a true native binary via **Capacitor**.
This document is the one-time setup field engineers and ops follow after
exporting the project to GitHub.

## Prerequisites
- macOS with **Xcode 15+** (iOS build)
- **Android Studio Hedgehog+** with the Android SDK + Java 17
- Node 20 and `bun` or `npm`

## One-time setup

```bash
git clone <your-fork>
cd takeoffpro
npm install

# Add native platforms (creates ios/ and android/ folders)
npx cap add ios
npx cap add android
```

## Iterating

```bash
npm run build        # vite build → dist/
npx cap sync         # copy dist/ + plugins into ios/ and android/
npx cap open ios     # Xcode  → ▶ Run
npx cap open android # Android Studio → ▶ Run
```

The dev server URL inside `capacitor.config.ts` lets the running native app
hot-reload from the Lovable sandbox. **Remove the `server` block before
producing a release build** so the binary loads its own embedded `dist/`.

## Capabilities wired

| Capability      | Plugin                                          | Status   |
|-----------------|-------------------------------------------------|----------|
| Camera          | `@capacitor/camera`                             | Active   |
| Geolocation     | `@capacitor/geolocation`                        | Active   |
| Filesystem      | `@capacitor/filesystem`, `@capacitor/share`     | Active   |
| App lifecycle   | `@capacitor/app`                                | Active   |
| Status bar      | `@capacitor/status-bar`                         | Active   |
| Splash screen   | `@capacitor/splash-screen`                      | Active   |
| Keyboard        | `@capacitor/keyboard`                           | Active   |
| Biometric       | `capacitor-native-biometric`                    | Active   |
| Push (FCM/APNs) | `@capacitor/push-notifications`                 | Active — needs `FCM_SERVER_KEY` secret to deliver |
| Background sync | `@transistorsoft/capacitor-background-fetch`    | Active   |

All native capabilities go through `src/lib/native/*` shims so the web build
keeps working unchanged. User-facing toggles for Biometric / Push / Background
sync live in `/settings`.

## App icon & splash assets

Master art lives at `src/assets/app-icon-master.png` (1024×1024). After
exporting to GitHub, regenerate the icon/splash sets:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0b1220"
```

## Permissions checklist (App Store / Play Store)

Edit `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key><string>Attach field photos to annotations.</string>
<key>NSLocationWhenInUseUsageDescription</key><string>Trace pay-item quantities by GPS.</string>
<key>NSPhotoLibraryAddUsageDescription</key><string>Save exported daily reports.</string>
```

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

## Production checklist

- [ ] Remove `server.url` from `capacitor.config.ts`
- [ ] Bump version in `package.json` and `ios/App/App.xcodeproj` / `android/app/build.gradle`
- [ ] Provide 1024×1024 master icon, regenerate with `npx capacitor-assets generate`
- [ ] Run `npx cap sync` after each `npm run build`
- [ ] Archive in Xcode → upload to App Store Connect
- [ ] `./gradlew bundleRelease` → upload `.aab` to Play Console
