// Camera shim — uses Capacitor camera on native, file input fallback on web.
import { isNative } from "./platform";

export interface CapturedPhoto {
  blob: Blob;
  mimeType: string;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function capturePhoto(): Promise<CapturedPhoto | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
    });
    if (!photo.dataUrl) return null;
    const blob = await dataUrlToBlob(photo.dataUrl);
    return { blob, mimeType: blob.type || `image/${photo.format || "jpeg"}` };
  }

  // Web fallback — open a hidden file input that prefers the camera.
  return new Promise<CapturedPhoto | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment" as unknown as string;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ blob: file, mimeType: file.type || "image/jpeg" });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
