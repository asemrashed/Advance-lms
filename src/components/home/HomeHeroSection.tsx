"use client";

import Image from "next/image";
import type { ResolvedHomeHero } from "@/lib/resolveHomeHeroContent";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";

type HomeHeroSectionProps = {
  content: ResolvedHomeHero;
};

/** Renders *italic* segments in hero copy strings. */
function EmphasisText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function SerifParagraph({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <p className={`font-serif font-normal md:font-medium ${className ?? ""}`}>
      <EmphasisText text={text} />
    </p>
  );
}

function BioParagraph({ text }: { text: string }) {
  return (
    <p className="font-sans text-[15px] leading-[1.8] text-foreground/75 md:text-base">
      <EmphasisText text={text} />
    </p>
  );
}

export function HomeHeroSection({ content }: HomeHeroSectionProps) {
  const {
    tagline,
    brandName,
    badge,
    headlineBefore,
    headlineAccent,
    introParagraphs,
    bioLeft,
    bioRight,
    portraitSrc,
    statValue,
    statLabel,
  } = content;

  const brandDisplay = brandName.trim().toUpperCase();
  const hasBio = bioLeft.length > 0 || bioRight.length > 0;

  return (
    <section className="bg-white text-foreground">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/images/hero-background.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>

      {/* Top Section - Brand Name & Bullets spanning full width */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-14 md:px-10 md:pt-20 lg:px-16 lg:pt-24 flex flex-col items-start">
        {/* Tagline */}
        <FadeIn delay={0.1}>
          <p className="font-sans text-sm font-semibold tracking-wider text-primary uppercase mb-4">
            {tagline}
          </p>
        </FadeIn>

        {/* Brand Name (takes 70-80% width) */}
        <div className="w-[85%] sm:w-[80%] md:w-[75%] max-w-5xl text-left">
          <FadeIn delay={0.2} direction="up">
            <h1 className="font-serif-display text-5xl md:text-[9vw] lg:text-[9.5vw] xl:text-[10vw] font-bold leading-none tracking-tight text-foreground select-none">
              <span className="text-primary">‘</span>
              {brandDisplay}
              <span className="text-primary">’</span>
            </h1>
          </FadeIn>

          {/* 3 texts under Brand Name - justified around to span the same width as Brand Name container */}
          <FadeIn delay={0.3}>
            <div className="mt-6 flex items-center justify-around w-full font-sans text-xs sm:text-[13px] md:text-sm font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Resources</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Video</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Live Classes</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-8 md:gap-14 md:px-10 md:pb-20 lg:grid-cols-2 lg:gap-20 lg:px-16 lg:pb-24">
        {/* Left — DM Serif for badge, headline, and body */}
        <StaggerContainer delayChildren={0.4} staggerChildren={0.1} className="max-w-xl">
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 font-sans text-xs font-semibold text-primary md:text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {badge}
            </span>
          </StaggerItem>

          <StaggerItem>
            <h2 className="font-serif-display mt-8 text-[2rem] font-bold leading-[1.2] tracking-tight text-foreground sm:text-4xl md:text-[2.65rem] lg:text-5xl">
              {headlineBefore}
              <span className="italic text-primary"> {headlineAccent}</span>
            </h2>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-8 space-y-5">
              {introParagraphs.map((paragraph) => (
                <SerifParagraph
                  key={paragraph.slice(0, 48)}
                  text={paragraph}
                  className="text-base leading-[1.75] text-muted-foreground md:text-[17px]"
                />
              ))}
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Right — portrait; stat overlaps into bio band */}
        <FadeIn delay={0.5} direction="left" className="relative mx-auto w-full max-w-lg lg:max-w-none lg:justify-self-end">
          <div className="relative aspect-[493/506] w-full">
            <Image
              src={portraitSrc}
              alt="Instructor portrait"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 520px"
              className="object-contain object-bottom"
            />
          </div>
          <div
            className={`absolute left-0 z-20 rounded-xl bg-foreground px-5 py-4 text-on-primary shadow-editorial ${
              hasBio
                ? "bottom-0 translate-y-1/2 md:left-4"
                : "bottom-8 md:bottom-12 md:left-4"
            }`}
          >
            <p className="font-serif-display text-3xl font-bold leading-none md:text-4xl">
              {statValue}
            </p>
            <p className="mt-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-on-primary/90">
              {statLabel}
            </p>
          </div>
        </FadeIn>
      </div>
      </div>

      {/* Bottom band — two-column story (beige) */}
      {hasBio && (
        <div className="border-t border-outline-variant/20 bg-gradient-to-r from-secondary-container to-primary-container px-6 pb-16 pt-20 md:px-10 md:pb-20 md:pt-24 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
            <div className="space-y-5">
              {bioLeft.map((paragraph) => (
                <BioParagraph key={paragraph.slice(0, 48)} text={paragraph} />
              ))}
            </div>
            <div className="space-y-5">
              {bioRight.map((paragraph) => (
                <BioParagraph key={paragraph.slice(0, 48)} text={paragraph} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
