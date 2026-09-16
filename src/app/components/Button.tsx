 "use client";

import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

type GradientButtonProps = {
  /** Text or elements to render inside the button */
  children: ReactNode;
  /** Optional href – when provided, renders a Next.js Link, otherwise a regular button */
  href?: string;
  /** Additional Tailwind classes */
  className?: string;
  /** Optional click handler when used as a button */
  onClick?: () => void;
  /** Optional aria label for accessibility */
  "aria-label"?: string;
  /** Whether to show the arrow icon on the right */
  showArrow?: boolean;
};

const baseClasses =
  "group/btn relative flex cursor-pointer items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition-all duration-300 overflow-hidden";

const baseStyle: CSSProperties = {
  fontFamily: "var(--font-bengali), sans-serif",
  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
};

/**
 * Gradient button used in the Coursesc ByCategory section.
 * Can be used as both a Link (when href is provided) or a regular button.
 *
 * Example (Link):
 *   <GradientButton href="/all-courses" showArrow>সব কোর্স দেখুন</GradientButton>
 *
 * Example (button):
 *   <GradientButton onClick={handleClick} showArrow>ক্লিক করুন</GradientButton>
 */
export default function GradientButton({
  children,
  href,
  className = "",
  onClick,
  showArrow = false,
  ...rest
}: GradientButtonProps) {
  const combinedClassName = `${baseClasses} ${className}`.trim();

  if (href) {
    return (
      <Link 
        href={href} 
        id="gradient-button" 
        className={combinedClassName} 
        style={baseStyle}
        {...rest}
      >
        {/* Shine effect */}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
        
        {/* Button content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
          {showArrow && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1"
            >
              <path
                d="M5 13L13 5M13 5H7M13 5V11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={combinedClassName}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(236, 72, 153, 0.5)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      {...rest}
    >
      {/* Shine effect */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
      
      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {showArrow && (
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1"
          >
            <path
              d="M5 13L13 5M13 5H7M13 5V11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-lg animate-pulse opacity-0 group-hover/btn:opacity-20 bg-white transition-opacity duration-300"></span>
    </button>
  );
}


