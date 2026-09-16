"use client";

import { cn } from "@/lib/cn";
import { HOME_FAQ } from "@/data/homePageContent";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FaqItem = {
  q: string;
  a: string;
};

type FAQProps = {
  items?: FaqItem[];
};

export default function FAQ({ items }: FAQProps) {
    const faqs = items ?? HOME_FAQ;
    const [openFaq, setOpenFaq] = useState<number | null>(1);
    return (
        <section className="mx-auto max-w-4xl px-8 py-24">
        <h2 className="mb-16 text-center font-[family-name:var(--font-headline)] text-4xl font-extrabold tracking-tight">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((item, i) => {
            const open = openFaq === i;
            const expandable = Boolean(item.a);
            return (
              <div
                key={item.q}
                className={cn(
                  "overflow-hidden rounded-2xl bg-surface-container",
                  open && expandable && "border-2 border-primary/20",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-8 py-6 text-left transition-colors",
                    expandable && (open ? "bg-surface-container-high" : "hover:bg-surface-container-high"),
                    !expandable && "cursor-default hover:bg-surface-container-high/50",
                  )}
                  onClick={() => {
                    if (!expandable) return;
                    setOpenFaq(open ? null : i);
                  }}
                >
                  <span className="text-lg font-bold text-foreground">{item.q}</span>
                  <span className="material-symbols-outlined text-primary">
                    {expandable && open ? "remove" : "add"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && expandable && item.a && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-8 leading-relaxed text-muted-foreground">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    );
}