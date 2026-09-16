"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  duration?: number;
  viewport?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className,
  duration = 0.5,
  viewport = true,
}: FadeInProps) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  const initial = {
    opacity: 0,
    ...directions[direction],
  };

  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
  };

  return (
    <motion.div
      initial={initial}
      whileInView={viewport ? animate : undefined}
      animate={!viewport ? animate : undefined}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: duration,
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98], // cubic-bezier for smooth easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
  delayChildren = 0.1,
  staggerChildren = 0.1,
  viewport = true,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
  viewport?: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      animate={viewport ? undefined : "visible"}
      whileInView={viewport ? "visible" : undefined}
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, ...directions[direction] },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
