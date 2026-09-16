"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { LuTriangleAlert as AlertCircle, LuCheck as CheckCircle2 } from 'react-icons/lu';

export interface AttractiveTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "bold" | "underline" | "filled"
  label?: string
  error?: string
  success?: boolean
  helperText?: string
  loading?: boolean
  size?: "sm" | "md" | "lg"
  colorScheme?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  isInvalid?: boolean
  isValid?: boolean
  isDisabled?: boolean
}

const AttractiveTextarea = React.forwardRef<HTMLTextAreaElement, AttractiveTextareaProps>(
  (
    {
      className,
      variant = "default",
      label,
      error,
      success,
      helperText,
      loading = false,
      size = "md",
      colorScheme = "default",
      isInvalid,
      isValid,
      isDisabled,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)

    const isActuallyDisabled = disabled || isDisabled

    const hasError = error || isInvalid
    const hasSuccess = success || isValid
    const showValidationIcon = hasError || hasSuccess

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(e.target.value.length > 0)
      props.onChange?.(e)
    }

    const sizeStyles = {
      sm: "h-20 px-3 py-2 text-sm",
      md: "h-24 px-4 py-3",
      lg: "h-32 px-5 py-4 text-lg",
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

    const baseStyles = "w-full transition-all duration-200 ease-in-out font-medium resize-none"

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
          ? "h-20 px-4 py-2 text-sm font-semibold"
          : size === "md"
            ? "h-24 px-5 py-4 font-semibold"
            : "h-32 px-6 py-5 text-xl font-bold",
        "border-primary bg-white",
        "text-gray-900 placeholder:text-gray-500",
        "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/30 focus:shadow-lg",
        "hover:border-accent/70 transition-all duration-300",
        hasError && "border-destructive focus:border-destructive focus:ring-destructive/30",
        hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500/30",
        isActuallyDisabled && "opacity-50 cursor-not-allowed hover:border-primary",
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

    return (
      <div className="relative w-full">
        {/* Regular Label */}
        {label && (
          <label className={cn("block text-sm font-semibold text-foreground mb-2", isActuallyDisabled && "opacity-50")}>
            {label}
          </label>
        )}

        <div className="relative">
          <textarea
            className={cn(
              baseStyles,
              variantStyles[variant],
              className,
            )}
            ref={ref}
            disabled={isActuallyDisabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleTextareaChange}
            {...props}
          />

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-3 z-10">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}

          {/* Validation Icons */}
          {showValidationIcon && !loading && (
            <div className="absolute right-3 top-3 z-10">
              {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
              {hasSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
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

AttractiveTextarea.displayName = "AttractiveTextarea"

export { AttractiveTextarea }
