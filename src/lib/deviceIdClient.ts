const DEVICE_ID_STORAGE_KEY = "nasmatics_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}
