// Filesystem shim — writes to native filesystem + opens share sheet on iOS/Android,
// falls back to a regular anchor download on the web.
import { isNative } from "./platform";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const result = r.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Persist a generated artifact (xlsx, pdf, xml…) and prompt the user to keep it. */
export async function saveExport(filename: string, blob: Blob): Promise<void> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: filename,
        url: written.uri,
        dialogTitle: "Save or share file",
      });
    } catch {
      // User cancelled the share sheet — file is still on disk for retry.
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
