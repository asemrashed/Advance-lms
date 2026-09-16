"use client";

import { useState, useEffect } from 'react';

interface UseHasScrolledOptions {
  /**
   * The pixel threshold to check against (scrolled from top)
   * @default 0
   */
  threshold?: number;
  
  /**
   * Whether to enable the hook
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook to check if the user has scrolled a given pixel amount from the top
 * 
 * @param options Configuration options
 * @returns Boolean indicating whether the threshold has been scrolled
 * 
 * @example
 * // Check if scrolled 100px from top
 * const hasScrolled = useHasScrolled({ threshold: 100 });
 * 
 * @example
 * // Conditionally enabled
 * const hasScrolled = useHasScrolled({ 
 *   threshold: 200, 
 *   enabled: isLargeScreen 
 * });
 */
export const useHasScrolled = ({
  threshold = 0,
  enabled = true,
}: UseHasScrolledOptions = {}): boolean => {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasScrolled(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || window.pageYOffset;
      setHasScrolled(scrollTop >= threshold);
    };

    // Check initial position
    handleScroll();

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold, enabled]);

  return hasScrolled;
};

