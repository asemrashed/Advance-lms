"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { type HeroContent, defaultHeroContent } from "@/lib/websiteContentDefaults";
import { htmlToPlainText } from "@/lib/utils";

interface HeroProps {
  initialContent?: HeroContent;
}

export default function Hero({ initialContent }: HeroProps = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroContent, setHeroContent] = useState<HeroContent>(initialContent || defaultHeroContent);

  useEffect(() => {
    // Only fetch if initialContent was not provided (fallback for client-side updates)
    if (!initialContent) {
      const fetchHeroContent = async () => {
        try {
          // On-demand caching: cache until manually revalidated
          const response = await fetch('/api/website-content', {
            cache: 'force-cache', // Use cached version when available
            next: { tags: ['website-content'] }, // Tag for on-demand revalidation
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.hero) {
              setHeroContent(data.data.hero);
            }
          }
        } catch (error) {
          console.error('Error fetching hero content:', error);
          // Use default content on error
        }
      };
      fetchHeroContent();
    }
    // Trigger animations after component mounts
    setIsLoaded(true);
  }, [initialContent]);

  const courseThumbnails = heroContent.carousel?.enabled ? heroContent.carousel.items : [];

  // Auto-play carousel
  useEffect(() => {
    if (!isLoaded || !heroContent.carousel?.enabled || !heroContent.carousel?.autoPlay || courseThumbnails.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % courseThumbnails.length);
    }, heroContent.carousel.autoPlayInterval || 3000);
    return () => clearInterval(interval);
  }, [isLoaded, courseThumbnails.length, heroContent.carousel?.enabled, heroContent.carousel?.autoPlay, heroContent.carousel?.autoPlayInterval]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % courseThumbnails.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + courseThumbnails.length) % courseThumbnails.length);
  };

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden pb-40"
      style={{
        paddingTop: "120px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-4 md:flex-row md:items-center md:px-6 lg:px-8">
        {/* Left Content */}
        <div className="flex w-full flex-col gap-6 md:w-1/2 md:gap-8">
          {/* Subtitle */}
          <div
            className={`flex items-center gap-3 ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              animationDelay: "0.1s",
            }}
          >
            {/* Lightbulb Icon with Rays */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#FF6B35] shrink-0"
            >
              {/* Lightbulb outline */}
              <path
                d="M14 3C9.58 3 6 6.58 6 11C6 13.28 7.05 15.22 8.67 16.53V19C8.67 19.55 9.12 20 9.67 20H18.33C18.88 20 19.33 19.55 19.33 19V16.53C20.95 15.22 22 13.28 22 11C22 6.58 18.42 3 14 3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.5 22H17.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 20V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.5 20V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Rays emanating from top-right */}
              <path
                d="M20 6L22 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M22 8L24 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M23 4L25 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p
              className="text-base font-semibold text-[#FF6B35] md:text-lg"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              {heroContent.subtitle}
            </p>
          </div>

          {/* Main Title */}
          <h1
            className={`text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl xl:text-6xl lg:leading-tight ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              fontFamily: "var(--font-bengali), sans-serif",
              animationDelay: "0.3s",
            }}
          >
            <span style={{ color: heroContent.titleColors.part1 }}>{heroContent.title.part1}</span>{" "}
            {heroContent.titleColors.part2 === 'gradient' ? (
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: heroContent.gradientColors?.via 
                    ? `linear-gradient(to right, ${heroContent.gradientColors.from}, ${heroContent.gradientColors.via}, ${heroContent.gradientColors.to})`
                    : `linear-gradient(to right, ${heroContent.gradientColors?.from || '#10B981'}, ${heroContent.gradientColors?.to || '#EC4899'})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {heroContent.title.part2}
              </span>
            ) : (
              <span style={{ color: heroContent.titleColors.part2 }}>{heroContent.title.part2}</span>
            )}{" "}
            {heroContent.titleColors.part3 === 'gradient' ? (
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: heroContent.gradientColors?.via 
                    ? `linear-gradient(to right, ${heroContent.gradientColors.from}, ${heroContent.gradientColors.via}, ${heroContent.gradientColors.to})`
                    : `linear-gradient(to right, ${heroContent.gradientColors?.from || '#10B981'}, ${heroContent.gradientColors?.to || '#EC4899'})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {heroContent.title.part3}
              </span>
            ) : (
              <span style={{ color: heroContent.titleColors.part3 }}>{heroContent.title.part3}</span>
            )}
            <br />
            <span style={{ color: heroContent.titleColors.part4 }}>{heroContent.title.part4}</span>
            <br />
            <span style={{ color: heroContent.titleColors.part5 }}>{heroContent.title.part5}</span>
          </h1>

          {/* Description */}
          <p
            className={`max-w-lg text-sm leading-relaxed text-gray-600 md:text-base ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              fontFamily: "var(--font-bengali), sans-serif",
              animationDelay: "0.5s",
            }}
          >
            {htmlToPlainText(heroContent.description)}
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col gap-4 sm:flex-row ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{ animationDelay: "0.7s" }}
          >
            <a
              href={heroContent.buttons.primary.href}
              className="group/btn relative flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition-all duration-300 overflow-hidden md:px-8 md:py-3.5"
              style={{
                fontFamily: "var(--font-bengali), sans-serif",
                background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
              }}
            >
              {/* Shine effect */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
              
              {/* Button content */}
              <span className="relative z-10 flex items-center gap-2">
                <span>{heroContent.buttons.primary.text}</span>
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
              </span>
              
            </a>

            <a
              href={heroContent.buttons.secondary.href}
              className="group/btn relative flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B35] to-[#FF8C5A] px-6 py-3 text-base font-semibold text-white transition-all duration-300 overflow-hidden md:px-8 md:py-3.5"
              style={{ 
                fontFamily: "var(--font-bengali), sans-serif",
                boxShadow: "0 4px 15px rgba(255, 107, 53, 0.3)",
              }}
            >
              {/* Shine effect */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
              
              {/* Button content */}
              <span className="relative z-10 flex items-center gap-2">
                <span>{heroContent.buttons.secondary.text}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="transition-transform duration-300 group-hover/btn:translate-x-1"
                >
                  <path
                    d="M6 12L10 8L6 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              
            </a>
          </div>
        </div>

        {/* Right Content - Course Thumbnail Carousel */}
        {heroContent.carousel?.enabled && courseThumbnails.length > 0 && (
        <div className="relative w-full md:w-1/2">
          {/* Carousel Container */}
          <div
            className={`relative overflow-hidden rounded-2xl ${
              isLoaded ? "animate-fade-in-scale" : "animate-on-load"
            }`}
            style={{ animationDelay: "0.4s" }}
          >
            
            {/* Carousel Wrapper */}
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {courseThumbnails.map((course) => (
                <div
                  key={course.id}
                  className="relative min-w-full flex-shrink-0"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Course Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                        <span
                          className="text-xs font-semibold text-white"
                          style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                        >
                          {course.category}
                        </span>
                      </div>
                      <h3
                        className="text-lg font-bold text-white md:text-xl"
                        style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                      >
                        {course.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar Navigation */}
            <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
                {courseThumbnails.map((_, index) => (
                  <button
                    key={`${index}-${currentSlide}`}
                    onClick={() => setCurrentSlide(index)}
                    className="group relative flex cursor-pointer items-center"
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    <div className="h-1.5 w-8 rounded-full bg-gray-300 transition-all group-hover:bg-gray-400">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#A855F7] ${
                          currentSlide === index ? "animate-progress" : currentSlide > index ? "w-full" : "w-0"
                        }`}
                        style={{
                          width: currentSlide === index ? "100%" : currentSlide > index ? "100%" : "0%",
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dots Indicator */}
            {/* <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
              {courseThumbnails.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === index
                      ? "w-8 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div> */}
          </div>

          {/* Floating Card 1 - Students Count */}
          {heroContent.stats?.students?.enabled && (
            <div
              className={`absolute left-2 top-4 z-20 w-fit max-w-[calc(100%-1rem)] translate-x-0 rounded-xl bg-white p-3 shadow-xl transition-all hover:scale-105 md:left-0 md:top-8 md:max-w-none md:-translate-x-1/2 lg:left-8 lg:top-12 lg:p-4 ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{ animationDelay: "0.9s" }}
            >
              <p
                className="mb-2 text-xs font-semibold text-gray-800 md:text-sm lg:text-base"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                {heroContent.stats.students.count}
              </p>
              <div className="flex -space-x-2">
                {heroContent.stats.students.avatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white md:h-8 md:w-8"
                  >
                    <Image
                      src={avatar}
                      alt={`Student ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Floating Card 2 - Courses Count */}
          {heroContent.stats?.courses?.enabled && (
            <div
              className={`absolute bottom-4 right-2 z-20 flex max-w-[calc(100%-1rem)] translate-x-0 items-center gap-2 rounded-xl bg-white p-3 shadow-xl transition-all hover:scale-105 md:bottom-8 md:right-0 md:max-w-none md:translate-x-1/2 lg:bottom-12 lg:right-8 lg:gap-3 lg:p-4 ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{ animationDelay: "1.1s" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#7B2CBF] md:h-12 md:w-12">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="md:w-6 md:h-6"
                >
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                    stroke="#7B2CBF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                    stroke="#7B2CBF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                    stroke="#7B2CBF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                    stroke="#7B2CBF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                className="text-xs font-semibold text-gray-800 md:text-sm lg:text-base"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                {heroContent.stats.courses.count}
              </p>
            </div>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
