export type AccountStatus = "pending" | "active" | "blocked";

export function accountStatusToFlags(status: AccountStatus): {
  accountStatus: AccountStatus;
  isActive: boolean;
} {
  return {
    accountStatus: status,
    isActive: status === "active",
  };
}

export function resolveAccountStatus(user: {
  accountStatus?: AccountStatus;
  isActive?: boolean;
  role?: string;
}): AccountStatus {
  if (user.accountStatus) return user.accountStatus;
  // Legacy rows: self-registered instructors were saved inactive before accountStatus existed.
  if (user.role === "instructor" && user.isActive === false) return "pending";
  return user.isActive !== false ? "active" : "blocked";
}

export function canUserLogin(user: {
  accountStatus?: AccountStatus;
  isActive?: boolean;
  role?: string;
}): boolean {
  return resolveAccountStatus(user) === "active";
}
