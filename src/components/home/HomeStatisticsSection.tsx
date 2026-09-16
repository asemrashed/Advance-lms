"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuUsers,
  LuBookOpen,
  LuGraduationCap,
  LuAward,
} from "react-icons/lu";
import type { StatisticsContent, StatisticsItem } from "@/lib/websiteContentTypes";
import { defaultStatisticsContent } from "@/lib/websiteContentDefaults";

type HomeStatisticsSectionProps = {
  content?: StatisticsContent | null;
};

function StatIcon({ iconType }: { iconType: StatisticsItem["iconType"] }) {
  const props = { size: 28, className: "text-white" };
  switch (iconType) {
    case "students":
      return <LuUsers {...props} />;
    case "courses":
      return <LuBookOpen {...props} />;
    case "tutors":
      return <LuGraduationCap {...props} />;
    case "awards":
      return <LuAward {...props} />;
    default:
      return null;
  }
}

export function HomeStatisticsSection({ content }: HomeStatisticsSectionProps) {
  const items =
    content?.items?.length ? content.items : defaultStatisticsContent.items;
  const [counts, setCounts] = useState(() => items.map(() => 0));
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setCounts(items.map(() => 0));
    setIsVisible(false);
  }, [items]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const targets = items.map((item) => parseInt(item.number, 10) || 0);
    const steps = 40;
    const timers: ReturnType<typeof setInterval>[] = [];

    targets.forEach((target, index) => {
      let currentStep = 0;
      const increment = target / steps;
      const timer = setInterval(() => {
        currentStep += 1;
        const value = Math.min(Math.floor(increment * currentStep), target);
        setCounts((prev) => {
          const next = [...prev];
          next[index] = value;
          return next;
        });
        if (currentStep >= steps) {
          clearInterval(timer);
          setCounts((prev) => {
            const next = [...prev];
            next[index] = target;
            return next;
          });
        }
      }, 50);
      timers.push(timer);
    });

    return () => timers.forEach(clearInterval);
  }, [isVisible, items]);

  return (
    <section
      ref={sectionRef}
      className="bg-gradient-to-b from-background to-surface-container-low px-8 py-16"
    >
      <div className="mx-auto max-w-screen-2xl">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((stat, index) => (
            <div
              key={stat.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-lg md:p-8"
            >
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-md transition group-hover:scale-105">
                  <StatIcon iconType={stat.iconType} />
                </div>
                <div className="mb-2 font-[family-name:var(--font-headline)] text-3xl font-extrabold text-foreground md:text-4xl">
                  {counts[index]}
                  <sup className="ml-0.5 text-lg text-primary md:text-xl">
                    {stat.suffix}
                  </sup>
                </div>
                <p className="text-sm font-semibold text-muted-foreground md:text-base">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
