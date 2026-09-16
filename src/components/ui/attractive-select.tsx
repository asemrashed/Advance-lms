"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { LuChevronDown as ChevronDown, LuTriangleAlert as AlertCircle, LuCheck as CheckCircle2, LuFileText as LuFileText, LuTag as Tag, LuBookOpen as BookOpen, LuUser as User, LuArrowUpDown as ArrowUpDown, LuTarget as Target, LuClock as Clock, LuCalendar as Calendar, LuSearch as Search, LuMail as Mail, LuLock as Lock, LuAward as Award, LuUsers as Users } from 'react-icons/lu';

export interface AttractiveSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: "default" | "bold" | "floating" | "underline" | "filled"
  icon?: "search" | "mail" | "user" | "lock" | "clock" | "target" | "award" | "users" | "calendar" | "file" | "tag" | "book" | "arrow" | React.ReactNode
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
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

const AttractiveSelect = React.forwardRef<HTMLSelectElement, AttractiveSelectProps>(
  (
    {
      className,
      variant = "default",
      icon,
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
      options = [],
      placeholder = "Select an option...",
      children,
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

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHasValue(e.target.value !== "" && e.target.value !== "all")
      props.onChange?.(e)
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
        case "file":
          return <LuFileText className="h-4 w-4" />
        case "tag":
          return <Tag className="h-4 w-4" />
        case "book":
          return <BookOpen className="h-4 w-4" />
        case "arrow":
          return <ArrowUpDown className="h-4 w-4" />
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

    const baseStyles = "w-full transition-all duration-200 ease-in-out font-medium appearance-none cursor-pointer"

    const variantStyles = {
      default: cn(
        "rounded-lg border-2",
        sizeStyles[size],
        colorSchemes[colorScheme].border,
        colorSchemes[colorScheme].bg,
        "text-gray-900",
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
        "text-gray-900",
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
        "text-gray-900",
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
        "text-gray-900",
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
        "text-gray-900",
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
          <label className={cn("block text-sm font-semibold text-foreground mb-2", isActuallyDisabled && "opacity-50")}>
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left Icon */}
          {icon && (
            <div
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10",
                isActuallyDisabled && "opacity-50",
              )}
            >
              {getIcon()}
            </div>
          )}

          <select
            className={cn(
              baseStyles,
              variantStyles[variant],
              icon && "pl-10",
              (showValidationIcon || loading) && "pr-10",
              className,
            )}
            ref={ref}
            disabled={isActuallyDisabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleSelectChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.length > 0 ? (
              options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            ) : (
              children
            )}
          </select>

          {/* Loading Spinner */}
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}

          {/* Validation Icons */}
          {showValidationIcon && !loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
              {hasSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          )}

          {/* Dropdown Arrow */}
          {!loading && !showValidationIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
              <ChevronDown className="h-4 w-4" />
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
            {error || "Invalid selection"}
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

AttractiveSelect.displayName = "AttractiveSelect"

export { AttractiveSelect }
