// Biometric (Face ID / Touch ID / fingerprint) shim.
// No-op on web. Stores Supabase refresh token in the secure Keychain/Keystore
// after an explicit user opt-in; unlock() returns the stored token for sign-in.
import { isNative } from "./platform";

const KEY_SERVER = "app.takeoffpro.biometric";
const KEY_USER = "supabase-refresh-token";

export interface BiometricStatus {
  available: boolean;
  enrolled: boolean;
  reason?: string;
}

async function plugin() {
  const mod = await import("capacitor-native-biometric");
  return mod.NativeBiometric;
}

export async function getStatus(): Promise<BiometricStatus> {
  if (!isNative()) return { available: false, enrolled: false, reason: "web" };
  try {
    const NativeBiometric = await plugin();
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) {
      return { available: false, enrolled: false, reason: "device-unsupported" };
    }
    let enrolled = false;
    try {
      const creds = await NativeBiometric.getCredentials({ server: KEY_SERVER });
      enrolled = !!creds?.password;
    } catch { enrolled = false; }
    return { available: true, enrolled };
  } catch (err) {
    return { available: false, enrolled: false, reason: String(err) };
  }
}

/** Persist the current refresh token behind a biometric prompt. */
export async function enroll(refreshToken: string): Promise<void> {
  if (!isNative()) throw new Error("Biometric enrollment unavailable on web");
  const NativeBiometric = await plugin();
  await NativeBiometric.setCredentials({
    server: KEY_SERVER,
    username: KEY_USER,
    password: refreshToken,
  });
}

/** Remove stored credentials. */
export async function unenroll(): Promise<void> {
  if (!isNative()) return;
  try {
    const NativeBiometric = await plugin();
    await NativeBiometric.deleteCredentials({ server: KEY_SERVER });
  } catch { /* noop */ }
}

/**
 * Prompt the user for biometric verification, then return the stored refresh
 * token. Returns null if cancelled, no enrollment exists, or the device fails.
 */
export async function unlock(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const NativeBiometric = await plugin();
    const status = await NativeBiometric.isAvailable();
    if (!status.isAvailable) return null;
    await NativeBiometric.verifyIdentity({
      reason: "Unlock TakeoffPro",
      title: "TakeoffPro",
      subtitle: "Authenticate to continue",
    });
    const creds = await NativeBiometric.getCredentials({ server: KEY_SERVER });
    return creds?.password ?? null;
  } catch {
    return null;
  }
}
