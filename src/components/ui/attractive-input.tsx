"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { LuEye as Eye, LuEyeOff as EyeOff, LuSearch as Search, LuMail as Mail, LuUser as User, LuLock as Lock, LuTriangleAlert as AlertCircle, LuCheck as CheckCircle2, LuClock as Clock, LuTarget as Target, LuAward as Award, LuUsers as Users, LuCalendar as Calendar } from 'react-icons/lu';

export interface AttractiveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: "default" | "bold" | "floating" | "underline" | "filled"
  icon?: "search" | "mail" | "user" | "lock" | "clock" | "target" | "award" | "users" | "calendar" | React.ReactNode
  label?: string
  error?: string
  success?: boolean
  helperText?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
  loading?: boolean
  size?: "sm" | "md" | "lg"
  colorScheme?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  isInvalid?: boolean
  isValid?: boolean
  focusRingColor?: string
  isDisabled?: boolean
}

function defaultNameFromLabel(labelText: string | undefined): string | undefined {
  if (!labelText?.trim()) return undefined
  const slug = labelText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || undefined
}

const AttractiveInput = React.forwardRef<HTMLInputElement, AttractiveInputProps>(
  (
    {
      className,
      type,
      variant = "default",
      icon,
      label,
      error,
      success,
      helperText,
      leftAddon,
      rightAddon,
      loading = false,
      size = "md",
      colorScheme = "default",
      isInvalid,
      isValid,
      focusRingColor,
      isDisabled,
      disabled,
      id: idProp,
      name: nameProp,
      onChange: onChangeProp,
      value,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId().replace(/:/g, "")
    const resolvedName = nameProp ?? defaultNameFromLabel(label)
    const resolvedId =
      idProp ??
      (resolvedName ? `attractive-input-${resolvedName}-${reactId}` : `attractive-input-field-${reactId}`)

    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)

    React.useEffect(() => {
      if (value !== undefined) setHasValue(String(value ?? "").length > 0)
    }, [value])

    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type
    const isActuallyDisabled = disabled || isDisabled

    const hasError = error || isInvalid
    const hasSuccess = success || isValid
    const showValidationIcon = hasError || hasSuccess

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      onChangeProp?.(e)
    }

    const getIcon = () => {
      if (React.isValidElement(icon)) return icon
      switch (icon) {
        case "search":
          return <Search className="h-4 w-4" />
        case "mail":
          return <Mail className="h-4 w-4" />
        case "user":
          return <User className="h-4 w-4" />
        case "lock":
          return <Lock className="h-4 w-4" />
        case "clock":
          return <Clock className="h-4 w-4" />
        case "target":
          return <Target className="h-4 w-4" />
        case "award":
          return <Award className="h-4 w-4" />
        case "users":
          return <Users className="h-4 w-4" />
        case "calendar":
          return <Calendar className="h-4 w-4" />
        default:
          return null
      }
    }

    const sizeStyles = {
      sm: "h-9 px-3 py-2 text-sm",
      md: "h-12 px-4 py-3",
      lg: "h-14 px-5 py-4 text-lg",
    }

    const colorSchemes = {
      default: {
        border: "border-border",
        focus: "focus:border-ring focus:ring-ring/20",
        bg: "bg-white",
      },
      primary: {
        border: "border-blue-300 hover:border-blue-400",
        focus: "focus:border-blue-500 focus:ring-blue-500/20 focus:shadow-lg focus:shadow-blue-500/10",
        bg: "bg-white",
      },
      secondary: {
        border: "border-secondary/30",
        focus: "focus:border-secondary focus:ring-secondary/20",
        bg: "bg-white",
      },
      success: {
        border: "border-green-300",
        focus: "focus:border-green-500 focus:ring-green-500/20",
        bg: "bg-green-50 dark:bg-green-950/10",
      },
      warning: {
        border: "border-yellow-300",
        focus: "focus:border-yellow-500 focus:ring-yellow-500/20",
        bg: "bg-yellow-50 dark:bg-yellow-950/10",
      },
      danger: {
        border: "border-red-300",
        focus: "focus:border-red-500 focus:ring-red-500/20",
        bg: "bg-red-50 dark:bg-red-950/10",
      },
    }

    const baseStyles = "w-full transition-all duration-200 ease-in-out font-medium"

    const variantStyles = {
      default: cn(
        "rounded-lg border-2",
        sizeStyles[size],
        colorSchemes[colorScheme].border,
        colorSchemes[colorScheme].bg,
        "text-gray-900 placeholder:text-gray-500",
        colorSchemes[colorScheme].focus,
        "focus:outline-none focus:ring-2 transition-all duration-200",
        hasError && "border-destructive focus:border-destructive focus:ring-destructive/20",
        hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500/20",
        isActuallyDisabled && "opacity-50 cursor-not-allowed bg-muted",
      ),
      bold: cn(
        "rounded-lg border-3",
        size === "sm"
          ? "h-10 px-4 py-2 text-sm font-semibold"
          : size === "md"
            ? "h-14 px-5 py-4 font-semibold"
            : "h-16 px-6 py-5 text-xl font-bold",
        "border-primary bg-white",
        "text-gray-900 placeholder:text-gray-500",
        "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/30 focus:shadow-lg",
        "hover:border-accent/70 transition-all duration-300",
        hasError && "border-destructive focus:border-destructive focus:ring-destructive/30",
        hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500/30",
        isActuallyDisabled && "opacity-50 cursor-not-allowed hover:border-primary",
      ),
      floating: cn(
        "rounded-lg border-2",
        size === "sm" ? "h-12 px-3 pt-5 pb-1" : size === "md" ? "h-14 px-4 pt-6 pb-2" : "h-16 px-5 pt-7 pb-3",
        colorSchemes[colorScheme].border,
        colorSchemes[colorScheme].bg,
        "text-gray-900 placeholder:text-transparent",
        colorSchemes[colorScheme].focus,
        "focus:outline-none focus:ring-2",
        hasError && "border-destructive focus:border-destructive focus:ring-destructive/20",
        hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500/20",
        isActuallyDisabled && "opacity-50 cursor-not-allowed",
      ),
      underline: cn(
        "border-0 border-b-2 bg-transparent rounded-none",
        sizeStyles[size],
        "px-0",
        colorSchemes[colorScheme].border.replace("border-", "border-b-"),
        "text-gray-900 placeholder:text-gray-500",
        colorSchemes[colorScheme].focus.replace("border-", "border-b-").replace("ring-2", "ring-0"),
        "focus:outline-none",
        hasError && "border-b-destructive focus:border-b-destructive",
        hasSuccess && "border-b-green-500 focus:border-b-green-500",
        isActuallyDisabled && "opacity-50 cursor-not-allowed",
      ),
      filled: cn(
        "rounded-lg border-0",
        sizeStyles[size],
        "bg-white",
        "text-gray-900 placeholder:text-gray-500",
        "focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring",
        hasError && "bg-destructive/10 focus:ring-destructive",
        hasSuccess && "bg-green-50 focus:ring-green-500 dark:bg-green-950/20",
        isActuallyDisabled && "opacity-50 cursor-not-allowed",
      ),
    }

    const floatingLabelStyles = {
      sm: isFocused || hasValue ? "top-1 text-xs" : "top-1/2 -translate-y-1/2 text-sm",
      md: isFocused || hasValue ? "top-2 text-xs" : "top-1/2 -translate-y-1/2 text-base",
      lg: isFocused || hasValue ? "top-2.5 text-sm" : "top-1/2 -translate-y-1/2 text-lg",
    }

    return (
      <div className="relative w-full">
        {/* Floating Label */}
        {variant === "floating" && label && (
          <label
            htmlFor={resolvedId}
            className={cn(
              "absolute left-4 transition-all duration-200 pointer-events-none",
              "text-muted-foreground",
              floatingLabelStyles[size],
              isFocused || hasValue ? "font-medium text-ring" : "",
              isActuallyDisabled && "opacity-50",
            )}
          >
            {label}
          </label>
        )}

        {/* Regular Label */}
        {variant !== "floating" && label && (
          <label
            htmlFor={resolvedId}
            className={cn("block text-sm font-semibold text-foreground mb-2", isActuallyDisabled && "opacity-50")}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left Addon */}
          {leftAddon && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3 pointer-events-none z-10">{leftAddon}</div>
          )}

          {/* Left Icon */}
          {icon && !leftAddon && (
            <div
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10",
                isActuallyDisabled && "opacity-50",
              )}
            >
              {getIcon()}
            </div>
          )}

          <input
            id={resolvedId}
            name={resolvedName}
            type={inputType}
            {...(value !== undefined ? { value } : {})}
            className={cn(
              baseStyles,
              variantStyles[variant],
              icon && !leftAddon && "pl-10",
              leftAddon && "pl-12",
              (isPassword || rightAddon || showValidationIcon) && "pr-10",
              loading && "pr-12",
              className,
            )}
            ref={ref}
            disabled={isActuallyDisabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleInputChange}
            {...props}
          />

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}

          {/* Validation Icons */}
          {showValidationIcon && !loading && !isPassword && !rightAddon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
              {hasSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          )}

          {/* Password Toggle */}
          {isPassword && !loading && (
            <button
              type="button"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10",
                isActuallyDisabled && "opacity-50 cursor-not-allowed hover:text-muted-foreground",
              )}
              onClick={() => setShowPassword(!showPassword)}
              disabled={isActuallyDisabled}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          {/* Right Addon */}
          {rightAddon && !isPassword && !loading && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pointer-events-none z-10">
              {rightAddon}
            </div>
          )}
        </div>

        {/* Helper Text */}
        {helperText && !error && !hasError && (
          <p className={cn("mt-2 text-sm text-muted-foreground", isActuallyDisabled && "opacity-50")}>{helperText}</p>
        )}

        {/* Error Message */}
        {(error || hasError) && (
          <p className="mt-2 text-sm text-destructive font-medium flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error || "Invalid input"}
          </p>
        )}

        {/* Success Message */}
        {hasSuccess && !error && !hasError && (
          <p className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Looks good!
          </p>
        )}
      </div>
    )
  },
)

AttractiveInput.displayName = "AttractiveInput"

export { AttractiveInput }
