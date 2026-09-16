"use client";

import { useState, useEffect } from 'react';

interface UseCountdownOptions {
  duration?: number; // Animation duration in milliseconds
  startValue?: number;
  endValue: number;
  delay?: number; // Delay before starting animation
}

export const useCountdown = ({ 
  duration = 2000, 
  startValue = 0, 
  endValue, 
  delay = 0 
}: UseCountdownOptions) => {
  const [currentValue, setCurrentValue] = useState(startValue);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      
      const startTime = Date.now();
      const difference = endValue - startValue;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (difference * easeOutCubic);
        
        setCurrentValue(Math.floor(current));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCurrentValue(endValue);
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [duration, startValue, endValue, delay]);

  return { currentValue, isAnimating };
};
