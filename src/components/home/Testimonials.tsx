"use client";

import Image from "next/image";
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { FaQuoteLeft } from "react-icons/fa";
import { cn } from "@/lib/cn";

import "swiper/css";

export type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  rating?: number;
};

type TestimonialsProps = {
  items?: TestimonialItem[];
};

function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function StarRating({ rating }: { rating: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="mb-4 flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "text-base leading-none",
            index < filled ? "text-primary" : "text-on-primary/25",
          )}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StudentAvatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
        <Image
          src={avatar}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary"
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}

export default function Testimonials({ items }: TestimonialsProps) {
  const testimonials: TestimonialItem[] = items ?? [];
  const swiperRef = useRef<SwiperType | null>(null);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-primary-container to-secondary-container px-8 py-24 text-on-primary">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-16 lg:grid-cols-12">
        <div className="lg:col-span-4 flex flex-col items-start justify-center">
          <span className="mb-4 block text-sm font-bold uppercase tracking-widest text-primary/70">
            Testimonials
          </span>
          <h2 className="mb-6 font-[family-name:var(--font-headline)] text-5xl font-extrabold text-primary tracking-tight">
            What Our Learners Are Saying
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-primary/60">
            Join a community of high-achievers who have transformed their
            careers through AdvanceLMS.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/70 transition-colors hover:bg-primary cursor-pointer"
              aria-label="Previous testimonial"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/70 transition-colors hover:bg-primary cursor-pointer"
              aria-label="Next testimonial"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Swiper
            modules={[A11y]}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            spaceBetween={32}
            loop={testimonials.length > 1}
            breakpoints={{
              0: { slidesPerView: 1 },
              1024: { slidesPerView: 2 },
            }}
          >
            {testimonials.map((t, i) => (
              <SwiperSlide key={`${t.name}-${i}`}>
                <div className="rounded-3xl border border-on-primary/20 bg-primary/20 p-8 backdrop-blur h-full">
                  <FaQuoteLeft className="mb-4 text-2xl text-primary" />
                  {typeof t.rating === "number" && t.rating > 0 ? (
                    <StarRating rating={t.rating} />
                  ) : null}  
                  <p className="mb-8 text-xl italic leading-relaxed">{t.quote}</p>
                  <div className="flex items-center gap-4">
                    <StudentAvatar name={t.name} avatar={t.avatar} />
                    <div>
                      <h5 className="font-bold">{t.name}</h5>
                      <p className="text-sm text-on-primary/70">{t.role}</p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
