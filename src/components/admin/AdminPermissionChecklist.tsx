"use client";

import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/lib/adminPermissions";
import { Switch } from "@/components/ui/switch";

export function AdminPermissionChecklist({
  value,
  onChange,
  disabled,
}: {
  value: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (key: AdminPermission, enabled: boolean) => {
    if (enabled) {
      if (value.includes(key)) return;
      onChange([...value, key]);
      return;
    }
    onChange(value.filter((item) => item !== key));
  };

  return (
    <div className="space-y-5">
      {ADMIN_PERMISSION_GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </p>
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
            {ADMIN_PERMISSIONS.filter((item) => item.group === group).map((item) => {
              const checked = value.includes(item.key);
              return (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">
                      {item.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => toggle(item.key, next)}
                    aria-label={item.label}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
