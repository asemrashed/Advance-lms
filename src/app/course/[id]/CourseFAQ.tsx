"use client";

import { useState, useEffect } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  q: string;
  a: string;
  isFirst?: boolean; 
  courseId?: string;
};

export default function CourseFAQ({
  q,
  a,
  isFirst = false,
}: Props) {
  const [open, setOpen] = useState(isFirst);

  useEffect(() => {
    setOpen(isFirst);
  }, [isFirst]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  if (!q || !a) {
    return null;
  }

  return (
    <div 
      className={cn(
        "border-b border-border/30 overflow-hidden mx-4",
        open && "border-primary/10"
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between px-6 py-4 select-none group"
        onClick={handleToggle}
      >
        <h3 className="font-headline font-bold text-foreground text-sm md:text-base group-hover:text-primary transition-colors duration-200 pr-4">
          {q}
        </h3>
        <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors p-1">
          {open ? (
            <LuChevronUp className="w-5 h-5 transition-transform duration-300 transform rotate-180 text-primary" />
          ) : (
            <LuChevronDown className="w-5 h-5 transition-transform duration-300" />
          )}
        </div>
      </div>

      {/* Answer Panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden bg-muted/5"
          >
            <div className="px-6 pb-5 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}