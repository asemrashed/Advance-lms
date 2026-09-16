"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type AboutContent, defaultAboutContent } from "@/lib/websiteContentDefaults";
import { htmlToPlainText } from "@/lib/utils";

interface AboutProps {
  initialContent?: AboutContent;
}

export default function About({ initialContent }: AboutProps = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutContent>(initialContent || defaultAboutContent);

  useEffect(() => {
    // Only fetch if initialContent was not provided (fallback for client-side updates)
    if (!initialContent) {
      const fetchAboutContent = async () => {
        try {
          const response = await fetch('/api/website-content', {
            cache: 'force-cache',
            next: { tags: ['website-content'] },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.about) {
              setAboutContent(data.data.about);
            }
          }
        } catch (error) {
          console.error('Error fetching about content:', error);
        }
      };
      fetchAboutContent();
    }
  }, [initialContent]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsLoaded(Boolean(entry?.isIntersecting));
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-white py-20 px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left Side - Images */}
          <div className="relative w-full lg:w-1/2">
            {/* Main Image Cluster */}
            <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
              {/* Left Circle - Collaboration Scene */}
              <div
                className={`absolute left-0 top-8 z-10 aspect-square w-full max-w-[380px] overflow-hidden rounded-full shadow-2xl md:max-w-[420px] lg:max-w-[450px] ${
                  isLoaded ? "animate-fade-in-scale" : "animate-on-load"
                }`}
                style={{ animationDelay: "0.2s" }}
              >
                <Image
                  src={aboutContent.images.main}
                  alt="Team collaboration"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Right Circle - Young Woman */}
              <div
                className={`absolute bottom-0 right-0 z-20 aspect-square w-64 overflow-hidden rounded-full border-4 border-white shadow-2xl md:w-72 lg:w-80 ${
                  isLoaded ? "animate-fade-in-scale" : "animate-on-load"
                }`}
                style={{ animationDelay: "0.4s" }}
              >
                <Image
                  src={aboutContent.images.secondary}
                  alt="Student learning"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 200px, 300px"
                />
              </div>

              {/* Connecting Curve Line - connects bottom edges */}
              <svg
                className="absolute bottom-8 left-1/4 z-0 hidden h-32 w-2/3 text-purple-400 md:block lg:h-40"
                viewBox="0 0 200 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M20 80 Q60 60, 100 50 T180 80"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.7"
                />
              </svg>
            </div>

            {/* Experience Box - Oval shape in top right */}
            <div
              className={`absolute right-0 top-0 z-30 rounded-full px-6 py-4 shadow-xl md:px-8 md:py-5 lg:px-10 lg:py-6 ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: "0.6s",
                borderRadius: "9999px",
                aspectRatio: "2.5/1",
                background: `linear-gradient(to right, ${aboutContent.experience.gradientFrom}, ${aboutContent.experience.gradientTo})`,
              }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                  {aboutContent.experience.number}
                </div>
                <div
                  className="mt-1 text-xs font-semibold text-white md:text-sm lg:text-base"
                  style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                >
                  {aboutContent.experience.label}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="w-full lg:w-1/2">
            {/* About Us Label */}
            <div
              className={`mb-4 inline-flex items-center gap-3 rounded-full px-5 py-2.5 ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: "0.1s",
                fontFamily: "var(--font-bengali), sans-serif",
                backgroundColor: aboutContent.label.backgroundColor,
              }}
            >
              {/* White circular icon with lightbulb */}
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#A855F7]"
                >
                  {/* Lightbulb */}
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z"
                    fill="currentColor"
                  />
                  <path
                    d="M9 21H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Radiating lines */}
                  <path
                    d="M3 5L5 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M21 5L19 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3 13L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M21 13L19 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-white">{aboutContent.label.text}</span>
            </div>

            {/* Main Heading */}
            <h2
              className={`mb-6 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: "0.3s",
                fontFamily: "var(--font-bengali), sans-serif",
              }}
            >
              <span style={{ color: aboutContent.titleColors.part1 }}>{aboutContent.title.part1}</span>{" "}
              <span style={{ color: aboutContent.titleColors.part2 }}>{aboutContent.title.part2}</span>{" "}
              <span style={{ color: aboutContent.titleColors.part3 }}>{aboutContent.title.part3}</span>{" "}
              <span style={{ color: aboutContent.titleColors.part4 }}>{aboutContent.title.part4}</span>{" "}
              <span style={{ color: aboutContent.titleColors.part5 }}>{aboutContent.title.part5}</span>
            </h2>

            {/* Paragraph */}
            <p
              className={`mb-8 text-base leading-relaxed text-gray-600 md:text-lg ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: "0.5s",
                fontFamily: "var(--font-bengali), sans-serif",
              }}
            >
              {htmlToPlainText(aboutContent.description)}
            </p>

            {/* Feature Cards */}
            <div
              className={`mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{ animationDelay: "0.7s" }}
            >
              {aboutContent.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#7B2CBF]"
                    >
                      {/* Screen/Monitor */}
                      <rect
                        x="4"
                        y="3"
                        width="12"
                        height="9"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      {/* Play button inside screen */}
                      <path
                        d="M8 6L11 7.5L8 9V6Z"
                        fill="currentColor"
                      />
                      {/* Person */}
                      <circle cx="18" cy="7" r="2" fill="currentColor" />
                      <path
                        d="M18 9V11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Book */}
                      <path
                        d="M5 14L7 15L9 14V18H5V14Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 15V18"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3
                      className="mb-2 text-lg font-bold text-gray-800"
                      style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="text-sm text-gray-600"
                      style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                    >
                      {htmlToPlainText(feature.description)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Discover More Button */}
            <div
              className={isLoaded ? "animate-fade-in-up" : "animate-on-load"}
              style={{ animationDelay: "0.9s" }}
            >
              <a
                href={aboutContent.button.href || "#"}
                className="group/btn relative inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition-all duration-300 overflow-hidden md:px-8 md:py-3.5"
                style={{
                  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                  fontFamily: "var(--font-bengali), sans-serif",
                }}
              >
                {/* Shine effect */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
                
                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  <span>{aboutContent.button.text}</span>
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
