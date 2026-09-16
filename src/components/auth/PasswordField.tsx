"use client";

import { useState } from "react";
import { LuEye as Eye, LuEyeOff as EyeOff } from "react-icons/lu";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function PasswordField({
  label,
  name,
  autoComplete,
  value,
  onChange,
  required,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <div className="relative mt-2">
        <input
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-11 text-foreground"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </label>
  );
}
