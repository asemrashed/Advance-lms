"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type PartnerItem = {
  name: string;
  imageUrl: string;
  href: string;
};

type HomePartnersSectionProps = {
  title: string;
  partners: PartnerItem[];
};

export function HomePartnersSection({ title, partners }: HomePartnersSectionProps) {
  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-surface px-8 py-20">
      <div className="mx-auto mb-12 max-w-screen-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="relative flex w-full overflow-hidden">
        <div className="flex w-max animate-marquee items-center">
          {[...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners, ...partners].map((p, index) => {
            const inner = p.imageUrl ? (
              <Image src={p.imageUrl} alt={p.name} width={150} height={70} className="object-contain" />
            ) : (
              <span
                className={cn(
                  "text-3xl font-black text-foreground whitespace-nowrap",
                  p.name === "Zoom" && "italic",
                )}
              >
                {p.name}
              </span>
            );
            const key = `${p.name}-${p.imageUrl}-${p.href}-${index}`;
            if (p.href) {
              return (
                <Link
                  key={key}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 pr-10 md:pr-20"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <span key={key} className="inline-flex shrink-0 pr-10 md:pr-20">
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
