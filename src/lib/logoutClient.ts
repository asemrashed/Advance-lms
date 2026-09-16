import { signOut } from "next-auth/react";

export async function revokeCurrentDeviceSession() {
  try {
    await fetch("/api/auth/device-session/revoke", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort cleanup before sign-out.
  }
}

export async function signOutWithDeviceRevoke(
  options?: Parameters<typeof signOut>[0],
) {
  await revokeCurrentDeviceSession();
  return signOut(options);
}
