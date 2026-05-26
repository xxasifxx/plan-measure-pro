import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.25431cb14a594e7aad1424da9039ad81",
  appName: "TakeoffPro",
  webDir: "dist",
  // Hot-reload from the Lovable sandbox preview during development.
  // ⚠️ Remove the `server` block (or set url: undefined) for production builds.
  server: {
    url: "https://25431cb1-4a59-4e7a-ad14-24da9039ad81.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0b1220",
      androidSplashResourceName: "splash",
      iosSpinnerStyle: "small",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
